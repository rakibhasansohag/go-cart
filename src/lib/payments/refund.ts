import { createHash } from 'crypto';
import { PaymentMethod, Prisma, RefundTransactionStatus, ReturnRequestStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { getStripeClient } from '@/lib/payments/stripe-client';
import { paypalRequest } from '@/lib/payments/paypal-client';
import { DOMAIN_EVENT_TYPES, publishDomainEvent } from '@/lib/notifications/domain-events';
import { scheduleEmailOutboxDispatch } from '@/lib/email/schedule';
import { recordRefundForReturnRequest } from '@/lib/settlement/service';

const REFUND_TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 30_000 } as const;

function paypalRequestId(value: string) {
	return `refund-${createHash('sha256').update(value).digest('hex').slice(0, 28)}`;
}

/**
 * Issue a provider refund after the caller has established an administrator
 * identity. Keeping auth outside this core mutation lets isolated integration
 * checks exercise the same refund transaction without faking Clerk sessions.
 */
export async function issueReturnRefundForAdmin(
	returnRequestId: string,
	adminUserId: string,
) {
	const admin = await db.user.findUnique({ where: { id: adminUserId }, select: { role: true } });
	if (admin?.role !== 'ADMIN') throw new Error('Only admins can issue refunds.');

	const request = await db.returnRequest.findUnique({
		where: { id: returnRequestId },
		include: { paymentDetails: true, transactions: { orderBy: { createdAt: 'desc' } } },
	});
	if (!request) throw new Error('Return request not found.');
	if (request.status !== ReturnRequestStatus.REFUND_PENDING) throw new Error('Only refund-pending requests can be refunded.');
	if (request.resolution !== 'REFUND') throw new Error('This return request is not configured for a refund.');
	if (!request.paymentDetails || !['Stripe', 'Paypal'].includes(request.paymentDetails.paymentMethod)) throw new Error('A Stripe or PayPal payment is required for automatic refunds.');
	if (request.paymentDetails.paymentMethod === 'Paypal' && !request.paymentDetails.providerCaptureId) throw new Error('The PayPal capture reference is missing.');

	const amount = Math.round((request.approvedAmount ?? request.requestedAmount) * 100);
	if (!Number.isInteger(amount) || amount <= 0) throw new Error('The approved refund amount is invalid.');

	const idempotencyKey = `return-refund:${request.id}`;
	const existing = request.transactions.find((transaction) => transaction.idempotencyKey === idempotencyKey);
	if (existing?.status === RefundTransactionStatus.SUCCEEDED) return existing;

	const provider = request.paymentDetails.paymentMethod === 'Stripe' ? PaymentMethod.Stripe : PaymentMethod.Paypal;
	const transaction = existing ?? await db.refundTransaction.create({
		data: {
			provider,
			idempotencyKey,
			status: RefundTransactionStatus.PROCESSING,
			amount: amount / 100,
			currency: request.currency,
			returnRequestId: request.id,
			paymentDetailsId: request.paymentDetails.id,
		},
	});

	try {
		const refund = provider === PaymentMethod.Stripe
			? await getStripeClient().refunds.create(
				{
					payment_intent: request.paymentDetails.paymentInetntId,
					amount,
					reason: 'requested_by_customer',
					metadata: { returnRequestId: request.id, orderId: request.orderId },
				},
				{ idempotencyKey },
			)
			: await paypalRequest<{
				id: string;
				status?: string;
				amount?: { value?: string; currency_code?: string };
			}>('/v2/payments/captures/' + request.paymentDetails.providerCaptureId + '/refund', {
				method: 'POST',
				headers: { 'PayPal-Request-Id': paypalRequestId(idempotencyKey) },
				body: JSON.stringify({ amount: { value: (amount / 100).toFixed(2), currency_code: request.currency.toUpperCase() } }),
			});
		const providerStatus = refund.status?.toLowerCase() ?? 'succeeded';
		const succeeded = providerStatus === 'succeeded' || providerStatus === 'completed';
		const failed = ['failed', 'canceled', 'cancelled', 'denied'].includes(providerStatus);
		const providerRefundId = refund.id;
		const updated = await db.$transaction(async (tx) => {
			await tx.refundTransaction.update({
				where: { id: transaction.id },
				data: {
					providerRefundId,
					status: succeeded ? RefundTransactionStatus.SUCCEEDED : failed ? RefundTransactionStatus.FAILED : RefundTransactionStatus.PROCESSING,
					providerResponse: refund as unknown as Prisma.InputJsonValue,
					failureReason: failed ? `${provider} refund ended with status ${refund.status ?? 'failed'}.` : null,
					processedAt: succeeded || failed ? new Date() : null,
				},
			});
			if (!succeeded) return { request: null, eventId: null };
			const event = await publishDomainEvent(tx, {
				eventKey: `return.refunded:${provider}:${providerRefundId}`,
				eventType: DOMAIN_EVENT_TYPES.REFUND_ISSUED,
				aggregateType: 'RETURN_REQUEST',
				aggregateId: request.id,
				actorUserId: adminUserId,
				orderId: request.orderId,
				storeId: request.storeId,
				payload: {
					returnRequestId: request.id,
					orderId: request.orderId,
					orderGroupId: request.orderGroupId,
					storeUrl: '',
					nextStatus: 'Refunded',
					requestedAmount: request.requestedAmount,
					approvedAmount: amount / 100,
					currency: request.currency,
					message: 'Your refund was issued successfully.',
					amount: amount / 100,
				},
			});
			const updatedRequest = await tx.returnRequest.update({ where: { id: request.id, status: ReturnRequestStatus.REFUND_PENDING }, data: { status: ReturnRequestStatus.REFUNDED, resolvedAt: new Date() } });
			return { request: updatedRequest, eventId: event.id };
		}, REFUND_TRANSACTION_OPTIONS);
		if (updated.eventId) scheduleEmailOutboxDispatch([updated.eventId]);
		if (succeeded) await recordRefundForReturnRequest(request.id, amount);
		return db.refundTransaction.findUniqueOrThrow({ where: { id: transaction.id } });
	} catch (error) {
		await db.refundTransaction.update({
			where: { id: transaction.id },
			data: { status: RefundTransactionStatus.FAILED, failureReason: error instanceof Error ? error.message : 'Payment provider refund failed.', processedAt: new Date() },
		});
		throw error;
	}
}

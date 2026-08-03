'use server';

import { auth } from '@clerk/nextjs/server';
import { Prisma, RefundTransactionStatus, ReturnRequestStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { getStripeClient } from '@/lib/payments/stripe-client';
import { publishDomainEvent } from '@/lib/notifications/domain-events';
import { scheduleEmailOutboxDispatch } from '@/lib/email/schedule';

const REFUND_TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 30_000 } as const;

export async function issueReturnRefund(returnRequestId: string) {
	const { userId } = await auth();
	if (!userId) throw new Error('Please sign in to issue a refund.');

	const admin = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
	if (admin?.role !== 'ADMIN') throw new Error('Only admins can issue refunds.');

	const request = await db.returnRequest.findUnique({
		where: { id: returnRequestId },
		include: { paymentDetails: true, transactions: { orderBy: { createdAt: 'desc' } } },
	});
	if (!request) throw new Error('Return request not found.');
	if (request.status !== ReturnRequestStatus.REFUND_PENDING) throw new Error('Only refund-pending requests can be refunded.');
	if (request.resolution !== 'REFUND') throw new Error('This return request is not configured for a refund.');
	if (!request.paymentDetails || request.paymentDetails.paymentMethod !== 'Stripe') throw new Error('A Stripe payment is required for automatic refunds.');

	const amount = Math.round((request.approvedAmount ?? request.requestedAmount) * 100);
	if (!Number.isInteger(amount) || amount <= 0) throw new Error('The approved refund amount is invalid.');

	const idempotencyKey = `return-refund:${request.id}`;
	const existing = request.transactions.find((transaction) => transaction.idempotencyKey === idempotencyKey);
	if (existing?.status === RefundTransactionStatus.SUCCEEDED) return existing;

	const transaction = existing ?? await db.refundTransaction.create({
		data: {
			provider: 'Stripe',
			idempotencyKey,
			status: RefundTransactionStatus.PROCESSING,
			amount: amount / 100,
			currency: request.currency,
			returnRequestId: request.id,
			paymentDetailsId: request.paymentDetails.id,
		},
	});

	try {
		const stripe = getStripeClient();
		const refund = await stripe.refunds.create(
			{
				payment_intent: request.paymentDetails.paymentInetntId,
				amount,
				reason: 'requested_by_customer',
				metadata: { returnRequestId: request.id, orderId: request.orderId },
			},
			{ idempotencyKey },
		);
		const succeeded = refund.status === 'succeeded';
		const updated = await db.$transaction(async (tx) => {
			await tx.refundTransaction.update({
				where: { id: transaction.id },
				data: {
					providerRefundId: refund.id,
					status: succeeded ? RefundTransactionStatus.SUCCEEDED : RefundTransactionStatus.PROCESSING,
					providerResponse: refund as unknown as Prisma.InputJsonValue,
					processedAt: succeeded ? new Date() : null,
				},
			});
			if (!succeeded) return { request: null, eventId: null };
			const event = await publishDomainEvent(tx, {
				eventKey: `return.refunded:${refund.id}`,
				eventType: 'return.status_changed',
				aggregateType: 'RETURN_REQUEST',
				aggregateId: request.id,
				actorUserId: userId,
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
				},
			});
			const updatedRequest = await tx.returnRequest.update({ where: { id: request.id, status: ReturnRequestStatus.REFUND_PENDING }, data: { status: ReturnRequestStatus.REFUNDED, resolvedAt: new Date() } });
			return { request: updatedRequest, eventId: event.id };
		}, REFUND_TRANSACTION_OPTIONS);
		if (updated.eventId) scheduleEmailOutboxDispatch([updated.eventId]);
		return transaction;
	} catch (error) {
		await db.refundTransaction.update({
			where: { id: transaction.id },
			data: { status: RefundTransactionStatus.FAILED, failureReason: error instanceof Error ? error.message : 'Stripe refund failed.', processedAt: new Date() },
		});
		throw error;
	}
}

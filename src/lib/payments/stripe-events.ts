import { db } from '@/lib/db';
import { reconcilePaymentEvent } from './reconcile';
import { RefundTransactionStatus, ReturnRequestStatus } from '@prisma/client';
import { DOMAIN_EVENT_TYPES, publishDomainEvent } from '@/lib/notifications/domain-events';
import { scheduleEmailOutboxDispatch } from '@/lib/email/schedule';
import type { PaymentStatus } from '@prisma/client';
import type Stripe from 'stripe';

async function findOrderId(
	providerPaymentId: string,
	metadataOrderId?: string,
) {
	if (metadataOrderId) {
		const order = await db.order.findUnique({
			where: { id: metadataOrderId },
			select: { id: true },
		});
		if (order) return order.id;
	}

	const payment = await db.paymentDetails.findFirst({
		where: { paymentInetntId: providerPaymentId, paymentMethod: 'Stripe' },
		select: { orderId: true },
	});
	return payment?.orderId ?? null;
}

function intentPaymentStatus(
	eventType: string,
): PaymentStatus | null {
	switch (eventType) {
		case 'payment_intent.succeeded':
			return 'Paid';
		case 'payment_intent.payment_failed':
			return 'Failed';
		case 'payment_intent.canceled':
			return 'Cancelled';
		default:
			return null;
	}
}

export async function handleStripeEvent(event: Stripe.Event) {
	if (event.type.startsWith('payment_intent.')) {
		const paymentStatus = intentPaymentStatus(event.type);
		if (!paymentStatus) return { ignored: true };

		const intent = event.data.object as Stripe.PaymentIntent;
		const orderId = await findOrderId(intent.id, intent.metadata.orderId);
		if (!orderId) return { ignored: true };

		return reconcilePaymentEvent({
			orderId,
			provider: 'Stripe',
			providerEventId: event.id,
			providerPaymentId: intent.id,
			eventType: event.type,
			providerStatus: intent.status,
			paymentStatus,
			amount: intent.amount / 100,
			currency: intent.currency,
			verifyOrderAmount: paymentStatus === 'Paid',
		});
	}

	if (event.type === 'charge.refunded') {
		const charge = event.data.object as Stripe.Charge;
		const paymentIntentId =
			typeof charge.payment_intent === 'string'
				? charge.payment_intent
				: charge.payment_intent?.id;

		if (!paymentIntentId) return { ignored: true };
		const orderId = await findOrderId(
			paymentIntentId,
			charge.metadata.orderId,
		);
		if (!orderId) return { ignored: true };

		const fullyRefunded = charge.amount_refunded >= charge.amount;
		const paymentResult = await reconcilePaymentEvent({
			orderId,
			provider: 'Stripe',
			providerEventId: event.id,
			providerPaymentId: paymentIntentId,
			eventType: event.type,
			providerStatus: charge.status ?? 'refunded',
			paymentStatus: fullyRefunded ? 'Refunded' : 'PartiallyRefunded',
			amount: charge.amount_refunded / 100,
			currency: charge.currency,
			metadata: { fullyRefunded },
		});

		const payment = await db.paymentDetails.findUnique({
			where: { paymentInetntId: paymentIntentId },
			select: { id: true },
		});
		if (!payment) return paymentResult;

		const pendingRefund = await db.refundTransaction.findFirst({
			where: {
				paymentDetailsId: payment.id,
				status: { in: [RefundTransactionStatus.PENDING, RefundTransactionStatus.PROCESSING] },
			},
			orderBy: { createdAt: 'asc' },
			select: { id: true, returnRequestId: true },
		});
		if (!pendingRefund) return paymentResult;

		const result = await db.$transaction(async (tx) => {
			await tx.refundTransaction.update({
				where: { id: pendingRefund.id },
				data: {
					status: RefundTransactionStatus.SUCCEEDED,
					providerResponse: event.data.object as unknown as object,
					processedAt: new Date(),
				},
			});
			const request = await tx.returnRequest.findUnique({
				where: { id: pendingRefund.returnRequestId },
				include: { store: { select: { url: true } } },
			});
			if (!request || request.status === ReturnRequestStatus.REFUNDED) {
				return { sourceEventId: null };
			}
			const domainEvent = await publishDomainEvent(tx, {
				eventKey: `return.refunded:${event.id}`,
				eventType: DOMAIN_EVENT_TYPES.REFUND_ISSUED,
				aggregateType: 'RETURN_REQUEST',
				aggregateId: request.id,
				orderId: request.orderId,
				storeId: request.storeId,
				payload: {
					returnRequestId: request.id,
					orderId: request.orderId,
					orderGroupId: request.orderGroupId,
					storeUrl: request.store.url,
					nextStatus: 'Refunded',
					requestedAmount: request.requestedAmount,
					approvedAmount: request.approvedAmount ?? request.requestedAmount,
					amount: Number(request.approvedAmount ?? request.requestedAmount),
					currency: request.currency,
					message: 'Your refund was confirmed by Stripe.',
				},
			});
			await tx.returnRequest.updateMany({
				where: { id: request.id, status: { not: ReturnRequestStatus.REFUNDED } },
				data: { status: ReturnRequestStatus.REFUNDED, resolvedAt: new Date() },
			});
			return { sourceEventId: domainEvent.id };
		}, { maxWait: 10_000, timeout: 30_000 });
		if (result.sourceEventId) scheduleEmailOutboxDispatch([result.sourceEventId]);
		return paymentResult;
	}

	return { ignored: true };
}

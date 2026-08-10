import { db } from '@/lib/db';
import { paypalRequest } from './paypal-client';
import { reconcilePaymentEvent } from './reconcile';
import { DOMAIN_EVENT_TYPES, publishDomainEvent } from '@/lib/notifications/domain-events';
import { scheduleEmailOutboxDispatch } from '@/lib/email/schedule';
import { RefundTransactionStatus, ReturnRequestStatus } from '@prisma/client';
import type { PaymentStatus } from '@prisma/client';

type PayPalWebhookEvent = {
	id: string;
	event_type: string;
	resource?: {
		id?: string;
		status?: string;
		amount?: { value?: string; currency_code?: string };
		supplementary_data?: {
			related_ids?: {
				order_id?: string;
				capture_id?: string;
			};
		};
	};
};

function mapPayPalStatus(eventType: string): PaymentStatus | null {
	switch (eventType) {
		case 'PAYMENT.CAPTURE.COMPLETED':
			return 'Paid';
		case 'PAYMENT.CAPTURE.PENDING':
			return 'Pending';
		case 'PAYMENT.CAPTURE.DENIED':
			return 'Declined';
		case 'PAYMENT.CAPTURE.REFUNDED':
			return 'Refunded';
		case 'PAYMENT.CAPTURE.REVERSED':
			return 'Chargeback';
		default:
			return null;
	}
}

export async function verifyPayPalWebhook(
	headers: Headers,
	event: PayPalWebhookEvent,
) {
	const webhookId = process.env.PAYPAL_WEBHOOK_ID;
	if (!webhookId) {
		throw new Error('PAYPAL_WEBHOOK_ID is not configured.');
	}

	const verification = await paypalRequest<{
		verification_status?: string;
	}>('/v1/notifications/verify-webhook-signature', {
		method: 'POST',
		body: JSON.stringify({
			auth_algo: headers.get('paypal-auth-algo'),
			cert_url: headers.get('paypal-cert-url'),
			transmission_id: headers.get('paypal-transmission-id'),
			transmission_sig: headers.get('paypal-transmission-sig'),
			transmission_time: headers.get('paypal-transmission-time'),
			webhook_id: webhookId,
			webhook_event: event,
		}),
	});

	if (verification.verification_status !== 'SUCCESS') {
		throw new Error('PayPal webhook signature verification failed.');
	}
}

export async function handlePayPalEvent(event: PayPalWebhookEvent) {
	const paymentStatus = mapPayPalStatus(event.event_type);
	if (!paymentStatus || !event.resource) return { ignored: true };

	const relatedIds = event.resource.supplementary_data?.related_ids;
	const providerOrderId = relatedIds?.order_id;
	const providerCaptureId =
		relatedIds?.capture_id ||
		(event.event_type === 'PAYMENT.CAPTURE.COMPLETED'
			? event.resource.id
			: undefined);

	const payment = await db.paymentDetails.findFirst({
		where: {
			paymentMethod: 'Paypal',
			OR: [
				...(providerOrderId
					? [{ paymentInetntId: providerOrderId }]
					: []),
				...(providerCaptureId
					? [{ providerCaptureId }]
					: []),
			],
		},
	select: {
			id: true,
			orderId: true,
			paymentInetntId: true,
			providerCaptureId: true,
		},
	});

	if (!payment) return { ignored: true };

	const amountValue = event.resource.amount?.value;
	const amount = amountValue ? Number(amountValue) : null;
	const currency = event.resource.amount?.currency_code ?? null;

	const paymentResult = await reconcilePaymentEvent({
		orderId: payment.orderId,
		provider: 'Paypal',
		providerEventId: event.id,
		providerPaymentId: payment.paymentInetntId,
		providerCaptureId:
			payment.providerCaptureId ?? providerCaptureId ?? null,
		eventType: event.event_type,
		providerStatus: event.resource.status ?? event.event_type,
		paymentStatus,
		amount: Number.isFinite(amount) ? amount : null,
		currency,
		verifyOrderAmount: paymentStatus === 'Paid',
	});

	if (event.event_type === 'PAYMENT.CAPTURE.REFUNDED') {
		const pendingRefund = await db.refundTransaction.findFirst({
			where: {
				paymentDetailsId: payment.id,
				status: { in: [RefundTransactionStatus.PENDING, RefundTransactionStatus.PROCESSING] },
			},
			orderBy: { createdAt: 'asc' },
		});
		if (pendingRefund) {
			const result = await db.$transaction(async (tx) => {
				await tx.refundTransaction.update({
					where: { id: pendingRefund.id },
					data: { status: RefundTransactionStatus.SUCCEEDED, providerResponse: event.resource as object, processedAt: new Date() },
				});
				const request = await tx.returnRequest.findUnique({ where: { id: pendingRefund.returnRequestId }, include: { store: { select: { url: true } } } });
				if (!request || request.status === ReturnRequestStatus.REFUNDED) return { sourceEventId: null };
				const domainEvent = await publishDomainEvent(tx, {
					eventKey: `return.refunded:Paypal:${event.id}`,
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
						message: 'Your refund was confirmed by PayPal.',
					},
				});
				await tx.returnRequest.updateMany({ where: { id: request.id, status: { not: ReturnRequestStatus.REFUNDED } }, data: { status: ReturnRequestStatus.REFUNDED, resolvedAt: new Date() } });
				return { sourceEventId: domainEvent.id };
			}, { maxWait: 10_000, timeout: 30_000 });
			if (result.sourceEventId) scheduleEmailOutboxDispatch([result.sourceEventId]);
		}
	}

	return paymentResult;
}

export type { PayPalWebhookEvent };

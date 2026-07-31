import { db } from '@/lib/db';
import { paypalRequest } from './paypal-client';
import { reconcilePaymentEvent } from './reconcile';
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
			orderId: true,
			paymentInetntId: true,
			providerCaptureId: true,
		},
	});

	if (!payment) return { ignored: true };

	const amountValue = event.resource.amount?.value;
	const amount = amountValue ? Number(amountValue) : null;
	const currency = event.resource.amount?.currency_code ?? null;

	return reconcilePaymentEvent({
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
}

export type { PayPalWebhookEvent };


import { db } from '@/lib/db';
import { reconcilePaymentEvent } from './reconcile';
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
		return reconcilePaymentEvent({
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
	}

	return { ignored: true };
}


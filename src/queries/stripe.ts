'use server';

import { assertPaymentAmount, requireOwnedOrder } from '@/lib/payments/security';
import { reconcilePaymentEvent } from '@/lib/payments/reconcile';
import { getStripeClient } from '@/lib/payments/stripe-client';
import type { PaymentStatus } from '@prisma/client';
import type Stripe from 'stripe';

function paymentStatusFromIntent(
	status: Stripe.PaymentIntent.Status,
): PaymentStatus {
	switch (status) {
		case 'succeeded':
			return 'Paid';
		case 'canceled':
			return 'Cancelled';
		case 'requires_payment_method':
			return 'Failed';
		default:
			return 'Pending';
	}
}

function assertIntentMatchesOrder(
	order: Awaited<ReturnType<typeof requireOwnedOrder>>,
	intent: Stripe.PaymentIntent,
) {
	if (intent.metadata.orderId !== order.id) {
		throw new Error('Stripe payment does not belong to this order.');
	}

	assertPaymentAmount(order.total, intent.amount / 100, intent.currency);
}

export async function createStripePaymentIntent(orderId: string) {
	const order = await requireOwnedOrder(orderId, { requirePayable: true });
	const stripe = getStripeClient();

	if (
		order.paymentDetails?.paymentMethod === 'Stripe' &&
		order.paymentDetails.paymentInetntId.startsWith('pi_')
	) {
		const existingIntent = await stripe.paymentIntents.retrieve(
			order.paymentDetails.paymentInetntId,
		);

		if (
			existingIntent.status !== 'canceled' &&
			existingIntent.client_secret
		) {
			assertIntentMatchesOrder(order, existingIntent);
			return {
				paymentIntentId: existingIntent.id,
				clientSecret: existingIntent.client_secret,
			};
		}
	}

	const idempotencyKey = `stripe-intent:${order.id}:${order.updatedAt.getTime()}`;
	const paymentIntent = await stripe.paymentIntents.create(
		{
			amount: Math.round(order.total * 100),
			currency: 'usd',
			automatic_payment_methods: { enabled: true },
			metadata: { orderId: order.id },
		},
		{ idempotencyKey },
	);

	await reconcilePaymentEvent({
		orderId: order.id,
		provider: 'Stripe',
		providerEventId: `stripe:intent-created:${paymentIntent.id}`,
		providerPaymentId: paymentIntent.id,
		eventType: 'payment_intent.created',
		providerStatus: paymentIntent.status,
		paymentStatus: 'Pending',
		amount: paymentIntent.amount / 100,
		currency: paymentIntent.currency,
		verifyOrderAmount: true,
	});

	return {
		paymentIntentId: paymentIntent.id,
		clientSecret: paymentIntent.client_secret,
	};
}

export async function verifyStripePayment(orderId: string) {
	const order = await requireOwnedOrder(orderId);

	if (
		!order.paymentDetails ||
		order.paymentDetails.paymentMethod !== 'Stripe'
	) {
		throw new Error('Stripe payment has not been initialized for this order.');
	}

	const stripe = getStripeClient();
	const paymentIntent = await stripe.paymentIntents.retrieve(
		order.paymentDetails.paymentInetntId,
	);
	assertIntentMatchesOrder(order, paymentIntent);

	const paymentStatus = paymentStatusFromIntent(paymentIntent.status);
	const result = await reconcilePaymentEvent({
		orderId: order.id,
		provider: 'Stripe',
		providerEventId: `stripe:verified:${paymentIntent.id}:${paymentIntent.status}`,
		providerPaymentId: paymentIntent.id,
		eventType: 'payment_intent.server_verified',
		providerStatus: paymentIntent.status,
		paymentStatus,
		amount: paymentIntent.amount / 100,
		currency: paymentIntent.currency,
		verifyOrderAmount: paymentStatus === 'Paid',
	});

	if (paymentStatus !== 'Paid') {
		throw new Error(
			paymentStatus === 'Pending'
				? 'Your payment is still processing. We will update this order automatically.'
				: 'Stripe could not confirm this payment. Please try another payment method.',
		);
	}

	return result.order;
}

/**
 * Backward-compatible server action name. The browser no longer supplies a
 * PaymentIntent or user ID; Stripe is queried and verified on the server.
 */
export async function createStripePayment(orderId: string) {
	return verifyStripePayment(orderId);
}

'use server';

import { createHash } from 'crypto';
import { assertPaymentAmount, requireOwnedOrder } from '@/lib/payments/security';
import { paypalRequest } from '@/lib/payments/paypal-client';
import { reconcilePaymentEvent } from '@/lib/payments/reconcile';
import type { PaymentStatus } from '@prisma/client';

type PayPalAmount = {
	currency_code: string;
	value: string;
};

type PayPalCapture = {
	id: string;
	status: string;
	amount: PayPalAmount;
};

type PayPalOrder = {
	id: string;
	status: string;
	purchase_units: Array<{
		custom_id?: string;
		invoice_id?: string;
		amount: PayPalAmount;
		payments?: { captures?: PayPalCapture[] };
	}>;
};

function requestId(prefix: string, value: string) {
	const digest = createHash('sha256').update(value).digest('hex').slice(0, 28);
	return `${prefix}-${digest}`;
}

function getPurchaseUnit(order: PayPalOrder) {
	const purchaseUnit = order.purchase_units?.[0];
	if (!purchaseUnit) {
		throw new Error('PayPal returned an incomplete order.');
	}
	return purchaseUnit;
}

function assertPayPalOrderMatches(
	localOrder: Awaited<ReturnType<typeof requireOwnedOrder>>,
	paypalOrder: PayPalOrder,
) {
	const purchaseUnit = getPurchaseUnit(paypalOrder);

	if (
		purchaseUnit.custom_id !== localOrder.id ||
		purchaseUnit.invoice_id !== localOrder.id
	) {
		throw new Error('PayPal payment does not belong to this order.');
	}

	assertPaymentAmount(
		localOrder.total,
		Number(purchaseUnit.amount.value),
		purchaseUnit.amount.currency_code,
	);
}

function paymentStatusFromCapture(status: string): PaymentStatus {
	switch (status) {
		case 'COMPLETED':
			return 'Paid';
		case 'DENIED':
			return 'Declined';
		case 'VOIDED':
			return 'Cancelled';
		default:
			return 'Pending';
	}
}

export async function createPayPalPayment(orderId: string) {
	const order = await requireOwnedOrder(orderId, { requirePayable: true });

	if (
		order.paymentDetails?.paymentMethod === 'Paypal' &&
		order.paymentDetails.paymentInetntId
	) {
		const existingOrder = await paypalRequest<PayPalOrder>(
			`/v2/checkout/orders/${order.paymentDetails.paymentInetntId}`,
		);

		if (['CREATED', 'SAVED', 'APPROVED'].includes(existingOrder.status)) {
			assertPayPalOrderMatches(order, existingOrder);
			return { id: existingOrder.id, status: existingOrder.status };
		}
	}

	const paypalOrder = await paypalRequest<PayPalOrder>(
		'/v2/checkout/orders',
		{
			method: 'POST',
			headers: {
				'PayPal-Request-Id': requestId(
					'create',
					`${order.id}:${order.updatedAt.toISOString()}`,
				),
			},
			body: JSON.stringify({
				intent: 'CAPTURE',
				purchase_units: [
					{
						custom_id: order.id,
						invoice_id: order.id,
						amount: {
							currency_code: 'USD',
							value: order.total.toFixed(2),
						},
					},
				],
			}),
		},
	);

	assertPayPalOrderMatches(order, paypalOrder);
	await reconcilePaymentEvent({
		orderId: order.id,
		provider: 'Paypal',
		providerEventId: `paypal:order-created:${paypalOrder.id}`,
		providerPaymentId: paypalOrder.id,
		eventType: 'CHECKOUT.ORDER.CREATED',
		providerStatus: paypalOrder.status,
		paymentStatus: 'Pending',
		amount: order.total,
		currency: 'USD',
		verifyOrderAmount: true,
	});

	return { id: paypalOrder.id, status: paypalOrder.status };
}

export async function capturePayPalPayment(
	orderId: string,
	paymentId: string,
) {
	const order = await requireOwnedOrder(orderId, { requirePayable: true });

	if (
		!order.paymentDetails ||
		order.paymentDetails.paymentMethod !== 'Paypal' ||
		order.paymentDetails.paymentInetntId !== paymentId
	) {
		throw new Error('PayPal payment does not match this order.');
	}

	const providerOrder = await paypalRequest<PayPalOrder>(
		`/v2/checkout/orders/${paymentId}`,
	);
	assertPayPalOrderMatches(order, providerOrder);

	const capturedOrder = await paypalRequest<PayPalOrder>(
		`/v2/checkout/orders/${paymentId}/capture`,
		{
			method: 'POST',
			headers: {
				'PayPal-Request-Id': requestId('capture', paymentId),
			},
			body: '{}',
		},
	);

	assertPayPalOrderMatches(order, capturedOrder);
	const capture = getPurchaseUnit(capturedOrder).payments?.captures?.[0];

	if (!capture) {
		throw new Error('PayPal did not return a payment capture.');
	}

	assertPaymentAmount(
		order.total,
		Number(capture.amount.value),
		capture.amount.currency_code,
	);

	const paymentStatus = paymentStatusFromCapture(capture.status);
	const result = await reconcilePaymentEvent({
		orderId: order.id,
		provider: 'Paypal',
		providerEventId: `paypal:verified:${capture.id}:${capture.status}`,
		providerPaymentId: paymentId,
		providerCaptureId: capture.id,
		eventType: 'PAYMENT.CAPTURE.SERVER_VERIFIED',
		providerStatus: capture.status,
		paymentStatus,
		amount: Number(capture.amount.value),
		currency: capture.amount.currency_code,
		verifyOrderAmount: paymentStatus === 'Paid',
	});

	if (paymentStatus !== 'Paid') {
		throw new Error(
			paymentStatus === 'Pending'
				? 'Your PayPal payment is still processing. We will update this order automatically.'
				: 'PayPal could not complete this payment. Please try again.',
		);
	}

	return result.order;
}

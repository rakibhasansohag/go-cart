import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import type { Order, PaymentDetails, PaymentStatus } from '@prisma/client';

const PAYABLE_STATUSES: PaymentStatus[] = [
	'Pending',
	'Failed',
	'Declined',
	'Cancelled',
];

export const PAYMENT_CURRENCY = 'USD';

export type PayableOrder = Order & {
	paymentDetails: PaymentDetails | null;
};

export async function requireOwnedOrder(
	orderId: string,
	options: { requirePayable?: boolean } = {},
): Promise<PayableOrder> {
	const { userId } = await auth();

	if (!userId) {
		throw new Error('Please sign in to continue with payment.');
	}

	const order = await db.order.findFirst({
		where: { id: orderId, userId },
		include: { paymentDetails: true },
	});

	if (!order) {
		throw new Error('Order not found or you do not have access to it.');
	}

	if (options.requirePayable && !PAYABLE_STATUSES.includes(order.paymentStatus)) {
		throw new Error(
			order.paymentStatus === 'Paid'
				? 'This order is already paid.'
				: 'This order is not currently eligible for payment.',
		);
	}

	if (!Number.isFinite(order.total) || order.total <= 0) {
		throw new Error('This order has an invalid payable total.');
	}

	return order;
}

export function assertPaymentAmount(
	orderTotal: number,
	providerAmount: number,
	currency: string,
) {
	const normalizedCurrency = currency.toUpperCase();
	const expectedMinorUnits = Math.round(orderTotal * 100);
	const receivedMinorUnits = Math.round(providerAmount * 100);

	if (normalizedCurrency !== PAYMENT_CURRENCY) {
		throw new Error(
			`Payment currency mismatch. Expected ${PAYMENT_CURRENCY}.`,
		);
	}

	if (expectedMinorUnits !== receivedMinorUnits) {
		throw new Error('Payment amount does not match the order total.');
	}
}


import type { PaymentStatus } from '@prisma/client';

const FINAL_PAYMENT_STATUSES: PaymentStatus[] = ['Refunded', 'Chargeback'];

export function resolvePaymentStatus(
	current: PaymentStatus,
	incoming: PaymentStatus,
): PaymentStatus {
	if (FINAL_PAYMENT_STATUSES.includes(current)) {
		return current;
	}

	if (current === 'PartiallyRefunded') {
		return incoming === 'Refunded' || incoming === 'Chargeback'
			? incoming
			: current;
	}

	if (
		current === 'Paid' &&
		['Pending', 'Failed', 'Declined', 'Cancelled'].includes(incoming)
	) {
		return current;
	}

	return incoming;
}


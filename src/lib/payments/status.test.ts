import { describe, expect, it } from 'vitest';
import { resolvePaymentStatus } from './status';

describe('payment status reconciliation', () => {
	it('allows a verified payment to recover from a failed attempt', () => {
		expect(resolvePaymentStatus('Failed', 'Paid')).toBe('Paid');
	});

	it('does not let a delayed failure regress a paid order', () => {
		expect(resolvePaymentStatus('Paid', 'Failed')).toBe('Paid');
		expect(resolvePaymentStatus('Paid', 'Cancelled')).toBe('Paid');
	});

	it('keeps full refunds and chargebacks terminal', () => {
		expect(resolvePaymentStatus('Refunded', 'Paid')).toBe('Refunded');
		expect(resolvePaymentStatus('Chargeback', 'Paid')).toBe('Chargeback');
	});

	it('allows a partial refund to become a full refund', () => {
		expect(resolvePaymentStatus('PartiallyRefunded', 'Refunded')).toBe(
			'Refunded',
		);
	});
});


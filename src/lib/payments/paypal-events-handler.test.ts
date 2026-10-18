import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dbMock, reconcilePaymentEventMock, paypalRequestMock } = vi.hoisted(() => ({
	dbMock: {
		paymentDetails: { findFirst: vi.fn() },
		refundTransaction: { findFirst: vi.fn() },
	},
	reconcilePaymentEventMock: vi.fn(),
	paypalRequestMock: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ db: dbMock }));
vi.mock('./reconcile', () => ({ reconcilePaymentEvent: reconcilePaymentEventMock }));
vi.mock('@/lib/notifications/domain-events', () => ({
	DOMAIN_EVENT_TYPES: { REFUND_ISSUED: 'refund.issued' },
	publishDomainEvent: vi.fn(),
}));
vi.mock('@/lib/email/schedule', () => ({ scheduleEmailOutboxDispatch: vi.fn() }));
vi.mock('./paypal-client', () => ({ paypalRequest: paypalRequestMock }));

import { handlePayPalEvent } from './paypal-events';

describe('PayPal provider event mapping', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		reconcilePaymentEventMock.mockResolvedValue({ duplicate: false });
		dbMock.refundTransaction.findFirst.mockResolvedValue(null);
	});

	it('ignores events that do not map to a payment status', async () => {
		const result = await handlePayPalEvent({ id: 'evt_unknown', event_type: 'CHECKOUT.ORDER.APPROVED' });

		expect(result).toEqual({ ignored: true });
		expect(dbMock.paymentDetails.findFirst).not.toHaveBeenCalled();
	});

	it('maps a completed capture to paid reconciliation', async () => {
		dbMock.paymentDetails.findFirst.mockResolvedValue({
			id: 'payment-1',
			orderId: 'order-1',
			paymentInetntId: 'paypal-order-1',
			providerCaptureId: null,
		});

		const result = await handlePayPalEvent({
			id: 'evt_completed',
			event_type: 'PAYMENT.CAPTURE.COMPLETED',
			resource: {
				id: 'capture-1',
				status: 'COMPLETED',
				amount: { value: '49.99', currency_code: 'USD' },
				supplementary_data: { related_ids: { order_id: 'paypal-order-1', capture_id: 'capture-1' } },
			},
		});

		expect(result).toEqual({ duplicate: false });
		expect(reconcilePaymentEventMock).toHaveBeenCalledWith({
			orderId: 'order-1',
			provider: 'Paypal',
			providerEventId: 'evt_completed',
			providerPaymentId: 'paypal-order-1',
			providerCaptureId: 'capture-1',
			eventType: 'PAYMENT.CAPTURE.COMPLETED',
			providerStatus: 'COMPLETED',
			paymentStatus: 'Paid',
			amount: 49.99,
			currency: 'USD',
			verifyOrderAmount: true,
		});
	});

	it('ignores a valid event that cannot be matched to a local payment', async () => {
		dbMock.paymentDetails.findFirst.mockResolvedValue(null);

		const result = await handlePayPalEvent({
			id: 'evt_unmatched',
			event_type: 'PAYMENT.CAPTURE.COMPLETED',
			resource: { id: 'capture-missing' },
		});

		expect(result).toEqual({ ignored: true });
		expect(reconcilePaymentEventMock).not.toHaveBeenCalled();
	});

	it.each([['REFUNDED', 'Refunded'], ['PARTIALLY_REFUNDED', 'PartiallyRefunded']])('reconciles a real refund parent-link payload using cumulative capture status %s', async (status, paymentStatus) => {
		dbMock.paymentDetails.findFirst.mockResolvedValue({ id: 'payment-1', orderId: 'order-1', paymentInetntId: 'paypal-order-1', providerCaptureId: '9V807479H3183464M' });
		paypalRequestMock.mockResolvedValue({ status });
		await handlePayPalEvent({ id: `evt_${status}`, event_type: 'PAYMENT.CAPTURE.REFUNDED', resource: { id: 'refund-1', status: 'COMPLETED', amount: { value: '25.00', currency_code: 'USD' }, links: [{ rel: 'up', href: 'https://api.sandbox.paypal.com/v2/payments/captures/9V807479H3183464M' }] } });
		expect(dbMock.paymentDetails.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { paymentMethod: 'Paypal', OR: [{ providerCaptureId: '9V807479H3183464M' }] } }));
		expect(paypalRequestMock).toHaveBeenCalledWith('/v2/payments/captures/9V807479H3183464M');
		expect(reconcilePaymentEventMock).toHaveBeenCalledWith(expect.objectContaining({ paymentStatus, providerCaptureId: '9V807479H3183464M', amount: 25 }));
	});

	it('ignores refund parent links outside the PayPal capture API', async () => {
		await expect(handlePayPalEvent({ id: 'invalid-parent', event_type: 'PAYMENT.CAPTURE.REFUNDED', resource: { links: [{ rel: 'up', href: 'https://example.com/v2/payments/captures/9V807479H3183464M' }] } })).resolves.toEqual({ ignored: true });
		expect(dbMock.paymentDetails.findFirst).not.toHaveBeenCalled();
	});
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dbMock, reconcilePaymentEventMock } = vi.hoisted(() => ({
	dbMock: {
		paymentDetails: { findFirst: vi.fn() },
	},
	reconcilePaymentEventMock: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ db: dbMock }));
vi.mock('./reconcile', () => ({ reconcilePaymentEvent: reconcilePaymentEventMock }));
vi.mock('@/lib/notifications/domain-events', () => ({
	DOMAIN_EVENT_TYPES: { REFUND_ISSUED: 'refund.issued' },
	publishDomainEvent: vi.fn(),
}));
vi.mock('@/lib/email/schedule', () => ({ scheduleEmailOutboxDispatch: vi.fn() }));
vi.mock('./paypal-client', () => ({ paypalRequest: vi.fn() }));

import { handlePayPalEvent } from './paypal-events';

describe('PayPal provider event mapping', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		reconcilePaymentEventMock.mockResolvedValue({ duplicate: false });
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
});

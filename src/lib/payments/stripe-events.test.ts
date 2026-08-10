import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dbMock, reconcilePaymentEventMock } = vi.hoisted(() => ({
	dbMock: {
		order: { findUnique: vi.fn() },
		paymentDetails: { findFirst: vi.fn(), findUnique: vi.fn() },
		refundTransaction: { findFirst: vi.fn() },
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

import { handleStripeEvent } from './stripe-events';

describe('Stripe provider event mapping', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		reconcilePaymentEventMock.mockResolvedValue({ duplicate: false });
	});

	it('ignores unsupported payment intent events', async () => {
		const result = await handleStripeEvent({
			id: 'evt_processing',
			type: 'payment_intent.processing',
			data: { object: {} },
		} as never);

		expect(result).toEqual({ ignored: true });
		expect(reconcilePaymentEventMock).not.toHaveBeenCalled();
	});

	it('maps a verified succeeded intent to a paid reconciliation event', async () => {
		dbMock.order.findUnique.mockResolvedValue({ id: 'order-1' });

		const result = await handleStripeEvent({
			id: 'evt_succeeded',
			type: 'payment_intent.succeeded',
			data: {
				object: {
					id: 'pi_1',
					amount: 4999,
					currency: 'usd',
					status: 'succeeded',
					metadata: { orderId: 'order-1' },
				},
			},
		} as never);

		expect(result).toEqual({ duplicate: false });
		expect(reconcilePaymentEventMock).toHaveBeenCalledWith({
			orderId: 'order-1',
			provider: 'Stripe',
			providerEventId: 'evt_succeeded',
			providerPaymentId: 'pi_1',
			eventType: 'payment_intent.succeeded',
			providerStatus: 'succeeded',
			paymentStatus: 'Paid',
			amount: 49.99,
			currency: 'usd',
			verifyOrderAmount: true,
		});
	});

	it('ignores a refund event when no payment intent is attached', async () => {
		const result = await handleStripeEvent({
			id: 'evt_refund_without_intent',
			type: 'charge.refunded',
			data: { object: { payment_intent: null } },
		} as never);

		expect(result).toEqual({ ignored: true });
		expect(reconcilePaymentEventMock).not.toHaveBeenCalled();
	});

	it('reconciles a refund event without creating a refund completion twice', async () => {
		dbMock.order.findUnique.mockResolvedValue({ id: 'order-1' });
		dbMock.paymentDetails.findUnique.mockResolvedValue({ id: 'payment-1' });
		dbMock.refundTransaction.findFirst.mockResolvedValue(null);

		const result = await handleStripeEvent({
			id: 'evt_refunded',
			type: 'charge.refunded',
			data: {
				object: {
					payment_intent: 'pi_1',
					amount: 4999,
					amount_refunded: 4999,
					currency: 'usd',
					status: 'succeeded',
					metadata: { orderId: 'order-1' },
				},
			},
		} as never);

		expect(result).toEqual({ duplicate: false });
		expect(reconcilePaymentEventMock).toHaveBeenCalledWith(expect.objectContaining({
			paymentStatus: 'Refunded',
			amount: 49.99,
			providerEventId: 'evt_refunded',
		}));
	});
});

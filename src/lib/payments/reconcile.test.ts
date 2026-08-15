import { describe, expect, it, vi } from 'vitest';

const { dbMock, publishPaidOrderNotificationsMock, scheduleEmailOutboxDispatchMock, awardCoinsMock, createSettlementsForPaidOrderMock } = vi.hoisted(() => ({
	dbMock: {
		$transaction: vi.fn(),
	},
	publishPaidOrderNotificationsMock: vi.fn(),
	scheduleEmailOutboxDispatchMock: vi.fn(),
	awardCoinsMock: vi.fn(),
	createSettlementsForPaidOrderMock: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ db: dbMock }));
vi.mock('@/lib/notifications/domain-events', () => ({ publishPaidOrderNotifications: publishPaidOrderNotificationsMock }));
vi.mock('@/lib/email/schedule', () => ({ scheduleEmailOutboxDispatch: scheduleEmailOutboxDispatchMock }));
vi.mock('@/lib/loyalty/coins', () => ({ awardCoins: awardCoinsMock }));
vi.mock('@/lib/settlement/service', () => ({ createSettlementsForPaidOrder: createSettlementsForPaidOrderMock }));

import { reconcilePaymentEvent } from './reconcile';

describe('payment reconciliation side effects', () => {
	it('commits payment state before fan-out notifications and settlement work', async () => {
		const paymentDetails = {
			updatedAt: new Date('2026-08-15T00:00:00.000Z'),
			amount: 25,
			currency: 'USD',
		};
		const order = {
			id: 'order-1',
			userId: 'user-1',
			total: 25,
			paymentStatus: 'Pending',
			paymentDetails: null,
		};
		const updatedOrder = { ...order, paymentStatus: 'Paid', paymentMethod: 'Stripe', paymentDetails };
		const tx = {
			paymentEvent: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({}) },
			order: { findUnique: vi.fn().mockResolvedValue(order), update: vi.fn().mockResolvedValue(updatedOrder) },
			paymentDetails: { upsert: vi.fn().mockResolvedValue(paymentDetails) },
		};
		dbMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx));
		publishPaidOrderNotificationsMock.mockResolvedValue(['event-1']);
		awardCoinsMock.mockResolvedValue({ id: 'coin-1' });
		createSettlementsForPaidOrderMock.mockResolvedValue([]);

		const result = await reconcilePaymentEvent({
			orderId: order.id,
			provider: 'Stripe',
			providerEventId: 'evt-1',
			providerPaymentId: 'pi-1',
			eventType: 'payment_intent.succeeded',
			providerStatus: 'succeeded',
			paymentStatus: 'Paid',
			amount: 25,
			currency: 'usd',
			verifyOrderAmount: true,
		});

		expect(result.duplicate).toBe(false);
		expect(publishPaidOrderNotificationsMock).toHaveBeenCalledWith(dbMock, expect.objectContaining({ orderId: order.id }));
		expect(awardCoinsMock).toHaveBeenCalledWith(tx, expect.objectContaining({ idempotencyKey: 'earn:evt-1' }));
		expect(createSettlementsForPaidOrderMock).toHaveBeenCalledWith(order.id);
		expect(scheduleEmailOutboxDispatchMock).toHaveBeenCalledWith(['event-1']);
	});

	it('keeps a successful payment successful when notification fan-out fails', async () => {
		const paymentDetails = {
			updatedAt: new Date('2026-08-15T00:00:00.000Z'),
			amount: 25,
			currency: 'USD',
		};
		const order = {
			id: 'order-2',
			userId: 'user-2',
			total: 25,
			paymentStatus: 'Pending',
			paymentDetails: null,
		};
		const updatedOrder = { ...order, paymentStatus: 'Paid', paymentMethod: 'Stripe', paymentDetails };
		const tx = {
			paymentEvent: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({}) },
			order: { findUnique: vi.fn().mockResolvedValue(order), update: vi.fn().mockResolvedValue(updatedOrder) },
			paymentDetails: { upsert: vi.fn().mockResolvedValue(paymentDetails) },
		};
		dbMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx));
		publishPaidOrderNotificationsMock.mockRejectedValue(new Error('notification timeout'));
		awardCoinsMock.mockResolvedValue({ id: 'coin-2' });
		createSettlementsForPaidOrderMock.mockResolvedValue([]);

		const result = await reconcilePaymentEvent({
			orderId: order.id,
			provider: 'Stripe',
			providerEventId: 'evt-2',
			providerPaymentId: 'pi-2',
			eventType: 'payment_intent.succeeded',
			providerStatus: 'succeeded',
			paymentStatus: 'Paid',
			amount: 25,
			currency: 'usd',
			verifyOrderAmount: true,
		});

		expect(result).toMatchObject({ duplicate: false, order: updatedOrder, paymentDetails });
		expect(awardCoinsMock).toHaveBeenCalledWith(tx, expect.objectContaining({ idempotencyKey: 'earn:evt-2' }));
		expect(createSettlementsForPaidOrderMock).toHaveBeenCalledWith(order.id);
	});
});

import { beforeEach, expect, it, vi } from 'vitest';
const h = vi.hoisted(() => ({
	currentUser: vi.fn(), lock: vi.fn(), reservation: vi.fn(),
	tx: {
		cancellationRequest: { findFirst: vi.fn(), update: vi.fn() },
		orderGroup: { update: vi.fn(), findMany: vi.fn() },
		orderItem: { updateMany: vi.fn() }, order: { update: vi.fn() },
		fulfillmentTransition: { create: vi.fn() }, shipment: { update: vi.fn() },
		size: { updateMany: vi.fn() },
	},
}));
vi.mock('@clerk/nextjs/server', () => ({ currentUser: h.currentUser, auth: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { $transaction: (callback: (tx: typeof h.tx) => Promise<unknown>) => callback(h.tx) } }));
vi.mock('@/lib/payments/coupon-reservation', () => ({ lockOwnedOrder: h.lock, hasPaymentReservation: h.reservation }));
vi.mock('@/lib/email/schedule', () => ({ scheduleEmailOutboxDispatch: vi.fn() }));
vi.mock('@/lib/notifications/domain-events', () => ({ DOMAIN_EVENT_TYPES: {}, publishDomainEvent: vi.fn() }));
vi.mock('@/lib/settlement/service', () => ({ refreshSettlementEligibilityForOrderGroup: vi.fn() }));
vi.mock('next/cache', () => ({ updateTag: vi.fn() }));
vi.mock('next/server', () => ({ after: vi.fn() }));
import { decidePackageCancellation } from './fulfillment';

const input = { storeId: 'store', requestId: 'request', decision: 'APPROVE' as const, idempotencyKey: 'cancel-test-123' };
const request = {
	id: 'request', status: 'REQUESTED', orderId: 'order', customerId: 'buyer',
	orderGroupId: 'group', reasonCode: 'ORDERED_BY_MISTAKE', message: null,
	order: { paymentStatus: 'Pending', paymentDetails: null },
	orderGroup: { id: 'group', orderId: 'order', packageStatus: 'PENDING', shipmentAssignments: [], items: [] },
};
beforeEach(() => {
	vi.resetAllMocks();
	h.currentUser.mockResolvedValue({ id: 'seller', privateMetadata: { role: 'SELLER' } });
	h.tx.cancellationRequest.findFirst.mockResolvedValue(request);
	h.reservation.mockResolvedValue(false);
	h.tx.orderGroup.findMany.mockResolvedValue([{ status: 'Cancelled' }]);
	h.tx.cancellationRequest.update.mockResolvedValue({ ...request, status: 'APPROVED' });
});
it('re-reads the request after acquiring the payment order lock before approval', async () => {
	await expect(decidePackageCancellation(input)).resolves.toMatchObject({ status: 'APPROVED' });
	expect(h.lock).toHaveBeenCalledWith(h.tx, 'order', 'buyer');
	expect(h.tx.cancellationRequest.findFirst).toHaveBeenCalledTimes(2);
	expect(h.tx.cancellationRequest.findFirst.mock.invocationCallOrder[0]).toBeLessThan(h.lock.mock.invocationCallOrder[0]);
	expect(h.lock.mock.invocationCallOrder[0]).toBeLessThan(h.tx.cancellationRequest.findFirst.mock.invocationCallOrder[1]);
});
it.each(['reservation', 'legacy payment'])('blocks an unpaid cancellation after %s starts', async started => {
	if (started === 'reservation') h.reservation.mockResolvedValue(true);
	else h.tx.cancellationRequest.findFirst.mockResolvedValue({ ...request, order: { paymentStatus: 'Pending', paymentDetails: { id: 'payment' } } });
	await expect(decidePackageCancellation(input)).rejects.toThrow('Payment has already started');
	expect(h.tx.orderGroup.update).not.toHaveBeenCalled();
	expect(h.tx.cancellationRequest.update).not.toHaveBeenCalled();
});
it('preserves paid cancellation without rewriting the historical charge', async () => {
	h.reservation.mockResolvedValue(true);
	h.tx.cancellationRequest.findFirst.mockResolvedValue({ ...request, order: { paymentStatus: 'Paid', paymentDetails: { id: 'payment' } } });
	await expect(decidePackageCancellation(input)).resolves.toMatchObject({ status: 'APPROVED' });
	expect(h.tx.order.update).toHaveBeenCalledWith({ where: { id: 'order' }, data: { orderStatus: 'Cancelled' } });
});

it('restores only stock reserved by this checkout and clears its marker', async () => {
	h.tx.cancellationRequest.findFirst.mockResolvedValue({ ...request, orderGroup: {
		...request.orderGroup, items: [
			{ id: 'reserved', sizeId: 'size', quantity: 2, inventoryReserved: true },
			{ id: 'legacy', sizeId: 'old-size', quantity: 3, inventoryReserved: false },
		],
	} });
	await decidePackageCancellation(input);
	expect(h.tx.size.updateMany).toHaveBeenCalledTimes(1);
	expect(h.tx.size.updateMany).toHaveBeenCalledWith({ where: { id: 'size' }, data: { quantity: { increment: 2 } } });
	expect(h.tx.orderItem.updateMany).toHaveBeenCalledWith({ where: { id: 'reserved', inventoryReserved: true }, data: { inventoryReserved: false } });
});

it('a repeated approval does not restore stock again', async () => {
	h.tx.cancellationRequest.findFirst.mockResolvedValue({ ...request, status: 'APPROVED' });
	await decidePackageCancellation(input);
	expect(h.tx.size.updateMany).not.toHaveBeenCalled();
});

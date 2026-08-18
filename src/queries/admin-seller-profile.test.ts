import { describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
	auth: vi.fn(),
	db: {
		user: { findUnique: vi.fn() },
		sellerSettlement: { count: vi.fn(), groupBy: vi.fn(), findMany: vi.fn() },
		payoutBatch: { count: vi.fn(), findMany: vi.fn() },
		settlementLedgerEntry: { groupBy: vi.fn() },
		orderGroup: { count: vi.fn(), aggregate: vi.fn() },
		orderItem: { aggregate: vi.fn(), groupBy: vi.fn() },
		review: { aggregate: vi.fn() },
	},
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: harness.auth }));
vi.mock('@/lib/db', () => ({ db: harness.db }));

import { getAdminSellerProfile } from './admin-seller-profile';

describe('getAdminSellerProfile', () => {
	it.each(['SELLER', 'USER'])('rejects a %s actor before reading seller financial data', async (role) => {
		harness.auth.mockResolvedValue({ userId: `${role.toLowerCase()}-1` });
		harness.db.user.findUnique.mockResolvedValueOnce({ role });

		await expect(getAdminSellerProfile('other-seller')).rejects.toThrow('Admin privileges required');
		expect(harness.db.user.findUnique).toHaveBeenCalledTimes(1);
	});

	it('scopes combined totals and paid performance to the requested seller across stores', async () => {
		harness.auth.mockResolvedValue({ userId: 'admin-1' });
		harness.db.user.findUnique
			.mockResolvedValueOnce({ role: 'ADMIN' })
			.mockResolvedValueOnce({
				id: 'seller-1', name: 'Seller One', email: 'seller@example.com', picture: '', role: 'SELLER', createdAt: new Date('2026-01-01'), paymentAccount: null,
				stores: [
					{ id: 'store-a', name: 'Store A', url: 'store-a', status: 'ACTIVE', averageRating: 4.5, numReviews: 2, createdAt: new Date('2026-01-01'), _count: { products: 3, orderGroups: 4 } },
					{ id: 'store-b', name: 'Store B', url: 'store-b', status: 'DISABLED', averageRating: 3.5, numReviews: 1, createdAt: new Date('2026-01-02'), _count: { products: 2, orderGroups: 2 } },
				],
			});
		harness.db.sellerSettlement.count.mockResolvedValue(2);
		harness.db.payoutBatch.count.mockResolvedValue(1);
		harness.db.settlementLedgerEntry.groupBy.mockResolvedValue([
			{ entryType: 'INITIAL', _sum: { grossCents: 30_000, discountCents: 1_000, commissionCents: 580, refundCents: 0, reversalCents: 0, sellerPayableCents: 28_420 } },
		]);
		harness.db.sellerSettlement.groupBy.mockResolvedValue([
			{ status: 'HELD', _sum: { sellerPayableCents: 9_800, remainingPayableCents: 9_800 } },
			{ status: 'RELEASED', _sum: { sellerPayableCents: 18_620, remainingPayableCents: 0 } },
		]);
		harness.db.sellerSettlement.findMany.mockResolvedValue([]);
		harness.db.payoutBatch.findMany.mockResolvedValue([]);
		harness.db.orderGroup.count.mockResolvedValue(2);
		harness.db.orderGroup.aggregate.mockResolvedValue({ _sum: { total: 300 } });
		harness.db.orderItem.aggregate.mockResolvedValue({ _sum: { quantity: 5 } });
		harness.db.review.aggregate.mockResolvedValue({ _count: { _all: 3 }, _avg: { rating: 4.25 } });
		harness.db.orderItem.groupBy.mockResolvedValue([]);

		const result = await getAdminSellerProfile('seller-1');

		expect(result?.storeCount).toBe(2);
		expect(result?.financials).toMatchObject({ grossCents: 30_000, commissionCents: 580, heldCents: 9_800, releasedCents: 18_620, outstandingCents: 9_800 });
		expect(result?.performance).toMatchObject({ paidOrders: 2, unitsSold: 5, netSalesCents: 30_000, averageOrderValueCents: 15_000, reviewCount: 3, averageRating: 4.25 });

		const settlementCountWhere = harness.db.sellerSettlement.count.mock.calls[0][0].where;
		expect(settlementCountWhere).toMatchObject({ sellerId: 'seller-1', orderGroup: { store: { userId: 'seller-1' } } });
		const paidWhere = harness.db.orderGroup.count.mock.calls[0][0].where;
		expect(paidWhere).toMatchObject({ store: { userId: 'seller-1' }, order: { paymentStatus: 'Paid' } });
	});
});

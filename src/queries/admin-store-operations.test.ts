import { beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
	auth: vi.fn(),
	db: {
		user: { findUnique: vi.fn(), count: vi.fn(), findMany: vi.fn() },
		store: { count: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
		orderGroup: { groupBy: vi.fn(), count: vi.fn(), aggregate: vi.fn(), findMany: vi.fn() },
		sellerSettlement: { findMany: vi.fn(), groupBy: vi.fn(), count: vi.fn() },
		settlementLedgerEntry: { groupBy: vi.fn() },
		orderItem: { aggregate: vi.fn(), groupBy: vi.fn() },
		review: { aggregate: vi.fn() },
	},
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: harness.auth }));
vi.mock('@/lib/db', () => ({ db: harness.db }));

import { getAdminSellerDirectory, getAdminStoreDirectory, getAdminStoreProfile } from './admin-store-operations';

describe('admin marketplace operations queries', () => {
	beforeEach(() => vi.clearAllMocks());

	it('rejects non-admin actors before reading marketplace data', async () => {
		harness.auth.mockResolvedValue({ userId: 'seller-1' });
		harness.db.user.findUnique.mockResolvedValue({ role: 'SELLER' });

		await expect(getAdminStoreDirectory()).rejects.toThrow('Admin privileges required');
		expect(harness.db.store.findMany).not.toHaveBeenCalled();
	});

	it('maps a store directory row to its seller, paid-sales, commission, and outstanding balance', async () => {
		harness.auth.mockResolvedValue({ userId: 'admin-1' });
		harness.db.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
		harness.db.store.count.mockResolvedValue(1);
		harness.db.store.findMany.mockResolvedValue([{
			id: 'store-1', name: 'Store One', url: 'store-one', status: 'ACTIVE', featured: true, cover: '', logo: '', averageRating: 4.5, numReviews: 3, createdAt: new Date('2026-01-01'),
			user: { id: 'seller-1', name: 'Seller One', email: 'seller@example.com', picture: '' },
			_count: { products: 4, orderGroups: 7, followers: 9 },
		}]);
		harness.db.orderGroup.groupBy.mockResolvedValue([{ storeId: 'store-1', _sum: { total: 125.5 }, _count: { _all: 2 } }]);
		harness.db.sellerSettlement.findMany.mockResolvedValue([{ commissionCents: 250, sellerPayableCents: 12_300, remainingPayableCents: 4_300, orderGroup: { storeId: 'store-1' } }]);

		const result = await getAdminStoreDirectory({ search: 'seller' });

		expect(result.items[0]).toMatchObject({
			id: 'store-1',
			user: { id: 'seller-1', email: 'seller@example.com' },
			metrics: { paidSalesCents: 12_550, paidOrders: 2, commissionCents: 250, sellerPayableCents: 12_300, outstandingCents: 4_300 },
		});
		expect(harness.db.orderGroup.groupBy.mock.calls[0][0].where).toMatchObject({ storeId: { in: ['store-1'] }, order: { paymentStatus: 'Paid' } });
	});

	it('aggregates a seller directory row across all owned stores without exposing payout account details', async () => {
		harness.auth.mockResolvedValue({ userId: 'admin-1' });
		harness.db.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
		harness.db.user.count.mockResolvedValue(1);
		harness.db.user.findMany.mockResolvedValue([{
			id: 'seller-1', name: 'Seller One', email: 'seller@example.com', picture: '', role: 'SELLER', createdAt: new Date('2026-01-01'),
			paymentAccount: { status: 'ACTIVE', transfersCapability: 'ACTIVE', detailsSubmitted: true, requirementsDueCount: 0 },
			stores: [
				{ id: 'store-a', status: 'ACTIVE', averageRating: 4, numReviews: 2, _count: { products: 3 } },
				{ id: 'store-b', status: 'DISABLED', averageRating: 5, numReviews: 1, _count: { products: 2 } },
			],
		}]);
		harness.db.orderGroup.groupBy.mockResolvedValue([
			{ storeId: 'store-a', _sum: { total: 100 }, _count: { _all: 1 } },
			{ storeId: 'store-b', _sum: { total: 50 }, _count: { _all: 1 } },
		]);
		harness.db.sellerSettlement.groupBy.mockResolvedValue([{ sellerId: 'seller-1', _sum: { commissionCents: 300, sellerPayableCents: 14_700, remainingPayableCents: 2_700 } }]);

		const result = await getAdminSellerDirectory();

		expect(result.items[0].metrics).toMatchObject({ storeCount: 2, activeStoreCount: 1, productCount: 5, paidSalesCents: 15_000, paidOrders: 2, commissionCents: 300, outstandingCents: 2_700, reviewCount: 3, averageRating: 13 / 3 });
		expect(result.items[0].paymentAccount).not.toHaveProperty('providerAccountId');
	});

	it('returns a date-scoped store profile with immutable financial facts and paid top products', async () => {
		harness.auth.mockResolvedValue({ userId: 'admin-1' });
		harness.db.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
		harness.db.store.findUnique.mockResolvedValue({
			id: 'store-1', name: 'Store One', description: '', url: 'store-one', status: 'ACTIVE', featured: false, logo: '', cover: '', averageRating: 4.5, numReviews: 3, returnsAccepted: true, returnWindowDays: 7, returnShippingFees: false, defaultShippingService: 'International Delivery', defaultDeliveryTimeMin: 7, defaultDeliveryTimeMax: 14, createdAt: new Date('2026-01-01'),
			user: { id: 'seller-1', name: 'Seller One', email: 'seller@example.com', picture: '', role: 'SELLER', createdAt: new Date('2026-01-01'), paymentAccount: { status: 'ACTIVE', transfersCapability: 'ACTIVE', detailsSubmitted: true, requirementsDueCount: 0, lastCheckedAt: null } },
			_count: { products: 3, orderGroups: 4, followers: 1, coupons: 1, returnRequests: 0 },
		});
		harness.db.sellerSettlement.count.mockResolvedValue(1);
		harness.db.settlementLedgerEntry.groupBy.mockResolvedValue([{ entryType: 'INITIAL', _sum: { grossCents: 10_000, discountCents: 200, commissionCents: 196, refundCents: 0, reversalCents: 0, sellerPayableCents: 9_604 } }]);
		harness.db.sellerSettlement.groupBy.mockResolvedValue([{ status: 'HELD', _sum: { sellerPayableCents: 9_604, remainingPayableCents: 9_604 } }]);
		harness.db.sellerSettlement.findMany.mockResolvedValue([]);
		harness.db.orderGroup.count.mockResolvedValue(1);
		harness.db.orderGroup.aggregate.mockResolvedValue({ _sum: { total: 100 } });
		harness.db.orderItem.aggregate.mockResolvedValue({ _sum: { quantity: 2 } });
		harness.db.review.aggregate.mockResolvedValue({ _count: { _all: 2 }, _avg: { rating: 4.5 } });
		harness.db.orderItem.groupBy.mockResolvedValue([{ productId: 'product-1', name: 'Product One', productSlug: 'product-one', image: '', _sum: { quantity: 2, totalPrice: 100 } }]);
		harness.db.orderGroup.findMany.mockResolvedValue([]);

		const result = await getAdminStoreProfile('store-1', { from: '2026-08-01', to: '2026-08-07' });

		expect(result?.financials).toMatchObject({ grossCents: 10_000, commissionCents: 196, heldCents: 9_604, outstandingCents: 9_604 });
		expect(result?.performance).toMatchObject({ paidOrders: 1, unitsSold: 2, netSalesCents: 10_000, averageOrderValueCents: 10_000, reviewCount: 2, averageRating: 4.5 });
		expect(result?.performance.topProducts[0]).toMatchObject({ productId: 'product-1', unitsSold: 2, revenueCents: 10_000 });
		expect(harness.db.orderGroup.count.mock.calls[0][0].where).toMatchObject({ storeId: 'store-1', order: { paymentStatus: 'Paid', createdAt: { gte: new Date('2026-08-01T00:00:00.000Z'), lt: new Date('2026-08-08T00:00:00.000Z') } } });
	});
});

import { auth } from '@clerk/nextjs/server';
import { PaymentStatus, Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import {
	parseSellerProfileDateRange,
	summarizeSellerFinancials,
	type SellerFinancialSummary,
} from '@/lib/admin-seller-profile';
import { PAYOUT_BATCH_PAGE_SIZE, SETTLEMENT_PAGE_SIZE } from '@/lib/settlement/service';

function pageValue(value: string | undefined, fallback = 1): number {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function pagination(total: number, requestedPage: number, pageSize: number) {
	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	return {
		page: Math.min(requestedPage, totalPages),
		pageSize,
		total,
		totalPages,
	};
}

export type AdminSellerProfileOptions = {
	ledgerPage?: string;
	batchPage?: string;
	storeId?: string;
	from?: string;
	to?: string;
};

export async function getAdminSellerProfile(sellerId: string, options: AdminSellerProfileOptions = {}) {
	const { userId } = await auth();
	if (!userId) throw new Error('Unauthenticated.');
	const actor = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
	if (actor?.role !== 'ADMIN') throw new Error('Unauthorized Access: Admin privileges required.');

	const dateRange = parseSellerProfileDateRange({ from: options.from, to: options.to });
	const storeFilter = options.storeId ? { id: options.storeId } : {};
	const storeWhere: Prisma.StoreWhereInput = { userId: sellerId, ...storeFilter };
	const settlementWhere: Prisma.SellerSettlementWhereInput = {
		sellerId,
		orderGroup: { store: storeWhere },
	};
	const ledgerWhere: Prisma.SettlementLedgerEntryWhereInput = { settlement: settlementWhere };
	const settlementPageRequested = pageValue(options.ledgerPage);
	const batchPageRequested = pageValue(options.batchPage);
	const dateFilter = dateRange.valid
		? {
				...(dateRange.fromDate ? { gte: dateRange.fromDate } : {}),
				...(dateRange.toDateExclusive ? { lt: dateRange.toDateExclusive } : {}),
			}
		: {};
	const paidOrderGroupWhere: Prisma.OrderGroupWhereInput = {
		store: storeWhere,
		order: {
			paymentStatus: PaymentStatus.Paid,
			...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
		},
	};
	const reviewWhere: Prisma.ReviewWhereInput = {
		product: { store: storeWhere },
		...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
	};

	const seller = await db.user.findUnique({
		where: { id: sellerId },
		select: {
			id: true,
			name: true,
			email: true,
			picture: true,
			role: true,
			createdAt: true,
			paymentAccount: {
				select: {
					provider: true,
					status: true,
					country: true,
					transfersCapability: true,
					detailsSubmitted: true,
					requirementsDueCount: true,
					availableBalanceCents: true,
					pendingBalanceCents: true,
					lastCheckedAt: true,
				},
			},
			stores: {
				orderBy: [{ status: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }],
				select: {
					id: true,
					name: true,
					url: true,
					status: true,
					averageRating: true,
					numReviews: true,
					createdAt: true,
					_count: { select: { products: true, orderGroups: true } },
				},
			},
		},
	});
	if (!seller) return null;

	const [settlementTotal, batchTotal] = await Promise.all([
		db.sellerSettlement.count({ where: settlementWhere }),
		db.payoutBatch.count({ where: { settlements: { some: settlementWhere } } }),
	]);
	const settlementPaginationPage = Math.min(settlementPageRequested, Math.max(1, Math.ceil(settlementTotal / SETTLEMENT_PAGE_SIZE)));
	const batchPaginationPage = Math.min(batchPageRequested, Math.max(1, Math.ceil(batchTotal / PAYOUT_BATCH_PAGE_SIZE)));

	const [ledgerRows, statusRows, settlements, batches, paidOrderCount, paidSales, paidUnits, reviewStats, topProducts] = await Promise.all([
		db.settlementLedgerEntry.groupBy({
			by: ['entryType'],
			where: ledgerWhere,
			_sum: { grossCents: true, discountCents: true, commissionCents: true, refundCents: true, reversalCents: true, sellerPayableCents: true },
		}),
		db.sellerSettlement.groupBy({
			by: ['status'],
			where: settlementWhere,
			_sum: { sellerPayableCents: true, remainingPayableCents: true },
		}),
		db.sellerSettlement.findMany({
			where: settlementWhere,
			orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
			skip: (settlementPaginationPage - 1) * SETTLEMENT_PAGE_SIZE,
			take: SETTLEMENT_PAGE_SIZE,
			select: {
				id: true,
				status: true,
				grossCents: true,
				discountCents: true,
				commissionCents: true,
				refundedCents: true,
				reversedCents: true,
				sellerPayableCents: true,
				remainingPayableCents: true,
				failureReason: true,
				createdAt: true,
				updatedAt: true,
				orderGroup: { select: { id: true, createdAt: true, total: true, store: { select: { id: true, name: true, url: true } } } },
				payoutBatch: { select: { id: true, status: true, weekStart: true, weekEnd: true } },
				entries: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 5, select: { id: true, entryType: true, sellerPayableCents: true, refundCents: true, reversalCents: true, createdAt: true } },
			},
		}),
		db.payoutBatch.findMany({
			where: { settlements: { some: settlementWhere } },
			orderBy: [{ weekStart: 'desc' }, { id: 'desc' }],
			skip: (batchPaginationPage - 1) * PAYOUT_BATCH_PAGE_SIZE,
			take: PAYOUT_BATCH_PAGE_SIZE,
			select: {
				id: true,
				weekStart: true,
				weekEnd: true,
				timezone: true,
				status: true,
				totalCents: true,
				approvedAt: true,
				processedAt: true,
				failureReason: true,
				settlements: { where: settlementWhere, select: { sellerPayableCents: true, remainingPayableCents: true, status: true } },
			},
		}),
		db.orderGroup.count({ where: paidOrderGroupWhere }),
		db.orderGroup.aggregate({ where: paidOrderGroupWhere, _sum: { total: true } }),
		db.orderItem.aggregate({ where: { orderGroup: paidOrderGroupWhere }, _sum: { quantity: true } }),
		db.review.aggregate({ where: reviewWhere, _count: { _all: true }, _avg: { rating: true } }),
		db.orderItem.groupBy({
			by: ['productId', 'name', 'productSlug', 'image'],
			where: { orderGroup: paidOrderGroupWhere },
			_sum: { quantity: true, totalPrice: true },
			orderBy: { _sum: { totalPrice: 'desc' } },
			take: 10,
		}),
	]);

	const financials: SellerFinancialSummary = summarizeSellerFinancials(ledgerRows, statusRows);
	const paidSalesCents = Math.round((paidSales._sum.total ?? 0) * 100);
	const paidOrders = paidOrderCount;
	const storeCount = seller.stores.length;

	return {
		seller,
		storeCount,
		selectedStoreId: options.storeId ?? null,
		dateRange,
		financials,
		settlements,
		settlementPagination: pagination(settlementTotal, settlementPaginationPage, SETTLEMENT_PAGE_SIZE),
		batches: batches.map((batch) => ({ ...batch, sellerTotalCents: batch.settlements.reduce((sum, settlement) => sum + Math.max(0, settlement.sellerPayableCents), 0), settlementCount: batch.settlements.length })),
		batchPagination: pagination(batchTotal, batchPaginationPage, PAYOUT_BATCH_PAGE_SIZE),
		performance: {
			paidOrders,
			unitsSold: paidUnits._sum.quantity ?? 0,
			netSalesCents: paidSalesCents,
			averageOrderValueCents: paidOrders > 0 ? Math.round(paidSalesCents / paidOrders) : 0,
			reviewCount: reviewStats._count._all,
			averageRating: reviewStats._avg.rating ?? 0,
			topProducts: topProducts.map((product) => ({
				...product,
				unitsSold: product._sum.quantity ?? 0,
				revenueCents: Math.round((product._sum.totalPrice ?? 0) * 100),
			})),
		},
	};
}

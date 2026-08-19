'use server';

import { auth } from '@clerk/nextjs/server';
import { PaymentStatus, Prisma, StoreStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { parseSellerProfileDateRange, summarizeSellerFinancials } from '@/lib/admin-seller-profile';
import { SETTLEMENT_PAGE_SIZE } from '@/lib/settlement/service';

const DIRECTORY_PAGE_SIZE = 12;
const STORE_STATUSES = new Set(Object.values(StoreStatus));

type DirectoryOptions = { page?: string; search?: string; status?: string };
type StoreProfileOptions = { ledgerPage?: string; from?: string; to?: string };

function pageValue(value: string | undefined, fallback = 1) {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function pagination(total: number, requestedPage: number, pageSize: number) {
	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	return { page: Math.min(requestedPage, totalPages), pageSize, total, totalPages };
}

function dateWhere(range: ReturnType<typeof parseSellerProfileDateRange>) {
	if (!range.valid) return {};
	return {
		...(range.fromDate ? { gte: range.fromDate } : {}),
		...(range.toDateExclusive ? { lt: range.toDateExclusive } : {}),
	};
}

async function requireAdmin() {
	const { userId } = await auth();
	if (!userId) throw new Error('Unauthenticated.');
	const actor = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
	if (actor?.role !== 'ADMIN') throw new Error('Unauthorized Access: Admin privileges required.');
}

function storeDirectoryWhere({ search, status }: DirectoryOptions): Prisma.StoreWhereInput {
	const normalizedSearch = search?.trim();
	const normalizedStatus = status && STORE_STATUSES.has(status as StoreStatus) ? status as StoreStatus : undefined;
	return {
		...(normalizedStatus ? { status: normalizedStatus } : {}),
		...(normalizedSearch ? {
			OR: [
				{ name: { contains: normalizedSearch, mode: 'insensitive' } },
				{ url: { contains: normalizedSearch, mode: 'insensitive' } },
				{ email: { contains: normalizedSearch, mode: 'insensitive' } },
				{ user: { is: { name: { contains: normalizedSearch, mode: 'insensitive' } } } },
				{ user: { is: { email: { contains: normalizedSearch, mode: 'insensitive' } } } },
			],
		} : {}),
	};
}

function sellerDirectoryWhere({ search, status }: DirectoryOptions): Prisma.UserWhereInput {
	const normalizedSearch = search?.trim();
	const normalizedStatus = status && STORE_STATUSES.has(status as StoreStatus) ? status as StoreStatus : undefined;
	return {
		stores: { some: normalizedStatus ? { status: normalizedStatus } : {} },
		...(normalizedSearch ? {
			OR: [
				{ name: { contains: normalizedSearch, mode: 'insensitive' } },
				{ email: { contains: normalizedSearch, mode: 'insensitive' } },
				{ stores: { some: { OR: [{ name: { contains: normalizedSearch, mode: 'insensitive' } }, { url: { contains: normalizedSearch, mode: 'insensitive' } }] } } },
			],
		} : {}),
	};
}

function moneyFromOrderTotal(total: number | null) {
	return Math.round((total ?? 0) * 100);
}

export async function getAdminStoreDirectory(options: DirectoryOptions = {}) {
	await requireAdmin();
	const requestedPage = pageValue(options.page);
	const where = storeDirectoryWhere(options);
	const [total, stores] = await Promise.all([
		db.store.count({ where }),
		db.store.findMany({
			where,
			orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
			skip: (requestedPage - 1) * DIRECTORY_PAGE_SIZE,
			take: DIRECTORY_PAGE_SIZE,
			select: {
				id: true, name: true, url: true, status: true, featured: true, cover: true, logo: true,
				averageRating: true, numReviews: true, createdAt: true,
				user: { select: { id: true, name: true, email: true, picture: true } },
				_count: { select: { products: true, orderGroups: true, followers: true } },
			},
		}),
	]);
	const safePagination = pagination(total, requestedPage, DIRECTORY_PAGE_SIZE);
	if (stores.length === 0) return { items: [], pagination: safePagination, summary: { storeCount: total, activeStores: 0, paidSalesCents: 0, commissionCents: 0 } };

	const storeIds = stores.map((store) => store.id);
	const [paidGroups, settlements] = await Promise.all([
		db.orderGroup.groupBy({
			by: ['storeId'],
			where: { storeId: { in: storeIds }, order: { paymentStatus: PaymentStatus.Paid } },
			_sum: { total: true },
			_count: { _all: true },
		}),
		db.sellerSettlement.findMany({
			where: { orderGroup: { storeId: { in: storeIds } } },
			select: { commissionCents: true, sellerPayableCents: true, remainingPayableCents: true, orderGroup: { select: { storeId: true } } },
		}),
	]);
	const paidByStore = new Map(paidGroups.map((row) => [row.storeId, { paidSalesCents: moneyFromOrderTotal(row._sum.total), paidOrders: row._count._all }]));
	const settlementByStore = new Map<string, { commissionCents: number; sellerPayableCents: number; outstandingCents: number }>();
	for (const settlement of settlements) {
		const current = settlementByStore.get(settlement.orderGroup.storeId) ?? { commissionCents: 0, sellerPayableCents: 0, outstandingCents: 0 };
		current.commissionCents += settlement.commissionCents;
		current.sellerPayableCents += settlement.sellerPayableCents;
		current.outstandingCents += Math.max(0, settlement.remainingPayableCents);
		settlementByStore.set(settlement.orderGroup.storeId, current);
	}
	const items = stores.map((store) => ({
		...store,
		metrics: {
			...(paidByStore.get(store.id) ?? { paidSalesCents: 0, paidOrders: 0 }),
			...(settlementByStore.get(store.id) ?? { commissionCents: 0, sellerPayableCents: 0, outstandingCents: 0 }),
		},
	}));
	return {
		items,
		pagination: safePagination,
		summary: {
			storeCount: total,
			activeStores: items.filter((store) => store.status === 'ACTIVE').length,
			paidSalesCents: items.reduce((sum, store) => sum + store.metrics.paidSalesCents, 0),
			commissionCents: items.reduce((sum, store) => sum + store.metrics.commissionCents, 0),
		},
	};
}

export async function getAdminSellerDirectory(options: DirectoryOptions = {}) {
	await requireAdmin();
	const requestedPage = pageValue(options.page);
	const where = sellerDirectoryWhere(options);
	const [total, sellers] = await Promise.all([
		db.user.count({ where }),
		db.user.findMany({
			where,
			orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
			skip: (requestedPage - 1) * DIRECTORY_PAGE_SIZE,
			take: DIRECTORY_PAGE_SIZE,
			select: {
				id: true, name: true, email: true, picture: true, role: true, createdAt: true,
				paymentAccount: { select: { status: true, transfersCapability: true, detailsSubmitted: true, requirementsDueCount: true } },
				stores: { select: { id: true, status: true, averageRating: true, numReviews: true, _count: { select: { products: true } } } },
			},
		}),
	]);
	const safePagination = pagination(total, requestedPage, DIRECTORY_PAGE_SIZE);
	if (sellers.length === 0) return { items: [], pagination: safePagination, summary: { sellerCount: total, activeStores: 0, paidSalesCents: 0, commissionCents: 0 } };

	const storeOwner = new Map(sellers.flatMap((seller) => seller.stores.map((store) => [store.id, seller.id])));
	const storeIds = [...storeOwner.keys()];
	const sellerIds = sellers.map((seller) => seller.id);
	const [paidGroups, settlementRows] = await Promise.all([
		db.orderGroup.groupBy({
			by: ['storeId'],
			where: { storeId: { in: storeIds }, order: { paymentStatus: PaymentStatus.Paid } },
			_sum: { total: true },
			_count: { _all: true },
		}),
		db.sellerSettlement.groupBy({
			by: ['sellerId'],
			where: { sellerId: { in: sellerIds } },
			_sum: { commissionCents: true, sellerPayableCents: true, remainingPayableCents: true },
		}),
	]);
	const salesBySeller = new Map<string, { paidSalesCents: number; paidOrders: number }>();
	for (const row of paidGroups) {
		const sellerId = storeOwner.get(row.storeId);
		if (!sellerId) continue;
		const current = salesBySeller.get(sellerId) ?? { paidSalesCents: 0, paidOrders: 0 };
		current.paidSalesCents += moneyFromOrderTotal(row._sum.total);
		current.paidOrders += row._count._all;
		salesBySeller.set(sellerId, current);
	}
	const settlementsBySeller = new Map(settlementRows.map((row) => [row.sellerId, {
		commissionCents: row._sum.commissionCents ?? 0,
		sellerPayableCents: row._sum.sellerPayableCents ?? 0,
		outstandingCents: Math.max(0, row._sum.remainingPayableCents ?? 0),
	}]));
	const items = sellers.map((seller) => {
		const reviewCount = seller.stores.reduce((sum, store) => sum + store.numReviews, 0);
		const weightedRating = reviewCount > 0 ? seller.stores.reduce((sum, store) => sum + (store.averageRating * store.numReviews), 0) / reviewCount : 0;
		return {
			...seller,
			metrics: {
				...(salesBySeller.get(seller.id) ?? { paidSalesCents: 0, paidOrders: 0 }),
				...(settlementsBySeller.get(seller.id) ?? { commissionCents: 0, sellerPayableCents: 0, outstandingCents: 0 }),
				storeCount: seller.stores.length,
				activeStoreCount: seller.stores.filter((store) => store.status === 'ACTIVE').length,
				productCount: seller.stores.reduce((sum, store) => sum + store._count.products, 0),
				reviewCount,
				averageRating: weightedRating,
			},
		};
	});
	return {
		items,
		pagination: safePagination,
		summary: {
			sellerCount: total,
			activeStores: items.reduce((sum, seller) => sum + seller.metrics.activeStoreCount, 0),
			paidSalesCents: items.reduce((sum, seller) => sum + seller.metrics.paidSalesCents, 0),
			commissionCents: items.reduce((sum, seller) => sum + seller.metrics.commissionCents, 0),
		},
	};
}

export async function getAdminStoreProfile(storeId: string, options: StoreProfileOptions = {}) {
	await requireAdmin();
	const dateRange = parseSellerProfileDateRange({ from: options.from, to: options.to });
	const dates = dateWhere(dateRange);
	const store = await db.store.findUnique({
		where: { id: storeId },
		select: {
			id: true, name: true, description: true, url: true, status: true, featured: true, logo: true, cover: true,
			averageRating: true, numReviews: true, returnsAccepted: true, returnWindowDays: true, returnShippingFees: true,
			defaultShippingService: true, defaultDeliveryTimeMin: true, defaultDeliveryTimeMax: true, createdAt: true,
			user: { select: { id: true, name: true, email: true, picture: true, role: true, createdAt: true, paymentAccount: { select: { status: true, transfersCapability: true, detailsSubmitted: true, requirementsDueCount: true, lastCheckedAt: true } } } },
			_count: { select: { products: true, orderGroups: true, followers: true, coupons: true, returnRequests: true } },
		},
	});
	if (!store) return null;

	const settlementWhere: Prisma.SellerSettlementWhereInput = { orderGroup: { storeId } };
	const ledgerWhere: Prisma.SettlementLedgerEntryWhereInput = { settlement: settlementWhere };
	const paidOrderGroupWhere: Prisma.OrderGroupWhereInput = { storeId, order: { paymentStatus: PaymentStatus.Paid, ...(Object.keys(dates).length > 0 ? { createdAt: dates } : {}) } };
	const reviewWhere: Prisma.ReviewWhereInput = { product: { storeId }, ...(Object.keys(dates).length > 0 ? { createdAt: dates } : {}) };
	const settlementTotal = await db.sellerSettlement.count({ where: settlementWhere });
	const settlementPagination = pagination(settlementTotal, pageValue(options.ledgerPage), SETTLEMENT_PAGE_SIZE);
	const [ledgerRows, statusRows, settlements, paidOrderCount, paidSales, paidUnits, reviewStats, topProducts, recentOrders] = await Promise.all([
		db.settlementLedgerEntry.groupBy({ by: ['entryType'], where: ledgerWhere, _sum: { grossCents: true, discountCents: true, commissionCents: true, refundCents: true, reversalCents: true, sellerPayableCents: true } }),
		db.sellerSettlement.groupBy({ by: ['status'], where: settlementWhere, _sum: { sellerPayableCents: true, remainingPayableCents: true } }),
		db.sellerSettlement.findMany({
			where: settlementWhere, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (settlementPagination.page - 1) * SETTLEMENT_PAGE_SIZE, take: SETTLEMENT_PAGE_SIZE,
			select: { id: true, status: true, grossCents: true, commissionCents: true, sellerPayableCents: true, remainingPayableCents: true, failureReason: true, createdAt: true, orderGroup: { select: { id: true, total: true, packageStatus: true, createdAt: true } }, entries: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 5, select: { id: true, entryType: true, sellerPayableCents: true } } },
		}),
		db.orderGroup.count({ where: paidOrderGroupWhere }),
		db.orderGroup.aggregate({ where: paidOrderGroupWhere, _sum: { total: true } }),
		db.orderItem.aggregate({ where: { orderGroup: paidOrderGroupWhere }, _sum: { quantity: true } }),
		db.review.aggregate({ where: reviewWhere, _count: { _all: true }, _avg: { rating: true } }),
		db.orderItem.groupBy({ by: ['productId', 'name', 'productSlug', 'image'], where: { orderGroup: paidOrderGroupWhere }, _sum: { quantity: true, totalPrice: true }, orderBy: { _sum: { totalPrice: 'desc' } }, take: 10 }),
		db.orderGroup.findMany({ where: paidOrderGroupWhere, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 6, select: { id: true, total: true, packageStatus: true, createdAt: true, settlement: { select: { status: true, remainingPayableCents: true } } } }),
	]);
	const financials = summarizeSellerFinancials(ledgerRows, statusRows);
	const paidSalesCents = moneyFromOrderTotal(paidSales._sum.total);
	return {
		store,
		dateRange,
		financials,
		settlements,
		settlementPagination,
		performance: {
			paidOrders: paidOrderCount,
			unitsSold: paidUnits._sum.quantity ?? 0,
			netSalesCents: paidSalesCents,
			averageOrderValueCents: paidOrderCount > 0 ? Math.round(paidSalesCents / paidOrderCount) : 0,
			reviewCount: reviewStats._count._all,
			averageRating: reviewStats._avg.rating ?? 0,
			topProducts: topProducts.map((product) => ({ ...product, unitsSold: product._sum.quantity ?? 0, revenueCents: moneyFromOrderTotal(product._sum.totalPrice) })),
			recentOrders,
		},
	};
}

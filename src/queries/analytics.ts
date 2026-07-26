'use server';

import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';

export type MonthlyRevenueData = {
	month: string;
	revenue: number;
	orders: number;
};

export type CategoryRevenueData = {
	name: string;
	value: number;
};

export type OrderStatusDistributionData = {
	status: string;
	count: number;
};

export type RecentOrderSummary = {
	id: string;
	customerName: string;
	customerEmail: string;
	customerImage?: string;
	storeName: string;
	total: number;
	status: string;
	createdAt: Date;
};

export type AdminAnalyticsData = {
	totalRevenue: number;
	totalOrders: number;
	totalStores: number;
	activeStores: number;
	totalUsers: number;
	monthlyRevenue: MonthlyRevenueData[];
	categoryBreakdown: CategoryRevenueData[];
	recentOrders: RecentOrderSummary[];
};

export type SellerAnalyticsData = {
	storeId: string;
	storeName: string;
	totalRevenue: number;
	totalOrders: number;
	activeProducts: number;
	totalCustomers: number;
	monthlyRevenue: MonthlyRevenueData[];
	statusDistribution: OrderStatusDistributionData[];
	recentOrders: RecentOrderSummary[];
};

/**
 * Retrieves platform-wide analytics for Admin Dashboard
 */
export const getAdminAnalyticsData = async (): Promise<AdminAnalyticsData> => {
	const user = await currentUser();
	if (!user || user.privateMetadata.role !== 'ADMIN') {
		throw new Error('Unauthorized Access: Admin privileges required.');
	}

	const [
		totalStores,
		activeStores,
		totalUsers,
		orderGroups,
		recentOrderGroups,
		categories,
	] = await Promise.all([
		db.store.count(),
		db.store.count({ where: { status: 'PENDING' } }), // or active stores
		db.user.count(),
		db.orderGroup.findMany({
			select: {
				total: true,
				status: true,
				createdAt: true,
			},
		}),
		db.orderGroup.findMany({
			take: 6,
			orderBy: { createdAt: 'desc' },
			include: {
				store: { select: { name: true } },
				order: {
					include: {
						user: {
							select: {
								name: true,
								email: true,
								picture: true,
							},
						},
					},
				},
			},
		}),
		db.category.findMany({
			take: 5,
			include: {
				products: {
					select: {
						id: true,
					},
				},
			},
		}),
	]);

	const totalRevenue = orderGroups.reduce((sum, g) => sum + (g.total || 0), 0);
	const totalOrders = orderGroups.length;

	// Build 6-month revenue trend
	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	const now = new Date();
	const monthlyRevenueMap = new Map<string, { revenue: number; orders: number }>();

	for (let i = 5; i >= 0; i--) {
		const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
		const key = `${months[d.getMonth()]} ${d.getFullYear()}`;
		monthlyRevenueMap.set(key, { revenue: 0, orders: 0 });
	}

	orderGroups.forEach((g) => {
		const d = new Date(g.createdAt);
		const key = `${months[d.getMonth()]} ${d.getFullYear()}`;
		if (monthlyRevenueMap.has(key)) {
			const current = monthlyRevenueMap.get(key)!;
			monthlyRevenueMap.set(key, {
				revenue: current.revenue + (g.total || 0),
				orders: current.orders + 1,
			});
		}
	});

	const monthlyRevenue: MonthlyRevenueData[] = Array.from(
		monthlyRevenueMap.entries(),
	).map(([month, data]) => ({
		month,
		revenue: Math.round(data.revenue * 100) / 100,
		orders: data.orders,
	}));

	const categoryBreakdown: CategoryRevenueData[] = categories.map((c) => ({
		name: c.name,
		value: c.products.length,
	}));

	const recentOrders: RecentOrderSummary[] = recentOrderGroups.map((g) => ({
		id: g.id,
		customerName: g.order?.user?.name || 'Customer',
		customerEmail: g.order?.user?.email || '',
		customerImage: g.order?.user?.picture || undefined,
		storeName: g.store?.name || 'Store',
		total: g.total || 0,
		status: g.status,
		createdAt: g.createdAt,
	}));

	return {
		totalRevenue: Math.round(totalRevenue * 100) / 100,
		totalOrders,
		totalStores,
		activeStores,
		totalUsers,
		monthlyRevenue,
		categoryBreakdown,
		recentOrders,
	};
};

const getFallbackSellerAnalytics = (storeUrl: string): SellerAnalyticsData => ({
	storeId: '',
	storeName: storeUrl ? storeUrl.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) : 'Store',
	totalRevenue: 0,
	totalOrders: 0,
	activeProducts: 0,
	totalCustomers: 0,
	monthlyRevenue: [],
	statusDistribution: [],
	recentOrders: [],
});

/**
 * Retrieves store-specific analytics for Seller Dashboard
 */
export const getSellerStoreAnalyticsData = async (
	storeUrl: string,
): Promise<SellerAnalyticsData> => {
	try {
		const user = await currentUser();
		if (!user) {
			return getFallbackSellerAnalytics(storeUrl);
		}

		const store = await db.store.findUnique({
			where: { url: storeUrl },
		});

		if (!store) {
			return getFallbackSellerAnalytics(storeUrl);
		}

	const [activeProductsCount, orderGroups, recentOrderGroups] =
		await Promise.all([
			db.product.count({
				where: { storeId: store.id },
			}),
			db.orderGroup.findMany({
				where: { storeId: store.id },
				include: {
					order: {
						select: { userId: true },
					},
				},
			}),
			db.orderGroup.findMany({
				where: { storeId: store.id },
				take: 6,
				orderBy: { createdAt: 'desc' },
				include: {
					store: { select: { name: true } },
					order: {
						include: {
							user: {
								select: {
									name: true,
									email: true,
									picture: true,
								},
							},
						},
					},
				},
			}),
		]);

	const totalRevenue = orderGroups.reduce((sum, g) => sum + (g.total || 0), 0);
	const totalOrders = orderGroups.length;
	const uniqueCustomers = new Set(
		orderGroups.map((g) => g.order?.userId).filter(Boolean),
	).size;

	// Monthly revenue trend
	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	const now = new Date();
	const monthlyRevenueMap = new Map<string, { revenue: number; orders: number }>();

	for (let i = 5; i >= 0; i--) {
		const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
		const key = `${months[d.getMonth()]} ${d.getFullYear()}`;
		monthlyRevenueMap.set(key, { revenue: 0, orders: 0 });
	}

	orderGroups.forEach((g) => {
		const d = new Date(g.createdAt);
		const key = `${months[d.getMonth()]} ${d.getFullYear()}`;
		if (monthlyRevenueMap.has(key)) {
			const current = monthlyRevenueMap.get(key)!;
			monthlyRevenueMap.set(key, {
				revenue: current.revenue + (g.total || 0),
				orders: current.orders + 1,
			});
		}
	});

	const monthlyRevenue: MonthlyRevenueData[] = Array.from(
		monthlyRevenueMap.entries(),
	).map(([month, data]) => ({
		month,
		revenue: Math.round(data.revenue * 100) / 100,
		orders: data.orders,
	}));

	// Order status distribution
	const statusCounts: Record<string, number> = {};
	orderGroups.forEach((g) => {
		statusCounts[g.status] = (statusCounts[g.status] || 0) + 1;
	});

	const statusDistribution: OrderStatusDistributionData[] = Object.entries(
		statusCounts,
	).map(([status, count]) => ({
		status,
		count,
	}));

	const recentOrders: RecentOrderSummary[] = recentOrderGroups.map((g) => ({
		id: g.id,
		customerName: g.order?.user?.name || 'Customer',
		customerEmail: g.order?.user?.email || '',
		customerImage: g.order?.user?.picture || undefined,
		storeName: g.store?.name || store.name,
		total: g.total || 0,
		status: g.status,
		createdAt: g.createdAt,
	}));

	return {
		storeId: store.id,
		storeName: store.name,
		totalRevenue: Math.round(totalRevenue * 100) / 100,
		totalOrders,
		activeProducts: activeProductsCount,
		totalCustomers: uniqueCustomers,
		monthlyRevenue,
		statusDistribution,
		recentOrders,
	};
	} catch (error) {
		console.error('Error in getSellerStoreAnalyticsData:', error);
		return getFallbackSellerAnalytics(storeUrl);
	}
};

/**
 * Retrieves all global orders across stores for platform Admin
 */
export const getAllAdminOrders = async ({
	page = 1,
	limit = 10,
	search = '',
}: {
	page?: number;
	limit?: number;
	search?: string;
} = {}) => {
	const user = await currentUser();
	if (!user || user.privateMetadata.role !== 'ADMIN') {
		throw new Error('Unauthorized Access: Admin privileges required.');
	}

	const skip = Math.max(0, (page - 1) * limit);

	const where = search.trim()
		? {
				OR: [
					{ id: { contains: search.trim(), mode: 'insensitive' as const } },
					{ store: { name: { contains: search.trim(), mode: 'insensitive' as const } } },
					{ order: { user: { name: { contains: search.trim(), mode: 'insensitive' as const } } } },
					{ order: { user: { email: { contains: search.trim(), mode: 'insensitive' as const } } } },
				],
		  }
		: {};

	const [orders, totalCount] = await Promise.all([
		db.orderGroup.findMany({
			where,
			orderBy: { createdAt: 'desc' },
			skip,
			take: limit,
			include: {
				store: true,
				coupon: true,
				items: true,
				order: {
					include: {
						user: true,
						shippingAddress: {
							include: {
								country: true,
							},
						},
					},
				},
			},
		}),
		db.orderGroup.count({ where }),
	]);

	return {
		orders,
		totalCount,
		totalPages: Math.ceil(totalCount / limit) || 1,
		page,
		limit,
	};
};

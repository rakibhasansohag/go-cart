'use server';

import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import {
	OrderStatus,
	OrderTableDateFilter,
	OrderTableFilter,
	PaymentStatus,
	PaymentTableDateFilter,
	PaymentTableFilter,
	ReviewDateFilter,
	ReviewFilter,
} from '@/lib/types';
import { currentUser } from '@clerk/nextjs/server';
import { subMonths, subYears } from 'date-fns';
import { unstable_cache } from 'next/cache';
import { normalizeCommerceReference } from '@/lib/orders/references';

// Cached handler for getUserOrders
const fetchUserOrdersFromDb = unstable_cache(
	async (
		userId: string,
		filter: OrderTableFilter,
		period: OrderTableDateFilter,
		search: string,
		page: number,
		pageSize: number,
	) => {
		const skip = (page - 1) * pageSize;
		const whereClause: { AND: Prisma.OrderWhereInput[] } = {
			AND: [
				{
					userId,
				},
			],
		};

		if (filter === 'unpaid')
			whereClause.AND.push({ paymentStatus: PaymentStatus.Pending });
		if (filter === 'toShip')
			whereClause.AND.push({ orderStatus: OrderStatus.Processing });
		if (filter === 'shipped')
			whereClause.AND.push({ orderStatus: OrderStatus.Shipped });
		if (filter === 'delivered')
			whereClause.AND.push({
				orderStatus: { in: [OrderStatus.Delivered, OrderStatus.PickedUp] },
			});

		const now = new Date();
		if (period === 'last-6-months') {
			whereClause.AND.push({
				createdAt: { gte: subMonths(now, 6) },
			});
		}
		if (period === 'last-1-year')
			whereClause.AND.push({ createdAt: { gte: subYears(now, 1) } });
		if (period === 'last-2-years')
			whereClause.AND.push({ createdAt: { gte: subYears(now, 2) } });

		if (search.trim()) {
			const textSearch = search.trim();
			const referenceSearch = normalizeCommerceReference(textSearch);
			whereClause.AND.push({
				OR: [
					{
						id: {
							contains: referenceSearch,
							mode: 'insensitive',
						},
					},
					{
						groups: {
							some: {
								id: {
									contains: referenceSearch,
									mode: 'insensitive',
								},
							},
						},
					},
					{
						groups: {
							some: {
								store: {
									name: {
										contains: textSearch,
										mode: 'insensitive',
									},
								},
							},
						},
					},
					{
						groups: {
							some: {
								items: {
									some: {
										OR: [
											{
												name: {
													contains: textSearch,
													mode: 'insensitive',
												},
											},
											{
												sku: {
													contains: textSearch,
													mode: 'insensitive',
												},
											},
										],
									},
								},
							},
						},
					},
				],
			});
		}

		const orders = await db.order.findMany({
			where: whereClause,
			include: {
				groups: {
					include: {
						items: true,
						_count: {
							select: {
								items: true,
							},
						},
					},
				},
				shippingAddress: {
					include: {
						country: true,
					},
				},
			},
			take: pageSize,
			skip,
			orderBy: {
				updatedAt: 'desc',
			},
		});

		const totalCount = await db.order.count({ where: whereClause });
		const totalPages = Math.ceil(totalCount / pageSize);

		return {
			orders,
			totalPages,
			currentPage: page,
			pageSize,
			totalCount,
		};
	},
	['user-orders-cache-v2'],
	{ revalidate: 300, tags: ['user-orders'] }
);

export const getUserOrders = async (
	filter: OrderTableFilter = '',
	period: OrderTableDateFilter = '',
	search = '',
	page: number = 1,
	pageSize: number = 10,
) => {
	const user = await currentUser();
	if (!user) throw new Error('Unauthenticated.');
	return fetchUserOrdersFromDb(user.id, filter, period, search, page, pageSize);
};

// Cached handler for getUserPayments
const fetchUserPaymentsFromDb = unstable_cache(
	async (
		userId: string,
		filter: PaymentTableFilter,
		period: PaymentTableDateFilter,
		search: string,
		page: number,
		pageSize: number,
	) => {
		const skip = (page - 1) * pageSize;
		const whereClause: { AND: Prisma.PaymentWhereInput[] } = {
			AND: [
				{
					userId,
				},
			],
		};

		if (filter === 'paypal') whereClause.AND.push({ paymentMethod: 'Paypal' });
		if (filter === 'credit-card')
			whereClause.AND.push({ paymentMethod: 'Stripe' });

		const now = new Date();
		if (period === 'last-6-months') {
			whereClause.AND.push({
				createdAt: { gte: subMonths(now, 6) },
			});
		}
		if (period === 'last-1-year')
			whereClause.AND.push({ createdAt: { gte: subYears(now, 1) } });
		if (period === 'last-2-years')
			whereClause.AND.push({ createdAt: { gte: subYears(now, 2) } });

		if (search.trim()) {
			whereClause.AND.push({
				OR: [
					{
						id: { contains: search },
					},
					{
						paymentInetntId: { contains: search },
					},
				],
			});
		}

		const payments = await db.paymentDetails.findMany({
			where: whereClause,
			include: {
				order: true,
			},
			take: pageSize,
			skip,
			orderBy: {
				updatedAt: 'desc',
			},
		});

		const totalCount = await db.paymentDetails.count({ where: whereClause });
		const totalPages = Math.ceil(totalCount / pageSize);

		return {
			payments,
			totalPages,
			currentPage: page,
			pageSize,
			totalCount,
		};
	},
	['user-payments-cache'],
	{ revalidate: 300, tags: ['user-payments'] }
);

export const getUserPayments = async (
	filter: PaymentTableFilter = '',
	period: PaymentTableDateFilter = '',
	search = '',
	page: number = 1,
	pageSize: number = 10,
) => {
	const user = await currentUser();
	if (!user) throw new Error('Unauthenticated.');
	return fetchUserPaymentsFromDb(user.id, filter, period, search, page, pageSize);
};

// Cached handler for getUserReviews
const fetchUserReviewsFromDb = unstable_cache(
	async (
		userId: string,
		filter: ReviewFilter,
		period: ReviewDateFilter,
		search: string,
		page: number,
		pageSize: number,
	) => {
		const skip = (page - 1) * pageSize;
		const whereClause: { AND: Prisma.ReviewWhereInput[] } = {
			AND: [
				{
					userId,
				},
			],
		};

		if (filter) whereClause.AND.push({ rating: parseFloat(filter) });

		const now = new Date();
		if (period === 'last-6-months') {
			whereClause.AND.push({
				createdAt: { gte: subMonths(now, 6) },
			});
		}
		if (period === 'last-1-year')
			whereClause.AND.push({ createdAt: { gte: subYears(now, 1) } });
		if (period === 'last-2-years')
			whereClause.AND.push({ createdAt: { gte: subYears(now, 2) } });

		if (search.trim()) {
			whereClause.AND.push({
				review: { contains: search },
			});
		}

		const reviews = await db.review.findMany({
			where: whereClause,
			include: {
				images: true,
				user: true,
			},
			take: pageSize,
			skip,
			orderBy: {
				updatedAt: 'desc',
			},
		});

		const totalCount = await db.review.count({ where: whereClause });
		const totalPages = Math.ceil(totalCount / pageSize);

		return {
			reviews,
			totalPages,
			currentPage: page,
			pageSize,
			totalCount,
		};
	},
	['user-reviews-cache'],
	{ revalidate: 300, tags: ['user-reviews'] }
);

export const getUserReviews = async (
	filter: ReviewFilter = '',
	period: ReviewDateFilter = '',
	search = '',
	page: number = 1,
	pageSize: number = 10,
) => {
	const user = await currentUser();
	if (!user) throw new Error('Unauthenticated.');
	return fetchUserReviewsFromDb(user.id, filter, period, search, page, pageSize);
};

// Cached handler for getUserFollowedStores
const fetchUserFollowedStoresFromDb = unstable_cache(
	async (userId: string, page: number, pageSize: number) => {
		const skip = (page - 1) * pageSize;

		const followedStores = await db.store.findMany({
			where: {
				followers: {
					some: {
						id: userId,
					},
				},
			},
			select: {
				id: true,
				url: true,
				name: true,
				logo: true,
				followers: {
					select: {
						id: true,
					},
				},
			},
			take: pageSize,
			skip,
		});

		const totalCount = await db.store.count({
			where: {
				followers: {
					some: {
						id: userId,
					},
				},
			},
		});

		const totalPages = Math.ceil(totalCount / pageSize);

		const stores = followedStores.map((store) => ({
			id: store.id,
			url: store.url,
			name: store.name,
			logo: store.logo,
			followersCount: store.followers.length,
			isUserFollowingStore: true,
		}));

		return {
			stores,
			totalPages,
		};
	},
	['user-followed-stores-cache'],
	{ revalidate: 300, tags: ['user-followed-stores'] }
);

export const getUserFollowedStores = async (
	page: number = 1,
	pageSize: number = 10,
) => {
	const user = await currentUser();
	if (!user) throw new Error('Unauthenticated.');
	return fetchUserFollowedStoresFromDb(user.id, page, pageSize);
};

// Cached handler for getUserWishlist
const fetchUserWishlistFromDb = unstable_cache(
	async (userId: string, page: number, pageSize: number) => {
		const skip = (page - 1) * pageSize;

		const wishlist = await db.wishlist.findMany({
			where: {
				userId,
			},
			include: {
				product: {
					select: {
						id: true,
						slug: true,
						name: true,
						rating: true,
						sales: true,
						numReviews: true,
						variants: {
							select: {
								id: true,
								variantName: true,
								slug: true,
								images: true,
								sizes: true,
							},
						},
					},
				},
			},
			take: pageSize,
			skip,
		});

		const formattedWishlist = wishlist.map((item) => ({
			id: item.product.id,
			slug: item.product.slug,
			name: item.product.name,
			rating: item.product.rating,
			sales: item.product.sales,
			numReviews: item.product.numReviews,
			variants: [
				{
					variantId: item.product.variants[0].id,
					variantSlug: item.product.variants[0].slug,
					variantName: item.product.variants[0].variantName,
					images: item.product.variants[0].images,
					sizes: item.product.variants[0].sizes,
				},
			],
			variantImages: [],
		}));

		const totalCount = await db.wishlist.count({
			where: {
				userId,
			},
		});

		const totalPages = Math.ceil(totalCount / pageSize);

		return {
			wishlist: formattedWishlist,
			totalPages,
		};
	},
	['user-wishlist-cache'],
	{ revalidate: 300, tags: ['user-wishlist'] }
);

export const getUserWishlist = async (
	page: number = 1,
	pageSize: number = 10,
) => {
	const user = await currentUser();
	if (!user) throw new Error('Unauthenticated.');
	return fetchUserWishlistFromDb(user.id, page, pageSize);
};

'use server';

import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';

export async function getUserLoyaltyAccount(page = 1, pageSize = 10) {
	const { userId } = await auth();
	if (!userId) throw new Error('Unauthenticated.');

	const skip = (page - 1) * pageSize;

	const account = await db.loyaltyAccount.findUnique({
		where: { userId },
		include: {
			transactions: {
				orderBy: { createdAt: 'desc' },
				skip,
				take: pageSize,
				include: {
					order: {
						select: {
							id: true,
							total: true,
							coinDiscount: true,
						},
					},
				},
			},
			_count: {
				select: { transactions: true },
			},
		},
	});

	if (!account) {
		return {
			balance: 0,
			lifetimeEarned: 0,
			transactions: [],
			totalPages: 0,
			currentPage: page,
			totalCount: 0,
		};
	}

	const totalCount = account._count.transactions;
	const totalPages = Math.ceil(totalCount / pageSize);

	return {
		balance: account.balance,
		lifetimeEarned: account.lifetimeEarned,
		transactions: account.transactions.map((tx) => ({
			id: tx.id,
			orderId: tx.orderId,
			type: tx.type,
			points: tx.points,
			note: tx.note,
			createdAt: tx.createdAt.toISOString(),
			order: tx.order
				? {
						id: tx.order.id,
						total: tx.order.total,
						coinDiscount: tx.order.coinDiscount,
					}
				: null,
		})),
		totalPages,
		currentPage: page,
		totalCount,
	};
}

export type UserLoyaltyDataType = Awaited<ReturnType<typeof getUserLoyaltyAccount>>;

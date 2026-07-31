'use server';

import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { NotificationCategory, Prisma } from '@prisma/client';

export async function getNotifications({
	page = 1,
	limit = 10,
	unreadOnly = false,
	category,
}: {
	page?: number;
	limit?: number;
	unreadOnly?: boolean;
	category?: NotificationCategory;
} = {}) {
	const { userId } = await auth();
	if (!userId) throw new Error('Unauthenticated.');

	const safePage = Math.max(1, page);
	const safeLimit = Math.min(50, Math.max(1, limit));
	const where: Prisma.NotificationWhereInput = {
		recipientId: userId,
		...(unreadOnly ? { readAt: null } : {}),
		...(category ? { category } : {}),
	};

	const [notifications, totalCount, unreadCount] = await Promise.all([
		db.notification.findMany({
			where,
			orderBy: { createdAt: 'desc' },
			skip: (safePage - 1) * safeLimit,
			take: safeLimit,
		}),
		db.notification.count({ where }),
		db.notification.count({ where: { recipientId: userId, readAt: null } }),
	]);

	return {
		notifications,
		totalCount,
		unreadCount,
		page: safePage,
		limit: safeLimit,
		totalPages: Math.max(1, Math.ceil(totalCount / safeLimit)),
	};
}

export async function markNotificationRead(notificationId: string) {
	const { userId } = await auth();
	if (!userId) throw new Error('Unauthenticated.');

	return db.notification.updateMany({
		where: { id: notificationId, recipientId: userId, readAt: null },
		data: { readAt: new Date() },
	});
}

export async function markAllNotificationsRead() {
	const { userId } = await auth();
	if (!userId) throw new Error('Unauthenticated.');

	return db.notification.updateMany({
		where: { recipientId: userId, readAt: null },
		data: { readAt: new Date() },
	});
}

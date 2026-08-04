'use server';

import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { NotificationCategory, NotificationChannel, Prisma } from '@prisma/client';
import { z } from 'zod';

const preferenceInput = z.object({
	category: z.nativeEnum(NotificationCategory),
	channel: z.literal(NotificationChannel.EMAIL),
	enabled: z.boolean(),
});

const requiredEmailCategories = new Set<NotificationCategory>([
	NotificationCategory.PAYMENT,
	NotificationCategory.REFUND,
]);

function emptyNotificationPage(page: number, limit: number) {
	return {
		notifications: [],
		totalCount: 0,
		unreadCount: 0,
		page,
		limit,
		totalPages: 1,
	};
}

export async function getNotificationSummary() {
	const { userId } = await auth();
	if (!userId) return { unreadCount: 0 };

	return {
		unreadCount: await db.notification.count({
			where: { recipientId: userId, readAt: null },
		}),
	};
}

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
	const safePage = Math.max(1, page);
	const safeLimit = Math.min(50, Math.max(1, limit));
	// Header polling can overlap a Clerk sign-out/session switch. Returning an
	// empty, authorized projection avoids noisy 500s and never exposes data.
	if (!userId) return emptyNotificationPage(safePage, safeLimit);

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

export async function getNotificationPreferences() {
	const { userId } = await auth();
	if (!userId) return [];

	const rows = await db.notificationPreference.findMany({
		where: { userId },
		orderBy: [{ category: 'asc' }, { channel: 'asc' }],
	});
	return rows.map((row) => ({
		...row,
		// In-app notifications are always available for auditability. Critical
		// payment/refund email cannot be disabled by an optional preference.
		enabled: row.channel === NotificationChannel.IN_APP ||
			(requiredEmailCategories.has(row.category) ? true : row.enabled),
	}));
}

export async function updateNotificationEmailPreference(input: unknown) {
	const { userId } = await auth();
	if (!userId) throw new Error('Unauthenticated.');
	const parsed = preferenceInput.parse(input);
	if (requiredEmailCategories.has(parsed.category)) {
		throw new Error('Payment and refund emails are required for account safety.');
	}

	return db.notificationPreference.upsert({
		where: {
			userId_category_channel: {
				userId,
				category: parsed.category,
				channel: parsed.channel,
			},
		},
		update: { enabled: parsed.enabled },
		create: {
			userId,
			category: parsed.category,
			channel: parsed.channel,
			enabled: parsed.enabled,
		},
	});
}

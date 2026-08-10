import 'server-only';

import { db } from '@/lib/db';

function positiveEnv(name: string, fallback: number, max: number) {
	const value = Number(process.env[name]);
	return Number.isInteger(value) && value > 0 ? Math.min(value, max) : fallback;
}

export async function cleanupNotificationDeliveryData(input?: { retentionDays?: number; batchSize?: number }) {
	const retentionDays = input?.retentionDays ?? positiveEnv('NOTIFICATION_RETENTION_DAYS', 90, 3650);
	const batchSize = input?.batchSize ?? positiveEnv('NOTIFICATION_RETENTION_BATCH_SIZE', 500, 5_000);
	const before = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
	const [auditIds, notificationIds, outboxIds] = await Promise.all([
		db.notificationDeliveryAudit.findMany({ where: { createdAt: { lt: before } }, select: { id: true }, take: batchSize }),
		db.notification.findMany({ where: { createdAt: { lt: before }, readAt: { not: null } }, select: { id: true }, take: batchSize }),
		db.emailOutbox.findMany({ where: { createdAt: { lt: before }, status: { in: ['SENT', 'CANCELLED'] } }, select: { id: true }, take: batchSize }),
	]);
	const [audits, notifications, outbox] = await Promise.all([
		db.notificationDeliveryAudit.deleteMany({ where: { id: { in: auditIds.map((row) => row.id) } } }),
		db.notification.deleteMany({ where: { id: { in: notificationIds.map((row) => row.id) } } }),
		db.emailOutbox.deleteMany({ where: { id: { in: outboxIds.map((row) => row.id) } } }),
	]);
	return { retentionDays, before, audits: audits.count, notifications: notifications.count, outbox: outbox.count };
}

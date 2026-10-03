import { db } from '@/lib/db';
import { getQueueClient } from './client';
import { queuesEnabled, queueTransportAvailable } from './config';
import { QUEUE_TOPICS } from './topics';
import type { BackgroundJobKind } from '@prisma/client';
import { queueTransportFailure } from './transport-error';

export const jobTopics: Record<BackgroundJobKind, string> = {
	EMAIL: QUEUE_TOPICS.EMAIL_OUTBOX, NOTIFICATION: QUEUE_TOPICS.NOTIFICATION_FAN,
	INVENTORY: QUEUE_TOPICS.INVENTORY_EVENTS, PAYMENT: QUEUE_TOPICS.PAYMENT_EVENTS,
	CRON: QUEUE_TOPICS.CRON_JOBS,
	WORKFLOW: QUEUE_TOPICS.WORKFLOW_STEPS,
};

/** Reads only committed rows. Losing a send response never loses the database job. */
export async function relayBackgroundJobs(limit = 20) {
	if (!queuesEnabled() || !queueTransportAvailable()) return { published: 0, failed: 0, disabled: true };
	const now = new Date();
	const rows = await db.backgroundJob.findMany({
		where: { status: 'READY', nextAttemptAt: { lte: new Date(now.getTime() + 6 * 86_400_000) }, nextPublishAt: { lte: now } },
		orderBy: { nextAttemptAt: 'asc' }, take: Math.min(50, Math.max(1, limit)),
	});
	let published = 0;
	let failed = 0;
	for (const job of rows) {
		// Publishing lease bounds concurrent relay calls and uncertain send outcomes.
		const claimed = await db.backgroundJob.updateMany({
			where: { id: job.id, status: 'READY', nextPublishAt: { lte: now } },
			data: { nextPublishAt: new Date(now.getTime() + 5 * 60_000) },
		});
		if (claimed.count !== 1) continue;
		try {
			const delaySeconds = Math.max(0, Math.ceil((job.nextAttemptAt.getTime() - now.getTime()) / 1000));
			const { messageId } = await getQueueClient().send(jobTopics[job.kind], { jobId: job.id }, {
				idempotencyKey: `${job.id}:${job.replayCount}:${job.attempts}:${Math.floor(now.getTime() / 86_400_000)}`,
				delaySeconds, retentionSeconds: Math.min(604_800, delaySeconds + 86_400),
			});
			await db.backgroundJob.updateMany({ where: { id: job.id, status: 'READY' }, data: {
				messageId, publishedAt: now, nextPublishAt: new Date(now.getTime() + 60 * 60_000),
			} });
			published++;
		} catch (error) {
			// Never store provider credentials or raw provider error responses.
			const code = queueTransportFailure(error);
			console.error('[queue] relay failed', { jobId: job.id, kind: job.kind, code });
			await db.backgroundJob.updateMany({ where: { id: job.id, status: 'READY' }, data: {
				lastError: `Queue dispatch failed (${code}); the committed job will be relayed again.`,
				nextPublishAt: new Date(now.getTime() + 60_000),
			} });
			failed++;
		}
	}
	return { published, failed, disabled: false };
}

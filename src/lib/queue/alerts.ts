import { db } from '@/lib/db';

/** Dead-letter alerts are durable admin bell notifications, requiring no paid email provider. */
export async function alertDeadJobs() {
	const jobs = await db.backgroundJob.findMany({ where: { status: 'DEAD', alertedAt: null }, take: 20 });
	for (const job of jobs) {
		await db.$transaction(async tx => {
			const admins = await tx.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
			if (!admins.length) return;
			const event = await tx.domainEvent.upsert({
				where: { eventKey: `queue:dead:${job.id}:${job.updatedAt.toISOString()}` },
				update: { aggregateId: job.id },
				create: { eventKey: `queue:dead:${job.id}:${job.updatedAt.toISOString()}`, eventType: 'queue.dead_letter',
					aggregateType: 'BACKGROUND_JOB', aggregateId: job.id, payload: { kind: job.kind, attempts: job.attempts } },
			});
			for (const admin of admins) await tx.notification.upsert({
				where: { sourceEventId_recipientId: { sourceEventId: event.id, recipientId: admin.id } },
				update: { sourceEventId: event.id },
				create: { sourceEventId: event.id, recipientId: admin.id, eventType: 'queue.dead_letter', category: 'SYSTEM',
					title: 'Background job needs attention', message: `${job.kind} failed after ${job.attempts} attempts. Review and replay it after fixing the cause.`,
					actionUrl: '/dashboard/admin/background-jobs' },
			});
			await tx.backgroundJob.updateMany({ where: { id: job.id, status: 'DEAD', alertedAt: null }, data: { alertedAt: new Date() } });
		});
	}
}

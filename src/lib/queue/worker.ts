import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import type { BackgroundJob, BackgroundJobKind, Prisma } from '@prisma/client';
import { QUEUE_LEASE_MS, QUEUE_MAX_ATTEMPTS, queueRetryDelay } from './config';

export class DeferredJob extends Error {
	constructor(public readonly dueAt: Date) { super('Background job is not ready yet.'); }
}
export type JobHandler = (job: BackgroundJob, token: string) => Promise<void>;

/** Lease fences protect completion, and transactional handlers recheck the fence. */
export async function processBackgroundJob(jobId: string, kind: BackgroundJobKind, handler?: JobHandler) {
	const now = new Date();
	const token = randomUUID();
	const claimed = await db.backgroundJob.updateMany({
		where: { id: jobId, kind, attempts: { lt: QUEUE_MAX_ATTEMPTS }, nextAttemptAt: { lte: now }, OR: [
			{ status: 'READY' }, { status: 'PROCESSING', leaseUntil: { lte: now } },
		] },
		data: { status: 'PROCESSING', leaseToken: token, leaseUntil: new Date(now.getTime() + QUEUE_LEASE_MS),
			attempts: { increment: 1 }, startedAt: now, lastError: null },
	});
	if (claimed.count !== 1) {
		const existing = await db.backgroundJob.findUnique({ where: { id: jobId } });
		if (!existing || existing.kind !== kind) throw new Error('Unknown background job.');
		if (existing.status === 'DEAD') {
			await (await import('./alerts')).alertDeadJobs();
			return { skipped: true };
		}
		if (existing.status === 'SUCCEEDED') return { skipped: true };
		if (existing.status === 'PROCESSING' && existing.attempts >= QUEUE_MAX_ATTEMPTS && existing.leaseUntil && existing.leaseUntil <= now) {
			await recoverExpiredJobs();
			await (await import('./alerts')).alertDeadJobs();
			return { skipped: true };
		}
		throw new DeferredJob(existing.leaseUntil ?? existing.nextAttemptAt);
	}
	const job = await db.backgroundJob.findUniqueOrThrow({ where: { id: jobId } });
	try {
		const execute = handler ?? (await import('./handlers')).executeBackgroundJob;
		await execute(job, token);
		await db.backgroundJob.updateMany({ where: { id: job.id, status: 'PROCESSING', leaseToken: token }, data: {
			status: 'SUCCEEDED', completedAt: new Date(), leaseToken: null, leaseUntil: null, lastError: null,
		} });
		console.info('[queue] processed', { jobId, kind, durationMs: Date.now() - now.getTime() });
		return { skipped: false };
	} catch (error) {
		const deferred = error instanceof DeferredJob;
		const dead = !deferred && job.attempts >= QUEUE_MAX_ATTEMPTS;
		const dueAt = deferred ? error.dueAt : new Date(Date.now() + queueRetryDelay(job.attempts));
		await db.backgroundJob.updateMany({ where: { id: job.id, leaseToken: token, status: 'PROCESSING' }, data: {
			status: dead ? 'DEAD' : 'READY', leaseToken: null, leaseUntil: null,
			nextAttemptAt: dueAt, nextPublishAt: dueAt,
			...(deferred ? { attempts: { decrement: 1 } } : {}),
			lastError: deferred ? 'Waiting for a delivery prerequisite.' : 'Background processing failed; inspect the job and replay after resolving the cause.',
		} });
		if (dead) {
			const { alertDeadJobs } = await import('./alerts');
			await alertDeadJobs();
			return { skipped: false, dead: true };
		}
		throw error;
	}
}

export async function withJobTransaction(job: BackgroundJob, token: string, effect: (tx: Prisma.TransactionClient) => Promise<void>) {
	await db.$transaction(async tx => {
		const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "BackgroundJob" WHERE id = ${job.id} AND "leaseToken" = ${token} AND status = 'PROCESSING' FOR UPDATE`;
		if (!rows.length) throw new Error('Background job lease was replaced.');
		await effect(tx);
		await tx.backgroundJob.update({ where: { id: job.id }, data: {
			status: 'SUCCEEDED', completedAt: new Date(), leaseToken: null, leaseUntil: null,
		} });
	}, { maxWait: 10_000, timeout: 30_000 });
}

export async function recoverExpiredJobs() {
	const now = new Date();
	await db.backgroundJob.updateMany({ where: { status: 'PROCESSING', leaseUntil: { lte: now }, attempts: { lt: QUEUE_MAX_ATTEMPTS } }, data: {
		status: 'READY', leaseToken: null, leaseUntil: null, nextAttemptAt: now, nextPublishAt: now,
	} });
	await db.backgroundJob.updateMany({ where: { status: 'PROCESSING', leaseUntil: { lte: now }, attempts: { gte: QUEUE_MAX_ATTEMPTS } }, data: {
		status: 'DEAD', leaseToken: null, leaseUntil: null, lastError: 'Worker lease expired at the attempt limit.',
	} });
}

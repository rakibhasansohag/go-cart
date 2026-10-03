'use server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { queuesEnabled, queueTransportAvailable } from '@/lib/queue/config';
import { scheduleBackgroundJobs } from '@/lib/queue/schedule';
import { recoverExpiredJobs } from '@/lib/queue/worker';
import { alertDeadJobs } from '@/lib/queue/alerts';

async function requireAdmin() {
	const { userId } = await auth();
	if (!userId) throw new Error('Unauthenticated.');
	const actor = await db.user.findUnique({ where: { id: userId }, select: { role: true, accountStatus: true } });
	if (actor?.role !== 'ADMIN' || actor.accountStatus === 'SUSPENDED') throw new Error('Admin privileges required.');
}

export async function getBackgroundJobHealth() {
	await requireAdmin();
	const [counts, jobs, oldest] = await Promise.all([
		db.backgroundJob.groupBy({ by: ['status'], _count: { _all: true } }),
		db.backgroundJob.findMany({ orderBy: { createdAt: 'desc' }, take: 50,
			select: { id: true, kind: true, status: true, attempts: true, lastError: true, nextAttemptAt: true, createdAt: true, startedAt: true, completedAt: true } }),
		db.backgroundJob.findFirst({ where: { status: { in: ['READY', 'PROCESSING'] } }, orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
	]);
	return { enabled: queuesEnabled(), transportAvailable: queueTransportAvailable(), counts, jobs,
		oldestPendingAgeSeconds: oldest ? Math.floor((Date.now() - oldest.createdAt.getTime()) / 1000) : 0 };
}

export async function replayBackgroundJob(form: FormData): Promise<void> {
	await requireAdmin();
	const jobId = z.string().uuid().parse(form.get('jobId'));
	const now = new Date();
	// A processing lease must expire before replay. Never replay succeeded work automatically.
	await db.backgroundJob.updateMany({ where: { id: jobId, status: { in: ['DEAD', 'READY'] } }, data: {
		status: 'READY', attempts: 0, replayCount: { increment: 1 }, nextAttemptAt: now, nextPublishAt: now,
		leaseToken: null, leaseUntil: null, lastError: null, alertedAt: null, completedAt: null,
	} });
	scheduleBackgroundJobs();
	revalidatePath('/dashboard/admin/background-jobs');
}

export async function recoverBackgroundJobs(): Promise<void> {
	await requireAdmin();
	await recoverExpiredJobs();
	await alertDeadJobs();
	scheduleBackgroundJobs();
	revalidatePath('/dashboard/admin/background-jobs');
}

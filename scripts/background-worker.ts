import { db } from '../src/lib/db';
import { queuesEnabled } from '../src/lib/queue/config';
import { DeferredJob, processBackgroundJob, recoverExpiredJobs } from '../src/lib/queue/worker';
import { alertDeadJobs } from '../src/lib/queue/alerts';

if (!queuesEnabled()) throw new Error('Set PHASE26_ENABLED=true before running the worker.');
try {
	await recoverExpiredJobs();
	const jobs = await db.backgroundJob.findMany({ where: { status: 'READY', nextAttemptAt: { lte: new Date() } }, take: 25, orderBy: { nextAttemptAt: 'asc' } });
	let succeeded = 0; let failed = 0; let deferred = 0;
	for (const job of jobs) {
		try { const result = await processBackgroundJob(job.id, job.kind); if (result.dead) failed++; else succeeded++; }
		catch (error) { if (error instanceof DeferredJob) deferred++; else failed++; }
	}
	await alertDeadJobs();
	console.log({ examined: jobs.length, succeeded, failed, deferred });
	if (failed) process.exitCode = 1;
} finally { await db.$disconnect(); }

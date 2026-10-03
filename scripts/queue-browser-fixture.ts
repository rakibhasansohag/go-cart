import assert from 'node:assert/strict';
import { db } from '../src/lib/db';
import { alertDeadJobs } from '../src/lib/queue/alerts';

const target = new URL(process.env.DATABASE_URL ?? '');
assert(['localhost', '127.0.0.1'].includes(target.hostname) && target.pathname === '/gocart_e2e');
const eventKey = 'phase26:browser:replay-fixture';
try {
	if (process.argv[2] === 'cleanup') {
		const job = await db.backgroundJob.findUnique({ where: { eventKey } });
		if (job) {
			await db.domainEvent.deleteMany({ where: { aggregateId: job.id, eventType: 'queue.dead_letter' } });
			await db.backgroundJob.delete({ where: { id: job.id } });
		}
		console.log('Browser replay fixture removed.');
	} else {
		const data = { status: 'DEAD', attempts: 8, alertedAt: null, leaseUntil: null, leaseToken: null,
			kind: 'PAYMENT', payload: { provider: 'Stripe', event: { id: 'phase26-browser-ignored-event', type: 'unhandled.integration.event', data: { object: {} } } },
			lastError: 'Controlled local replay fixture; no payment provider is called.' } as const;
		const job = await db.backgroundJob.upsert({ where: { eventKey }, update: data, create: { eventKey, ...data } });
		await alertDeadJobs();
		console.log({ jobId: job.id, state: job.status });
	}
} finally { await db.$disconnect(); }

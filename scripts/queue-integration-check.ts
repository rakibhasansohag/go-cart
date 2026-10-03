import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { db } from '../src/lib/db';
import { enqueueBackgroundJob } from '../src/lib/queue/jobs';
import { processBackgroundJob, recoverExpiredJobs, withJobTransaction } from '../src/lib/queue/worker';
import { publishDomainEvent, DOMAIN_EVENT_TYPES } from '../src/lib/notifications/domain-events';
import { scheduleWorkflowStep } from '../src/lib/queue/workflow-steps';
import { alertDeadJobs } from '../src/lib/queue/alerts';

const url = new URL(process.env.DATABASE_URL ?? '');
assert(['localhost', '127.0.0.1'].includes(url.hostname) && url.pathname === '/gocart_e2e', 'This check requires the isolated local E2E database.');
assert.equal(process.env.EMAIL_NOTIFICATIONS_ENABLED, 'false');
assert.equal(process.env.PHASE26_ENABLED, 'true');
const prefix = `queue-check:${randomUUID()}`;
const jobIds: string[] = [];
const admin = await db.user.create({ data: { name: 'Queue integration admin', email: `${randomUUID()}@example.invalid`, picture: '', role: 'ADMIN' } });
const create = async (key: string) => {
	const job = await enqueueBackgroundJob(db, { eventKey: `${prefix}:${key}`, kind: 'NOTIFICATION', payload: {} });
	jobIds.push(job.id); return job;
};
try {
	const rollbackKey = `${prefix}:rollback`;
	await assert.rejects(db.$transaction(async tx => {
		await publishDomainEvent(tx, { eventKey: rollbackKey, eventType: DOMAIN_EVENT_TYPES.CHECKOUT_ABANDONED,
			aggregateType: 'CART', aggregateId: prefix, payload: { cartId: prefix } });
		throw new Error('Intentional rollback');
	}));
	assert.equal(await db.domainEvent.count({ where: { eventKey: rollbackKey } }), 0);
	assert.equal(await db.backgroundJob.count({ where: { payload: { path: ['eventKey'], equals: rollbackKey } } }), 0);
	console.log('PASS: event and job roll back together');

	const job = await create('race');
	assert.equal((await create('race')).id, job.id);
	let executions = 0;
	const effect = async (row: typeof job, token: string) => {
		await withJobTransaction(row, token, async tx => {
			executions++;
			await tx.domainEvent.create({ data: { eventKey: `${prefix}:effect`, eventType: 'queue.integration', aggregateType: 'BACKGROUND_JOB', aggregateId: row.id, payload: {} } });
		});
	};
	await Promise.allSettled([processBackgroundJob(job.id, job.kind, effect), processBackgroundJob(job.id, job.kind, effect)]);
	assert.equal(executions, 1);
	assert.equal((await db.backgroundJob.findUniqueOrThrow({ where: { id: job.id } })).status, 'SUCCEEDED');
	assert.equal(await db.domainEvent.count({ where: { eventKey: `${prefix}:effect` } }), 1);
	await processBackgroundJob(job.id, job.kind, effect);
	assert.equal(executions, 1);
	console.log('PASS: duplicate enqueue, racing workers and redelivery produce one committed effect');

	const retry = await create('retry');
	await assert.rejects(processBackgroundJob(retry.id, retry.kind, async () => { throw new Error('private-provider-secret'); }));
	const failed = await db.backgroundJob.findUniqueOrThrow({ where: { id: retry.id } });
	assert.equal(failed.status, 'READY'); assert.equal(failed.attempts, 1);
	assert(failed.nextAttemptAt > new Date()); assert(!failed.lastError?.includes('private-provider-secret'));
	await db.backgroundJob.update({ where: { id: retry.id }, data: { nextAttemptAt: new Date(0) } });
	await processBackgroundJob(retry.id, retry.kind, async () => {});
	assert.equal((await db.backgroundJob.findUniqueOrThrow({ where: { id: retry.id } })).status, 'SUCCEEDED');
	console.log('PASS: durable backoff and successful retry');

	const stale = await create('stale');
	await db.backgroundJob.update({ where: { id: stale.id }, data: { status: 'PROCESSING', leaseToken: 'replacement', leaseUntil: new Date(Date.now() + 300_000) } });
	await assert.rejects(withJobTransaction(stale, 'expired-token', async tx => {
		await tx.domainEvent.create({ data: { eventKey: `${prefix}:stale-effect`, eventType: 'queue.integration', aggregateType: 'BACKGROUND_JOB', aggregateId: stale.id, payload: {} } });
	}));
	assert.equal(await db.domainEvent.count({ where: { eventKey: `${prefix}:stale-effect` } }), 0);
	await db.backgroundJob.update({ where: { id: stale.id }, data: { leaseUntil: new Date(0), attempts: 8 } });
	await recoverExpiredJobs();
	assert.equal((await db.backgroundJob.findUniqueOrThrow({ where: { id: stale.id } })).status, 'DEAD');
	console.log('PASS: stale worker is fenced; exhausted expired lease is dead-lettered');
	await alertDeadJobs(); await alertDeadJobs();
	assert.equal(await db.notification.count({ where: { recipientId: admin.id, sourceEvent: { aggregateId: stale.id, eventType: 'queue.dead_letter' } } }), 1);
	await db.backgroundJob.update({ where: { id: stale.id }, data: { status: 'READY', attempts: 0, replayCount: { increment: 1 }, nextAttemptAt: new Date(0), alertedAt: null } });
	await processBackgroundJob(stale.id, stale.kind, async () => {});
	assert.equal((await db.backgroundJob.findUniqueOrThrow({ where: { id: stale.id } })).replayCount, 1);
	console.log('PASS: one durable admin failure alert and successful replay');

	const eventKey = `${prefix}:inventory`;
	const size = await db.size.findFirstOrThrow({ include: { productVariant: { include: { product: { include: { store: true } } } } } });
	const product = size.productVariant.product;
	const event = await publishDomainEvent(db, { eventKey, eventType: DOMAIN_EVENT_TYPES.INVENTORY_LOW_STOCK, aggregateType: 'INVENTORY_SKU', aggregateId: size.id, storeId: product.storeId,
		payload: { storeId: product.storeId, storeUrl: product.store.url, productId: product.id, productName: product.name, productSlug: product.slug,
			variantId: size.productVariantId, variantName: size.productVariant.variantName, sizeId: size.id, size: size.size, previousQuantity: 2, currentQuantity: 0, threshold: 1 } });
	const inventoryJob = await db.backgroundJob.findUniqueOrThrow({ where: { eventKey: `domain:${event.id}` } });
	jobIds.push(inventoryJob.id);
	assert.equal(await db.notification.count({ where: { sourceEventId: event.id } }), 0);
	await processBackgroundJob(inventoryJob.id, 'INVENTORY');
	const count = await db.notification.count({ where: { sourceEventId: event.id } });
	assert(count > 0);
	await processBackgroundJob(inventoryJob.id, 'INVENTORY');
	assert.equal(await db.notification.count({ where: { sourceEventId: event.id } }), count);
	console.log('PASS: actual inventory handler creates durable notifications once');

	const step = await scheduleWorkflowStep(db, 'RETURN_DEADLINE', `${prefix}:missing-return`, new Date(0), new Date(0));
	assert(step); jobIds.push(step.id);
	await processBackgroundJob(step.id, 'WORKFLOW');
	assert.equal((await db.backgroundJob.findUniqueOrThrow({ where: { id: step.id } })).status, 'SUCCEEDED');
	console.log('PASS: deleted workflow target is a safe no-op');

	const payment = await enqueueBackgroundJob(db, { eventKey: `${prefix}:payment`, kind: 'PAYMENT', payload: { provider: 'Stripe', event: { id: prefix, type: 'unhandled.integration.event', data: { object: {} } } } });
	jobIds.push(payment.id);
	await processBackgroundJob(payment.id, 'PAYMENT');
	assert.equal((await db.backgroundJob.findUniqueOrThrow({ where: { id: payment.id } })).status, 'SUCCEEDED');
	console.log('PASS: payment consumer processes ignored provider events');
} finally {
	// Only this run's rows and their fan-out records are removed.
	const events = await db.domainEvent.findMany({ where: { OR: [{ eventKey: { startsWith: prefix } }, { eventKey: { startsWith: 'queue:dead:' }, aggregateId: { in: jobIds } }] }, select: { id: true } });
	await db.backgroundJob.deleteMany({ where: { OR: [{ eventKey: { startsWith: prefix } }, { id: { in: jobIds } }, { eventKey: { contains: prefix } }] } });
	const outbox = await db.emailOutbox.findMany({ where: { sourceEventId: { in: events.map(row => row.id) } }, select: { id: true } });
	await db.backgroundJob.deleteMany({ where: { eventKey: { in: outbox.map(row => `email:${row.id}`) } } });
	await db.domainEvent.deleteMany({ where: { id: { in: events.map(row => row.id) } } });
	await db.user.delete({ where: { id: admin.id } });
	await db.$disconnect();
}

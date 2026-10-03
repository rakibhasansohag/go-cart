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
const fixtureEntityIds: string[] = [];
let fixtureOrderId: string | undefined;
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
	const inventoryNotice = await db.notification.findFirstOrThrow({ where: { sourceEventId: event.id } });
	assert(inventoryNotice.message.includes('Only 0 unit(s)'));
	assert(inventoryNotice.message.includes('Threshold is 1'));
	await processBackgroundJob(inventoryJob.id, 'INVENTORY');
	assert.equal(await db.notification.count({ where: { sourceEventId: event.id } }), count);
	console.log('PASS: actual inventory handler creates durable notifications once');

	// Exercise real due-time handlers, with disposable entities in this isolated database.
	process.env.ABANDONED_CHECKOUT_EMAIL_ENABLED = 'true';
	process.env.DEMO_FULFILLMENT_AUTOMATION_ENABLED = 'true';
	const checkpoint = new Date(Date.now() - 86_400_000);
	const cart = await db.cart.create({ data: { userId: admin.id, subTotal: 10, total: 10, updatedAt: checkpoint,
		cartItems: { create: { productId: product.id, variantId: size.productVariantId, sizeId: size.id,
			productSlug: product.slug, variantSlug: 'queue-check', sku: 'QUEUE-CHECK', name: product.name,
			image: '', size: size.size, price: 10, quantity: 1, totalPrice: 10, storeId: product.storeId } } } });
	fixtureEntityIds.push(cart.id);
	const reminder = await scheduleWorkflowStep(db, 'ABANDONED_CHECKOUT', cart.id, checkpoint, checkpoint);
	assert(reminder); jobIds.push(reminder.id);
	await processBackgroundJob(reminder.id, 'WORKFLOW');
	const reminderEvent = await db.domainEvent.findUniqueOrThrow({ where: { eventKey: `checkout:abandoned:${cart.id}:${checkpoint.toISOString()}` } });
	assert.equal(reminderEvent.eventType, 'checkout.abandoned');
	const staleReminder = await scheduleWorkflowStep(db, 'ABANDONED_CHECKOUT', cart.id, new Date(0), new Date(0));
	assert(staleReminder); jobIds.push(staleReminder.id);
	await processBackgroundJob(staleReminder.id, 'WORKFLOW');
	assert.equal(await db.domainEvent.count({ where: { aggregateId: cart.id } }), 1);
	console.log('PASS: due cart reminder emits once; changed cart checkpoint is ignored');

	const sourceOrder = await db.order.findFirstOrThrow();
	const order = await db.order.create({ data: { userId: admin.id, shippingAddressId: sourceOrder.shippingAddressId,
		shippingFees: 0, subTotal: 10, total: 10, paymentStatus: 'Paid' } });
	fixtureOrderId = order.id; fixtureEntityIds.push(order.id);
	const group = await db.orderGroup.create({ data: { orderId: order.id, storeId: product.storeId,
		shippingService: 'Integration', shippingDeliveryMin: 1, shippingDeliveryMax: 2,
		shippingFees: 0, subTotal: 10, total: 10, automationMode: 'DEMO', nextTransitionAt: checkpoint } });
	fixtureEntityIds.push(group.id);
	const fulfillment = await scheduleWorkflowStep(db, 'DEMO_FULFILLMENT', group.id, checkpoint, checkpoint);
	assert(fulfillment); jobIds.push(fulfillment.id);
	await processBackgroundJob(fulfillment.id, 'WORKFLOW');
	const advanced = await db.orderGroup.findUniqueOrThrow({ where: { id: group.id } });
	assert.notEqual(advanced.packageStatus, 'PENDING'); assert(advanced.nextTransitionAt && advanced.nextTransitionAt > new Date());
	const transitions = await db.fulfillmentTransition.count({ where: { orderGroupId: group.id } });
	await processBackgroundJob(fulfillment.id, 'WORKFLOW');
	assert.equal(await db.fulfillmentTransition.count({ where: { orderGroupId: group.id } }), transitions);
	console.log('PASS: due demo fulfillment advances once and schedules its next checkpoint');

	const request = await db.returnRequest.create({ data: { customerId: admin.id, orderId: order.id,
		orderGroupId: group.id, storeId: product.storeId, reason: 'OTHER', resolution: 'REFUND',
		requestedAmount: 10, respondBy: checkpoint } });
	fixtureEntityIds.push(request.id);
	const deadline = await scheduleWorkflowStep(db, 'RETURN_DEADLINE', request.id, checkpoint, checkpoint);
	assert(deadline); jobIds.push(deadline.id);
	await processBackgroundJob(deadline.id, 'WORKFLOW');
	assert.equal(await db.domainEvent.count({ where: { eventType: 'return.deadline_due', aggregateId: request.id } }), 1);
	const deadlineEvent = await db.domainEvent.findFirstOrThrow({ where: { eventType: 'return.deadline_due', aggregateId: request.id } });
	const deadlineNoticeJob = await db.backgroundJob.findUniqueOrThrow({ where: { eventKey: `domain:${deadlineEvent.id}` } });
	jobIds.push(deadlineNoticeJob.id); await processBackgroundJob(deadlineNoticeJob.id, 'NOTIFICATION');
	const adminDeadlineNotice = await db.notification.findUniqueOrThrow({ where: { sourceEventId_recipientId: { sourceEventId: deadlineEvent.id, recipientId: admin.id } } });
	assert.equal(adminDeadlineNotice.actionUrl, '/dashboard/admin/returns');
	assert.equal((await db.returnRequest.findUniqueOrThrow({ where: { id: request.id } })).status, 'REQUESTED');
	assert.equal(await db.refundTransaction.count({ where: { returnRequestId: request.id } }), 0);
	console.log('PASS: due return deadline requests review without approving a refund');

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
	const events = await db.domainEvent.findMany({ where: { OR: [{ aggregateId: { in: fixtureEntityIds } }, { eventKey: { startsWith: prefix } }, { eventKey: { startsWith: 'queue:dead:' }, aggregateId: { in: jobIds } }] }, select: { id: true } });
	await db.backgroundJob.deleteMany({ where: { OR: [{ eventKey: { startsWith: prefix } }, { id: { in: jobIds } }, { eventKey: { contains: prefix } }] } });
	const outbox = await db.emailOutbox.findMany({ where: { sourceEventId: { in: events.map(row => row.id) } }, select: { id: true } });
	await db.backgroundJob.deleteMany({ where: { eventKey: { in: outbox.map(row => `email:${row.id}`) } } });
	await db.backgroundJob.deleteMany({ where: { OR: [{ eventKey: { in: events.map(row => `domain:${row.id}`) } }, ...fixtureEntityIds.map(id => ({ eventKey: { contains: `:${id}:` } }))] } });
	await db.domainEvent.deleteMany({ where: { id: { in: events.map(row => row.id) } } });
	if (fixtureOrderId) {
		await db.returnRequest.deleteMany({ where: { orderId: fixtureOrderId } });
		await db.fulfillmentTransition.deleteMany({ where: { orderId: fixtureOrderId } });
		await db.orderGroup.deleteMany({ where: { orderId: fixtureOrderId } });
		await db.order.delete({ where: { id: fixtureOrderId } });
	}
	await db.user.delete({ where: { id: admin.id } });
	await db.$disconnect();
}

import { z } from 'zod';
import type { BackgroundJob, Prisma, PrismaClient } from '@prisma/client';
import { db } from '@/lib/db';
import { enqueueBackgroundJob } from './jobs';
import { queuesEnabled } from './config';
import { withJobTransaction } from './worker';
import { abandonedCheckoutEnabled, abandonedCheckoutDelayHours, abandonedCheckoutEventKey } from '@/lib/cart/abandoned-checkout';
import { DOMAIN_EVENT_TYPES, publishDomainEvent } from '@/lib/notifications/domain-events';

const workflowPayload = z.object({ name: z.enum(['ABANDONED_CHECKOUT', 'DEMO_FULFILLMENT', 'RETURN_DEADLINE']), entityId: z.string().min(1), checkpoint: z.string().min(1) });

export async function scheduleWorkflowStep(tx: Prisma.TransactionClient | PrismaClient,
	name: z.infer<typeof workflowPayload>['name'], entityId: string, checkpoint: Date, dueAt: Date) {
	if (!queuesEnabled()) return;
	return enqueueBackgroundJob(tx, { eventKey: `workflow:${name}:${entityId}:${checkpoint.toISOString()}`,
		kind: 'WORKFLOW', dueAt, payload: { name, entityId, checkpoint: checkpoint.toISOString() } });
}

export async function scheduleCartReminder(tx: Prisma.TransactionClient | PrismaClient, cart: { id: string; updatedAt: Date }) {
	if (!abandonedCheckoutEnabled()) return;
	await scheduleWorkflowStep(tx, 'ABANDONED_CHECKOUT', cart.id, cart.updatedAt,
		new Date(cart.updatedAt.getTime() + abandonedCheckoutDelayHours() * 60 * 60_000));
}

/** Delayed jobs re-read authoritative state instead of sleeping in a serverless request. */
export async function executeWorkflowStep(job: BackgroundJob, token: string) {
	const { name, entityId, checkpoint } = workflowPayload.parse(job.payload);
	if (name === 'DEMO_FULFILLMENT') {
		const { runDemoFulfillmentStep } = await import('@/lib/orders/demo-automation');
		await runDemoFulfillmentStep(entityId, new Date(checkpoint)); return;
	}
	await withJobTransaction(job, token, async tx => {
		if (name === 'ABANDONED_CHECKOUT') {
			if (!abandonedCheckoutEnabled()) return;
			const cart = await tx.cart.findUnique({ where: { id: entityId }, include: { coupon: true, cartItems: { include: { store: { select: { name: true } } } } } });
			if (!cart || !cart.cartItems.length || cart.updatedAt.toISOString() !== checkpoint) return;
			await publishDomainEvent(tx, {
				eventKey: abandonedCheckoutEventKey(cart.id, cart.updatedAt), eventType: DOMAIN_EVENT_TYPES.CHECKOUT_ABANDONED,
				aggregateType: 'CART', aggregateId: cart.id,
				payload: { cartId: cart.id, nextStatus: 'Saved cart', subTotal: cart.subTotal, shippingFees: cart.shippingFees,
					discountAmount: Math.max(0, cart.subTotal + cart.shippingFees - cart.total), couponCode: cart.coupon?.code ?? '',
					total: cart.total, currency: 'USD', itemCount: cart.cartItems.reduce((sum, item) => sum + item.quantity, 0),
					items: cart.cartItems.map(item => ({ name: item.name, image: item.image, sku: item.sku, size: item.size,
						quantity: item.quantity, unitPrice: item.price, totalPrice: item.totalPrice, storeName: item.store.name })), actionUrl: '/cart' },
			}); return;
		}
		const request = await tx.returnRequest.findUnique({ where: { id: entityId }, include: { store: { select: { name: true, url: true } } } });
		if (!request || request.status !== 'REQUESTED' || request.respondBy?.toISOString() !== checkpoint) return;
		await publishDomainEvent(tx, {
			eventKey: `return:deadline:${request.id}:${checkpoint}`, eventType: DOMAIN_EVENT_TYPES.RETURN_DEADLINE_DUE,
			aggregateType: 'RETURN_REQUEST', aggregateId: request.id, orderId: request.orderId, storeId: request.storeId,
			payload: { returnRequestId: request.id, deadlineAt: checkpoint, orderId: request.orderId, orderGroupId: request.orderGroupId,
				storeUrl: request.store.url, storeName: request.store.name, nextStatus: request.status,
				message: 'The seller response deadline has arrived. Review this return request.', total: request.requestedAmount, currency: request.currency },
		});
	});
}

const recoveryPageSize = 100;

/** Stable keyset pages avoid repeatedly recovering only the first 100 entities. */
async function recoverPages<T extends { id: string }>(read: (after?: string) => Promise<T[]>, schedule: (row: T) => Promise<unknown>) {
	let after: string | undefined;
	let scanned = 0;
	for (;;) {
		const rows = await read(after);
		for (const row of rows) await schedule(row);
		scanned += rows.length;
		if (rows.length < recoveryPageSize) return scanned;
		after = rows[rows.length - 1].id;
	}
}

export async function recoverWorkflowSteps() {
	if (!queuesEnabled()) return { carts: 0, groups: 0, returns: 0 };
	const [carts, groups, returns] = await Promise.all([
		abandonedCheckoutEnabled() ? recoverPages(after => db.cart.findMany({
			where: { cartItems: { some: {} }, ...(after ? { id: { gt: after } } : {}) },
			select: { id: true, updatedAt: true }, take: recoveryPageSize, orderBy: { id: 'asc' },
		}), cart => scheduleCartReminder(db, cart)) : Promise.resolve(0),
		recoverPages(after => db.orderGroup.findMany({
			where: { automationMode: 'DEMO', automationPaused: false, nextTransitionAt: { not: null }, order: { paymentStatus: 'Paid' }, ...(after ? { id: { gt: after } } : {}) },
			select: { id: true, nextTransitionAt: true }, take: recoveryPageSize, orderBy: { id: 'asc' },
		}), group => group.nextTransitionAt ? scheduleWorkflowStep(db, 'DEMO_FULFILLMENT', group.id, group.nextTransitionAt, group.nextTransitionAt) : Promise.resolve()),
		recoverPages(after => db.returnRequest.findMany({
			where: { status: 'REQUESTED', respondBy: { not: null }, ...(after ? { id: { gt: after } } : {}) },
			select: { id: true, respondBy: true }, take: recoveryPageSize, orderBy: { id: 'asc' },
		}), request => request.respondBy ? scheduleWorkflowStep(db, 'RETURN_DEADLINE', request.id, request.respondBy, request.respondBy) : Promise.resolve()),
	]);
	return { carts, groups, returns };
}

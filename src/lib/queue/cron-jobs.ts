import { z } from 'zod';
import { db } from '@/lib/db';
import { enqueueBackgroundJob } from './jobs';
import { dispatchEmailOutboxBatch } from '@/lib/email/outbox';
import { enqueueAbandonedCheckoutReminders } from '@/lib/cart/abandoned-checkout';
import { cleanupNotificationDeliveryData } from '@/lib/notifications/retention';
import { createWeeklyPayoutReview } from '@/lib/settlement/payout-review';
import { DOMAIN_EVENT_TYPES, publishDomainEvent } from '@/lib/notifications/domain-events';

export const cronNames = ['email-recovery', 'abandoned-checkout', 'demo-fulfillment', 'notification-retention', 'payout-review', 'stock-reminders', 'offer-rotation'] as const;
const cronPayload = z.object({ name: z.enum(cronNames), bucket: z.string().min(1) });

export async function enqueueDailyCronJobs(now = new Date()) {
	const bucket = now.toISOString().slice(0, 10);
	return db.$transaction(async tx => {
		const jobs = [];
		for (const name of cronNames) jobs.push(await enqueueBackgroundJob(tx, {
			eventKey: `cron:${name}:${bucket}`, kind: 'CRON', payload: { name, bucket },
		}));
		return jobs;
	});
}

export async function executeCronJob(payload: unknown) {
	const { name, bucket } = cronPayload.parse(payload);
	switch (name) {
		case 'email-recovery': await dispatchEmailOutboxBatch(); return;
		case 'abandoned-checkout': await enqueueAbandonedCheckoutReminders(); return;
		case 'demo-fulfillment': {
			const { recoverWorkflowSteps } = await import('./workflow-steps');
			await recoverWorkflowSteps(); return;
		}
		case 'notification-retention': await cleanupNotificationDeliveryData(); return;
		case 'payout-review': await createWeeklyPayoutReview(); return;
		case 'offer-rotation': {
			const { rotateDailyOffers } = await import('@/lib/offers/rotation');
			await rotateDailyOffers(); return;
		}
		case 'stock-reminders': {
			const sizes = await db.size.findMany({
				where: { quantity: 0, updatedAt: { lte: new Date(Date.now() - 86_400_000) } }, take: 20,
				include: { productVariant: { include: { product: { include: { store: true } } } } },
			});
			for (const size of sizes) {
				const product = size.productVariant.product;
				await publishDomainEvent(db, {
					eventKey: `inventory:depleted-reminder:${size.id}:${bucket}`,
					eventType: DOMAIN_EVENT_TYPES.INVENTORY_LOW_STOCK,
					aggregateType: 'INVENTORY_SKU', aggregateId: size.id, storeId: product.storeId,
					payload: { storeId: product.storeId, storeUrl: product.store.url, productId: product.id,
						productName: product.name, productSlug: product.slug, previousQuantity: 0,
						variantId: size.productVariantId, variantName: size.productVariant.variantName,
						sizeId: size.id, size: size.size, currentQuantity: 0, threshold: size.lowStockThreshold,
						message: `Item "${product.name} - ${size.size}" has been out of stock for over 24 hours.` },
				});
			}
		}
	}
}

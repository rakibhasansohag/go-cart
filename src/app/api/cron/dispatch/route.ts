import { NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/security/cron';
import { dispatchEmailOutboxBatch } from '@/lib/email/outbox';
import { enqueueAbandonedCheckoutReminders } from '@/lib/cart/abandoned-checkout';
import { runDemoFulfillment } from '@/lib/orders/demo-automation';
import { cleanupNotificationDeliveryData } from '@/lib/notifications/retention';
import { createWeeklyPayoutReview } from '@/lib/settlement/payout-review';
import { db } from '@/lib/db';
import { DOMAIN_EVENT_TYPES, publishDomainEvent } from '@/lib/notifications/domain-events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface JobResult {
	status: 'success' | 'failed' | 'skipped';
	details?: unknown;
	error?: string;
}

async function runRestockAndStockOutCheck(): Promise<JobResult> {
	try {
		// Find sizes with zero inventory updated more than 24 hours ago
		const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
		const zeroStockSizes = await db.size.findMany({
			where: {
				quantity: 0,
				updatedAt: { lte: oneDayAgo },
			},
			take: 20,
			include: {
				productVariant: {
					include: {
						product: {
							include: {
								store: {
									select: {
										id: true,
										url: true,
										name: true,
										userId: true,
									},
								},
							},
						},
					},
				},
			},
		});

		let notificationsDispatched = 0;
		for (const item of zeroStockSizes) {
			const product = item.productVariant.product;
			const store = product.store;
			const eventNonce = `${Date.now()}_${item.id.slice(0, 6)}`;

			await publishDomainEvent(db, {
				eventKey: `inventory:depleted-reminder:${item.id}:${eventNonce}`,
				eventType: DOMAIN_EVENT_TYPES.INVENTORY_LOW_STOCK,
				aggregateType: 'INVENTORY_SKU',
				aggregateId: item.id,
				actorUserId: null,
				storeId: store.id,
				payload: {
					storeId: store.id,
					storeUrl: store.url,
					productId: product.id,
					productName: product.name,
					variantId: item.productVariant.id,
					variantName: item.productVariant.variantName,
					sizeId: item.id,
					size: item.size,
					currentQuantity: 0,
					threshold: item.lowStockThreshold ?? 5,
					message: `Item "${product.name} - ${item.size}" has been out of stock for over 24 hours.`,
				},
			});
			notificationsDispatched++;
		}

		return {
			status: 'success',
			details: {
				depletedCount: zeroStockSizes.length,
				notificationsDispatched,
			},
		};
	} catch (error) {
		return {
			status: 'failed',
			error: error instanceof Error ? error.message : 'Depleted stock check failed.',
		};
	}
}

async function handle(request: Request) {
	if (!isAuthorizedCronRequest(request)) {
		return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
	}

	const startTime = Date.now();
	const results: Record<string, JobResult> = {};

	// 1. Email Outbox Retry
	try {
		const emailResult = await dispatchEmailOutboxBatch();
		results.emailOutbox = { status: 'success', details: emailResult };
	} catch (error) {
		results.emailOutbox = {
			status: 'failed',
			error: error instanceof Error ? error.message : 'Email outbox failed.',
		};
	}

	// 2. Abandoned Checkout Reminders
	try {
		const reminders = await enqueueAbandonedCheckoutReminders();
		const delivery = await dispatchEmailOutboxBatch({
			limit: Math.max(1, reminders.sourceEventIds.length * 2),
			sourceEventIds: reminders.sourceEventIds,
		});
		results.abandonedCheckouts = {
			status: 'success',
			details: { reminders, delivery },
		};
	} catch (error) {
		results.abandonedCheckouts = {
			status: 'failed',
			error: error instanceof Error ? error.message : 'Abandoned checkouts failed.',
		};
	}

	// 3. Demo Order Fulfillment Progression
	try {
		const fulfillment = await runDemoFulfillment({ manual: false });
		results.demoFulfillment = { status: 'success', details: fulfillment };
	} catch (error) {
		results.demoFulfillment = {
			status: 'failed',
			error: error instanceof Error ? error.message : 'Fulfillment progression failed.',
		};
	}

	// 4. Notification Delivery Retention Cleanup
	try {
		const cleanup = await cleanupNotificationDeliveryData();
		results.notificationRetention = { status: 'success', details: cleanup };
	} catch (error) {
		results.notificationRetention = {
			status: 'failed',
			error: error instanceof Error ? error.message : 'Notification retention cleanup failed.',
		};
	}

	// 5. Weekly Payout Review (safely idempotent)
	try {
		const payout = await createWeeklyPayoutReview();
		results.payoutReview = { status: 'success', details: payout };
	} catch (error) {
		results.payoutReview = {
			status: 'failed',
			error: error instanceof Error ? error.message : 'Payout review failed.',
		};
	}

	// 6. Stock Depleted & Restock Reminders
	results.depletedStockCheck = await runRestockAndStockOutCheck();

	// 7. Daily Offer Rotation & Flash Deals Countdown
	try {
		const { rotateDailyOffers } = await import('@/lib/offers/rotation');
		const offerRotation = await rotateDailyOffers();
		results.offerRotation = { status: 'success', details: offerRotation };
	} catch (error) {
		results.offerRotation = {
			status: 'failed',
			error: error instanceof Error ? error.message : 'Offer rotation failed.',
		};
	}

	const totalDurationMs = Date.now() - startTime;
	const allSucceeded = Object.values(results).every(
		(r) => r.status === 'success' || r.status === 'skipped',
	);

	return NextResponse.json({
		ok: allSucceeded,
		timestamp: new Date().toISOString(),
		totalDurationMs,
		jobs: results,
	});
}

export async function GET(request: Request) {
	return handle(request);
}

export async function POST(request: Request) {
	return handle(request);
}

export async function HEAD(request: Request) {
	const res = await handle(request);
	return new Response(null, {
		status: res.status,
		headers: res.headers,
	});
}

import { db } from '@/lib/db';
import { scheduleEmailOutboxDispatch } from '@/lib/email/schedule';
import { DOMAIN_EVENT_TYPES, publishDomainEvent } from '@/lib/notifications/domain-events';
import { CANONICAL_SETTLEMENT_CURRENCY } from './calculation';
import { createWeeklyPayoutBatch } from './service';

/**
 * Creates this week's idempotent draft batch and alerts admins only when it
 * contains funds to review. The resulting notification deliberately links to
 * the protected review page; it never approves a batch or initiates a transfer.
 */
export async function createWeeklyPayoutReview(now = new Date()) {
	const batch = await createWeeklyPayoutBatch(now);
	const settlementCount = await db.sellerSettlement.count({
		where: { payoutBatchId: batch.id },
	});

	if (batch.status !== 'DRAFT' || batch.totalCents <= 0 || settlementCount === 0) {
		return { batch, settlementCount, notificationScheduled: false };
	}

	const event = await publishDomainEvent(db, {
		eventKey: `payout:batch-ready-for-review:${batch.id}`,
		eventType: DOMAIN_EVENT_TYPES.PAYOUT_BATCH_READY_FOR_REVIEW,
		aggregateType: 'PAYOUT_BATCH',
		aggregateId: batch.id,
		payload: {
			payoutBatchId: batch.id,
			weekStart: batch.weekStart.toISOString(),
			weekEnd: batch.weekEnd.toISOString(),
			totalCents: batch.totalCents,
			total: (batch.totalCents / 100).toFixed(2),
			settlementCount,
			currency: batch.currency || CANONICAL_SETTLEMENT_CURRENCY,
		},
	});

	scheduleEmailOutboxDispatch([event.id]);
	return { batch, settlementCount, notificationScheduled: true };
}

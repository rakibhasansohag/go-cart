import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
	createWeeklyPayoutBatchMock,
	countMock,
	publishDomainEventMock,
	scheduleEmailOutboxDispatchMock,
} = vi.hoisted(() => ({
	createWeeklyPayoutBatchMock: vi.fn(),
	countMock: vi.fn(),
	publishDomainEventMock: vi.fn(),
	scheduleEmailOutboxDispatchMock: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
	db: { sellerSettlement: { count: countMock } },
}));
vi.mock('./service', () => ({ createWeeklyPayoutBatch: createWeeklyPayoutBatchMock }));
vi.mock('@/lib/notifications/domain-events', () => ({
	DOMAIN_EVENT_TYPES: { PAYOUT_BATCH_READY_FOR_REVIEW: 'payout.batch_ready_for_review' },
	publishDomainEvent: publishDomainEventMock,
}));
vi.mock('@/lib/email/schedule', () => ({
	scheduleEmailOutboxDispatch: scheduleEmailOutboxDispatchMock,
}));

import { createWeeklyPayoutReview } from './payout-review';

describe('weekly payout review notification', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createWeeklyPayoutBatchMock.mockResolvedValue({
			id: 'batch-1',
			weekStart: new Date('2026-08-10T00:00:00.000Z'),
			weekEnd: new Date('2026-08-16T23:59:59.999Z'),
			totalCents: 291276,
			currency: 'USD',
			status: 'DRAFT',
		});
	});

	it('does not notify admins when the scheduled batch has no payable settlements', async () => {
		countMock.mockResolvedValue(0);

		const result = await createWeeklyPayoutReview(new Date('2026-08-16T03:00:00.000Z'));

		expect(result.notificationScheduled).toBe(false);
		expect(publishDomainEventMock).not.toHaveBeenCalled();
		expect(scheduleEmailOutboxDispatchMock).not.toHaveBeenCalled();
	});

	it('does not re-notify a batch that was already approved or processed', async () => {
		createWeeklyPayoutBatchMock.mockResolvedValueOnce({
			id: 'batch-1',
			weekStart: new Date('2026-08-10T00:00:00.000Z'),
			weekEnd: new Date('2026-08-16T23:59:59.999Z'),
			totalCents: 291276,
			currency: 'USD',
			status: 'APPROVED',
		});
		countMock.mockResolvedValue(2);

		const result = await createWeeklyPayoutReview();

		expect(result.notificationScheduled).toBe(false);
		expect(publishDomainEventMock).not.toHaveBeenCalled();
	});

	it('queues one idempotent admin review notification without approving or transferring funds', async () => {
		countMock.mockResolvedValue(2);
		publishDomainEventMock.mockResolvedValue({ id: 'event-1' });

		const result = await createWeeklyPayoutReview();

		expect(result.notificationScheduled).toBe(true);
		expect(publishDomainEventMock).toHaveBeenCalledWith(
		expect.anything(),
		expect.objectContaining({
			eventKey: 'payout:batch-ready-for-review:batch-1',
			eventType: 'payout.batch_ready_for_review',
			aggregateType: 'PAYOUT_BATCH',
			aggregateId: 'batch-1',
			payload: expect.objectContaining({
				payoutBatchId: 'batch-1',
				settlementCount: 2,
				totalCents: 291276,
				currency: 'USD',
			}),
		}),
		);
		expect(scheduleEmailOutboxDispatchMock).toHaveBeenCalledWith(['event-1']);
	});
});

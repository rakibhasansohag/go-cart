import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createWeeklyPayoutReviewMock } = vi.hoisted(() => ({
	createWeeklyPayoutReviewMock: vi.fn(),
}));

vi.mock('@/lib/settlement/payout-review', () => ({
	createWeeklyPayoutReview: createWeeklyPayoutReviewMock,
}));

import { GET } from './route';

describe('payout review cron route', () => {
	const originalSecret = process.env.CRON_SECRET;

	beforeEach(() => {
		vi.clearAllMocks();
		process.env.CRON_SECRET = 'test-cron-secret';
	});

	afterEach(() => {
		if (originalSecret === undefined) delete process.env.CRON_SECRET;
		else process.env.CRON_SECRET = originalSecret;
	});

	it('rejects callers without the cron bearer secret', async () => {
		const response = await GET(new Request('http://localhost/api/cron/payout-review'));

		expect(response.status).toBe(401);
		expect(createWeeklyPayoutReviewMock).not.toHaveBeenCalled();
	});

	it('runs the review-only job for an authorized cron request', async () => {
		createWeeklyPayoutReviewMock.mockResolvedValue({
			batch: { id: 'batch-1' },
			settlementCount: 2,
			notificationScheduled: true,
		});

		const response = await GET(new Request('http://localhost/api/cron/payout-review', {
			headers: { authorization: 'Bearer test-cron-secret' },
		}));

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ ok: true, settlementCount: 2, notificationScheduled: true });
		expect(createWeeklyPayoutReviewMock).toHaveBeenCalledOnce();
	});
});

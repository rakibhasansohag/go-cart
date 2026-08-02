import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
	updateManyMock,
	findUniqueMock,
	findManyMock,
	findEmailTemplateMock,
	sendSmtpEmailMock,
} =
	vi.hoisted(() => ({
		updateManyMock: vi.fn(),
		findUniqueMock: vi.fn(),
		findManyMock: vi.fn(),
		findEmailTemplateMock: vi.fn(),
		sendSmtpEmailMock: vi.fn(),
	}));

vi.mock('@/lib/db', () => ({
	db: {
		emailTemplate: {
			findUnique: findEmailTemplateMock,
		},
		emailOutbox: {
			updateMany: updateManyMock,
			findUnique: findUniqueMock,
			findMany: findManyMock,
		},
	},
}));

vi.mock('./config', () => ({
	emailNotificationsEnabled: () => true,
	emailOutboxBatchSize: () => 20,
	emailOutboxMaxAttempts: () => 5,
}));

vi.mock('./smtp', () => ({
	sendSmtpEmail: sendSmtpEmailMock,
}));

import { dispatchEmailOutboxBatch, dispatchEmailOutboxJob } from './outbox';

const job = {
	id: 'job-1',
	templateKey: 'payment.succeeded',
	recipientEmail: 'customer@example.com',
	payload: {
		title: 'Payment confirmed',
		message: 'Your payment was successful.',
		actionUrl: '/order/order-1',
	},
	status: 'PROCESSING',
	attemptCount: 1,
	nextAttemptAt: new Date(),
	lastAttemptAt: new Date(),
	sentAt: null,
	lastError: null,
	sourceEventId: 'event-1',
	recipientId: 'user-1',
	createdAt: new Date(),
	updatedAt: new Date(),
};

describe('email outbox dispatcher', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		findEmailTemplateMock.mockResolvedValue(null);
		process.env.APP_URL = 'https://gocart.example';
	});

	it('claims and sends a job exactly once', async () => {
		updateManyMock.mockResolvedValueOnce({ count: 1 });
		findUniqueMock.mockResolvedValue(job);
		sendSmtpEmailMock.mockResolvedValue({ messageId: 'message-1' });
		updateManyMock.mockResolvedValueOnce({ count: 1 });

		await expect(dispatchEmailOutboxJob(job.id)).resolves.toEqual({
			id: job.id,
			status: 'sent',
		});
		expect(sendSmtpEmailMock).toHaveBeenCalledTimes(1);
		expect(updateManyMock).toHaveBeenLastCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					status: 'SENT',
					templateSource: 'DEFAULT',
					templateVersion: 0,
				}),
			}),
		);
	});

	it('skips a job already claimed by another worker', async () => {
		updateManyMock.mockResolvedValueOnce({ count: 0 });

		await expect(dispatchEmailOutboxJob(job.id)).resolves.toEqual({
			id: job.id,
			status: 'skipped',
		});
		expect(sendSmtpEmailMock).not.toHaveBeenCalled();
	});

	it('records a retryable failure without rolling back the business event', async () => {
		updateManyMock.mockResolvedValueOnce({ count: 1 });
		findUniqueMock.mockResolvedValue(job);
		sendSmtpEmailMock.mockRejectedValue(
			new Error('SMTP temporarily unavailable'),
		);
		updateManyMock.mockResolvedValueOnce({ count: 1 });

		const result = await dispatchEmailOutboxJob(job.id);
		expect(result).toEqual({
			id: job.id,
			status: 'failed',
			error: 'SMTP temporarily unavailable',
		});
		expect(updateManyMock).toHaveBeenLastCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					status: 'FAILED',
					lastError: 'SMTP temporarily unavailable',
					nextAttemptAt: expect.any(Date),
				}),
			}),
		);
	});

	it('limits immediate delivery to the source events from the current action', async () => {
		findManyMock.mockResolvedValue([]);

		await dispatchEmailOutboxBatch({
			limit: 10,
			sourceEventIds: ['event-current'],
		});

		expect(findManyMock).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					sourceEventId: { in: ['event-current'] },
				}),
			}),
		);
	});

	it('does not turn an explicitly empty event scope into a global recovery run', async () => {
		await expect(
			dispatchEmailOutboxBatch({ sourceEventIds: [] }),
		).resolves.toEqual({
			disabled: false,
			claimed: 0,
			sent: 0,
			failed: 0,
			skipped: 0,
		});
		expect(findManyMock).not.toHaveBeenCalled();
	});
});

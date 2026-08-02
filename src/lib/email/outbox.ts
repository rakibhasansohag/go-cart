import 'server-only';

import { db } from '@/lib/db';
import { EmailOutboxStatus, Prisma } from '@prisma/client';
import {
	emailNotificationsEnabled,
	emailOutboxBatchSize,
	emailOutboxMaxAttempts,
} from './config';
import { renderOutboxEmail } from './render-email';
import { sendSmtpEmail } from './smtp';

const PROCESSING_LEASE_MS = 10 * 60 * 1000;
const BASE_RETRY_MS = 5 * 60 * 1000;
const MAX_RETRY_MS = 24 * 60 * 60 * 1000;

type DispatchResult =
	| { id: string; status: 'sent' }
	| { id: string; status: 'failed'; error: string }
	| { id: string; status: 'skipped' };

function retryDate(attemptCount: number) {
	const delay = Math.min(
		MAX_RETRY_MS,
		BASE_RETRY_MS * 2 ** Math.max(0, attemptCount - 1),
	);
	return new Date(Date.now() + delay);
}

function safeError(error: unknown) {
	let message = error instanceof Error ? error.message : String(error);
	const secret = process.env.SMTP_PASS;
	if (secret) message = message.replaceAll(secret, '[redacted]');
	return message.slice(0, 2_000);
}

function claimableWhere(id?: string): Prisma.EmailOutboxWhereInput {
	const now = new Date();
	const staleBefore = new Date(now.getTime() - PROCESSING_LEASE_MS);
	return {
		...(id ? { id } : {}),
		attemptCount: { lt: emailOutboxMaxAttempts() },
		OR: [
			{
				status: { in: [EmailOutboxStatus.PENDING, EmailOutboxStatus.FAILED] },
				nextAttemptAt: { lte: now },
			},
			{
				status: EmailOutboxStatus.PROCESSING,
				lastAttemptAt: { lte: staleBefore },
			},
		],
	};
}

async function claimOutboxJob(id: string) {
	const claimedAt = new Date();
	const claimed = await db.emailOutbox.updateMany({
		where: claimableWhere(id),
		data: {
			status: EmailOutboxStatus.PROCESSING,
			attemptCount: { increment: 1 },
			lastAttemptAt: claimedAt,
			lastError: null,
		},
	});
	if (claimed.count !== 1) return null;

	return db.emailOutbox.findUnique({ where: { id } });
}

export async function dispatchEmailOutboxJob(
	id: string,
): Promise<DispatchResult> {
	if (!emailNotificationsEnabled()) return { id, status: 'skipped' };

	const job = await claimOutboxJob(id);
	if (!job) return { id, status: 'skipped' };

	try {
		const rendered = await renderOutboxEmail({
			templateKey: job.templateKey,
			payload: job.payload,
		});
		await sendSmtpEmail({
			to: job.recipientEmail,
			subject: rendered.subject,
			text: rendered.text,
			html: rendered.html,
		});
		await db.emailOutbox.updateMany({
			where: { id: job.id, status: EmailOutboxStatus.PROCESSING },
			data: {
				status: EmailOutboxStatus.SENT,
				sentAt: new Date(),
				lastError: null,
				templateSource: rendered.templateSource,
				templateVersion: rendered.templateVersion,
			},
		});
		return { id: job.id, status: 'sent' };
	} catch (error) {
		const message = safeError(error);
		await db.emailOutbox.updateMany({
			where: { id: job.id, status: EmailOutboxStatus.PROCESSING },
			data: {
				status: EmailOutboxStatus.FAILED,
				nextAttemptAt: retryDate(job.attemptCount),
				lastError: message,
			},
		});
		return { id: job.id, status: 'failed', error: message };
	}
}

export async function dispatchEmailOutboxBatch(input?: {
	limit?: number;
	sourceEventIds?: string[];
}) {
	if (!emailNotificationsEnabled()) {
		return { disabled: true, claimed: 0, sent: 0, failed: 0, skipped: 0 };
	}

	const limit = Math.min(
		100,
		Math.max(1, input?.limit ?? emailOutboxBatchSize()),
	);
	const sourceEventIds = [...new Set(input?.sourceEventIds ?? [])].filter(Boolean);
	if (input?.sourceEventIds && sourceEventIds.length === 0) {
		return { disabled: false, claimed: 0, sent: 0, failed: 0, skipped: 0 };
	}
	const candidates = await db.emailOutbox.findMany({
		where: {
			...claimableWhere(),
			...(sourceEventIds.length > 0
				? { sourceEventId: { in: sourceEventIds } }
				: {}),
		},
		select: { id: true },
		orderBy: [{ nextAttemptAt: 'asc' }, { createdAt: 'asc' }],
		take: limit,
	});

	const results: DispatchResult[] = [];
	for (const candidate of candidates) {
		results.push(await dispatchEmailOutboxJob(candidate.id));
	}

	return {
		disabled: false,
		claimed: candidates.length,
		sent: results.filter((result) => result.status === 'sent').length,
		failed: results.filter((result) => result.status === 'failed').length,
		skipped: results.filter((result) => result.status === 'skipped').length,
	};
}

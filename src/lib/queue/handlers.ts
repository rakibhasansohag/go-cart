import { z } from 'zod';
import type Stripe from 'stripe';
import type { BackgroundJob } from '@prisma/client';
import { db } from '@/lib/db';
import { publishDomainEvent, type PublishDomainEventInput } from '@/lib/notifications/domain-events';
import { emailNotificationsEnabled, emailOutboxMaxAttempts } from '@/lib/email/config';
import type { PayPalWebhookEvent } from '@/lib/payments/paypal-events';
import { DeferredJob, withJobTransaction } from './worker';
import { scheduleBackgroundJobs } from './schedule';

const emailPayload = z.object({ outboxId: z.string().min(1) });
const paymentPayload = z.object({ provider: z.enum(['Stripe', 'Paypal']), event: z.object({ id: z.string().min(1) }).passthrough() });

export async function executeBackgroundJob(job: BackgroundJob, token: string) {
	if (job.kind === 'NOTIFICATION' || job.kind === 'INVENTORY') {
		const input = job.payload as unknown as PublishDomainEventInput;
		await withJobTransaction(job, token, async tx => {
			await publishDomainEvent(tx, { ...input, persistEventOnly: false, deliveryMode: 'inline' });
		});
		scheduleBackgroundJobs();
		return;
	}
	if (job.kind === 'EMAIL') {
		const { dispatchEmailOutboxJob } = await import('@/lib/email/outbox');
		const { outboxId } = emailPayload.parse(job.payload);
		if (!emailNotificationsEnabled()) throw new DeferredJob(new Date(Date.now() + 60 * 60_000));
		const result = await dispatchEmailOutboxJob(outboxId);
		const row = await db.emailOutbox.findUnique({ where: { id: outboxId } });
		if (row?.status === 'SENT') return;
		if (!row) throw new Error('Email outbox record is missing.');
		if (row.status === 'CANCELLED') return;
		if (row.status === 'FAILED' && row.attemptCount >= emailOutboxMaxAttempts()) throw new Error('Email delivery exhausted its attempts.');
		if (result.status === 'failed') throw new Error('Email delivery failed.');
		throw new DeferredJob(new Date(Math.max(Date.now() + 30_000, row.nextAttemptAt.getTime())));
	}
	if (job.kind === 'PAYMENT') {
		const payload = paymentPayload.parse(job.payload);
		// Payload is persisted only after provider signature verification at ingestion.
		if (payload.provider === 'Stripe') {
			const { handleStripeEvent } = await import('@/lib/payments/stripe-events');
			await handleStripeEvent(payload.event as unknown as Stripe.Event);
		} else {
			const { handlePayPalEvent } = await import('@/lib/payments/paypal-events');
			await handlePayPalEvent(payload.event as unknown as PayPalWebhookEvent);
		}
		return;
	}
	if (job.kind === 'WORKFLOW') {
		const { executeWorkflowStep } = await import('./workflow-steps');
		await executeWorkflowStep(job, token); return;
	}
	const { executeCronJob } = await import('./cron-jobs');
	await executeCronJob(job.payload);
}

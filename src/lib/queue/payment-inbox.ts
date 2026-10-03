import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { enqueueBackgroundJob } from './jobs';
import { scheduleBackgroundJobs } from './schedule';

/** Caller must verify the provider signature before this durable acknowledgement. */
export async function persistVerifiedPayment(provider: 'Stripe' | 'Paypal', event: { id: string }) {
	const canonical = JSON.parse(JSON.stringify(event)) as Prisma.InputJsonObject;
	const job = await enqueueBackgroundJob(db, {
		eventKey: `webhook:${provider}:${event.id}`, kind: 'PAYMENT', payload: { provider, event: canonical },
	});
	scheduleBackgroundJobs();
	return job;
}

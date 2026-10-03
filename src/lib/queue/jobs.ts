import type { BackgroundJobKind, Prisma, PrismaClient } from '@prisma/client';
import { scheduleBackgroundJobs } from './schedule';

export async function enqueueBackgroundJob(
	tx: Prisma.TransactionClient | PrismaClient,
	input: { eventKey: string; kind: BackgroundJobKind; payload: Prisma.InputJsonValue; dueAt?: Date },
) {
	const job = await tx.backgroundJob.upsert({
		where: { eventKey: input.eventKey }, update: { eventKey: input.eventKey },
		create: {
			eventKey: input.eventKey, kind: input.kind, payload: input.payload,
			...(input.dueAt ? { nextAttemptAt: input.dueAt } : {}),
		},
	});
	// Registration is request-scoped; the callback reads only committed rows after response.
	scheduleBackgroundJobs();
	return job;
}

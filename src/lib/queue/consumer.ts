import { z } from 'zod';
import { getQueueClient } from './client';
import { queuesEnabled } from './config';
import { isAuthorizedCronRequest } from '@/lib/security/cron';
import { processBackgroundJob } from './worker';
import type { BackgroundJobKind } from '@prisma/client';

const reference = z.object({ jobId: z.string().uuid() });

export function backgroundConsumer(kind: BackgroundJobKind) {
	return async (request: Request) => {
		if (!queuesEnabled()) return Response.json({ ok: false, error: 'Queue consumer is not enabled.' }, { status: 503 });
		// Vercel's configured queue routes are private. Local callbacks also require a bearer credential.
		if (process.env.VERCEL !== '1' && (!request.headers.get('authorization')?.startsWith('Bearer ') || !isAuthorizedCronRequest(request))) {
			return Response.json({ error: 'Unauthorized.' }, { status: 401 });
		}
		const callback = getQueueClient().handleCallback(async (message: unknown) => {
			const { jobId } = reference.parse(message);
			await processBackgroundJob(jobId, kind);
		}, { retry: (_error, metadata) => ({ afterSeconds: Math.min(3600, 30 * 2 ** Math.min(metadata.deliveryCount, 7)) }) });
		return callback(request);
	};
}

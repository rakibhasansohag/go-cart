import { getQueueClient } from "./client";
import { queueTransportAvailable } from './config';
import type { PublishToQueueInput, QueueMessageEnvelope } from "./types";

/**
 * Publish a typed message to a Vercel Queue topic.
 *
 * Uses the `eventKey` as an idempotency key so replaying the same
 * domain event won't produce duplicate queue messages.
 *
 * @returns The Vercel Queue `messageId` on success, or `null` if
 *          queue publishing is unavailable (missing env vars).
 */
export async function publishToQueue(
	input: PublishToQueueInput,
): Promise<string | null> {
	// Gracefully skip if queue env vars are not configured (e.g. local dev
	// without `vercel link`). The existing DB-based path is still the fallback.
	if (!queueTransportAvailable()) {
		return null;
	}

	const client = getQueueClient();
	const { send } = client;

	const envelope: QueueMessageEnvelope = {
		eventKey: input.eventKey,
		eventType: input.eventType,
		aggregateType: input.aggregateType,
		aggregateId: input.aggregateId,
		actorUserId: input.actorUserId ?? null,
		timestamp: new Date().toISOString(),
		payload: input.payload,
	};

	const { messageId } = await send(input.topic, envelope, {
		idempotencyKey: input.eventKey,
	});

	return messageId;
}

import { z } from "zod";
import type { QueueTopic } from "./topics";

/**
 * Base envelope schema for every queued message.
 * The `payload` field contains the domain-specific data.
 */
export const queueMessageEnvelopeSchema = z.object({
	/** Globally unique event key for deduplication */
	eventKey: z.string().min(1),
	/** Domain event type, e.g. "payment.succeeded" */
	eventType: z.string().min(1),
	/** Aggregate that produced this event */
	aggregateType: z.string().min(1),
	/** ID of the aggregate instance */
	aggregateId: z.string().min(1),
	/** User who triggered the event (null for system-generated) */
	actorUserId: z.string().nullable(),
	/** ISO timestamp when the event was produced */
	timestamp: z.string().min(1),
	/** Domain-specific event data */
	payload: z.record(z.string(), z.unknown()),
});

export type QueueMessageEnvelope = z.infer<typeof queueMessageEnvelopeSchema>;

/**
 * Input type for publishing a message to a Vercel Queue topic.
 */
export interface PublishToQueueInput {
	topic: QueueTopic;
	eventKey: string;
	eventType: string;
	aggregateType: string;
	aggregateId: string;
	actorUserId?: string | null;
	payload: Record<string, unknown>;
}

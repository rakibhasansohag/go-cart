/**
 * Vercel Queue infrastructure — barrel export.
 *
 * Usage:
 *   import { publishToQueue, QUEUE_TOPICS } from "@/lib/queue";
 */
export { publishToQueue } from "./publisher";
export { QUEUE_TOPICS } from "./topics";
export type { QueueTopic } from "./topics";
export type { PublishToQueueInput, QueueMessageEnvelope } from "./types";
export { queueMessageEnvelopeSchema } from "./types";

/**
 * Vercel Queue topic name constants.
 *
 * Each topic is a separate durable event stream. Consumers subscribe
 * to individual topics via `experimentalTriggers` in `vercel.json`.
 * Topic names permit only letters, digits, hyphens and underscores.
 */
export const QUEUE_TOPICS = {
	/** Transactional email dispatch (order confirmations, password resets, etc.) */
	EMAIL_OUTBOX: "email-outbox",

	/** In-app notification fan-out (bell icon notifications) */
	NOTIFICATION_FAN: "notification-fan",

	/** Payment webhook events (Stripe, PayPal) for async reconciliation */
	PAYMENT_EVENTS: "payment-events",

	/** Inventory threshold alerts (low stock, restocked) */
	INVENTORY_EVENTS: "inventory-events",

	/** Order lifecycle events (placed, confirmed, shipped, delivered) */
	ORDER_EVENTS: "order-events",
	CRON_JOBS: "cron-jobs",
	WORKFLOW_STEPS: "workflow-steps",
} as const;

export type QueueTopic = (typeof QUEUE_TOPICS)[keyof typeof QUEUE_TOPICS];

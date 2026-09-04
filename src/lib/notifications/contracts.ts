import { z } from 'zod';

const commonPayload = z
	.object({
		orderId: z.string().optional(),
		orderGroupId: z.string().optional(),
		storeId: z.string().optional(),
		storeUrl: z.string().optional(),
		returnRequestId: z.string().optional(),
		nextStatus: z.string().optional(),
	})
	.passthrough();

export const DOMAIN_EVENT_PAYLOAD_SCHEMAS = {
	'payment.succeeded': commonPayload.extend({
		provider: z.string().min(1),
		providerPaymentId: z.string().min(1),
		total: z.number().finite(),
		currency: z.string().min(1),
	}),
	'package.paid_ready': commonPayload.extend({
		orderGroupId: z.string().min(1),
		storeUrl: z.string().min(1),
	}),
	'package.status_changed': commonPayload.extend({
		orderGroupId: z.string().min(1),
		nextStatus: z.string().min(1),
	}),
	'shipment.status_changed': commonPayload.extend({
		orderGroupId: z.string().min(1),
		nextStatus: z.string().min(1),
	}),
	'shipment.delivery_attempt': commonPayload.extend({
		shipmentId: z.string().min(1),
		outcome: z.string().min(1),
		attemptNumber: z.number().int().positive(),
	}),
	'shipment.tracking_updated': commonPayload.extend({
		shipmentId: z.string().min(1),
		trackingEventId: z.string().min(1),
	}),
	'return.requested': commonPayload.extend({
		returnRequestId: z.string().min(1),
		orderGroupId: z.string().optional(),
	}),
	'return.status_changed': commonPayload.extend({
		returnRequestId: z.string().min(1),
		nextStatus: z.string().min(1),
	}),
	'return.inventory_reconciled': commonPayload.extend({
		returnRequestId: z.string().min(1),
	}),
	'return.dispute_resolved': commonPayload.extend({
		returnRequestId: z.string().min(1),
	}),
	'return.deadline_due': commonPayload.extend({
		returnRequestId: z.string().min(1),
		deadlineAt: z.string().min(1),
	}),
	'return.dispute_escalated': commonPayload.extend({
		returnRequestId: z.string().min(1),
	}),
	'refund.issued': commonPayload.extend({
		orderId: z.string().min(1),
		amount: z.number().finite(),
		currency: z.string().min(1),
	}),
	'exchange.approved': commonPayload.extend({
		returnRequestId: z.string().min(1),
	}),
	'cancellation.requested': commonPayload.extend({
		orderGroupId: z.string().min(1),
	}),
	'cancellation.decided': commonPayload.extend({
		orderGroupId: z.string().min(1),
	}),
	'checkout.abandoned': commonPayload,
	'payout.batch_ready_for_review': commonPayload.extend({
		payoutBatchId: z.string().min(1),
		weekStart: z.string().min(1),
		weekEnd: z.string().min(1),
		totalCents: z.number().int().nonnegative(),
		settlementCount: z.number().int().nonnegative(),
		currency: z.string().min(1),
	}),
	'product.question_asked': commonPayload.extend({
		questionId: z.string().min(1),
		productId: z.string().min(1),
		productName: z.string().min(1),
		productSlug: z.string().min(1),
		question: z.string().min(1),
		authorName: z.string().min(1),
	}),
	'product.question_answered': commonPayload.extend({
		questionId: z.string().min(1),
		answerId: z.string().min(1),
		productId: z.string().min(1),
		productName: z.string().min(1),
		productSlug: z.string().min(1),
		answer: z.string().min(1),
		authorName: z.string().min(1),
		isOfficialSeller: z.boolean().default(false),
	}),
	'inquiry.buyer_sent': commonPayload.extend({
		conversationId: z.string().min(1),
		messageId: z.string().min(1),
		storeId: z.string().min(1),
		buyerName: z.string().min(1),
		subject: z.string().optional(),
		bodySnippet: z.string().min(1),
	}),
	'inquiry.seller_replied': commonPayload.extend({
		conversationId: z.string().min(1),
		messageId: z.string().min(1),
		storeId: z.string().min(1),
		storeName: z.string().min(1),
		buyerId: z.string().min(1),
		bodySnippet: z.string().min(1),
	}),
} as const;

export type DomainEventPayload = z.infer<
	(typeof DOMAIN_EVENT_PAYLOAD_SCHEMAS)[keyof typeof DOMAIN_EVENT_PAYLOAD_SCHEMAS]
>;

export function validateDomainEventPayload(eventType: string, payload: unknown) {
	const schema = DOMAIN_EVENT_PAYLOAD_SCHEMAS[eventType as keyof typeof DOMAIN_EVENT_PAYLOAD_SCHEMAS];
	if (!schema) return payload;
	const result = schema.safeParse(payload);
	if (!result.success) {
		throw new Error(`Invalid payload for domain event ${eventType}: ${result.error.issues[0]?.message ?? 'unknown error'}`);
	}
	return result.data;
}

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
	'return.requested': commonPayload.extend({
		returnRequestId: z.string().min(1),
		orderGroupId: z.string().optional(),
	}),
	'return.status_changed': commonPayload.extend({
		returnRequestId: z.string().min(1),
		nextStatus: z.string().min(1),
	}),
	'checkout.abandoned': commonPayload,
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

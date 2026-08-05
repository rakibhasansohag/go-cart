import { describe, expect, it } from 'vitest';
import { validateDomainEventPayload, DOMAIN_EVENT_PAYLOAD_SCHEMAS } from './contracts';

describe('Domain Event Contracts & Payload Validation', () => {
	it('validates payment.succeeded payload schema correctly', () => {
		const validPayload = {
			orderId: 'ord_123',
			provider: 'stripe',
			providerPaymentId: 'pi_test_123',
			total: 99.99,
			currency: 'USD',
		};
		const result = validateDomainEventPayload('payment.succeeded', validPayload);
		expect(result).toMatchObject(validPayload);
	});

	it('rejects payment.succeeded payload when required fields are missing', () => {
		const invalidPayload = {
			orderId: 'ord_123',
			provider: 'stripe',
		};
		expect(() => validateDomainEventPayload('payment.succeeded', invalidPayload)).toThrow(
			/Invalid payload for domain event payment.succeeded/,
		);
	});

	it('validates package.paid_ready payload schema', () => {
		const validPayload = {
			orderGroupId: 'grp_456',
			storeUrl: 'demo-store',
		};
		const result = validateDomainEventPayload('package.paid_ready', validPayload);
		expect(result).toMatchObject(validPayload);
	});

	it('validates shipment.status_changed payload schema', () => {
		const validPayload = {
			orderGroupId: 'grp_789',
			nextStatus: 'IN_TRANSIT',
		};
		const result = validateDomainEventPayload('shipment.status_changed', validPayload);
		expect(result).toMatchObject(validPayload);
	});

	it('validates return.requested payload schema', () => {
		const validPayload = {
			returnRequestId: 'ret_123',
			orderGroupId: 'grp_123',
		};
		const result = validateDomainEventPayload('return.requested', validPayload);
		expect(result).toMatchObject(validPayload);
	});

	it('validates return.inventory_reconciled payload schema', () => {
		const validPayload = {
			returnRequestId: 'ret_456',
		};
		const result = validateDomainEventPayload('return.inventory_reconciled', validPayload);
		expect(result).toMatchObject(validPayload);
	});
});

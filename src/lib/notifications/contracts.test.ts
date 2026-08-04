import { describe, expect, it } from 'vitest';
import { validateDomainEventPayload } from './contracts';

describe('domain event payload contracts', () => {
	it('accepts a payment payload with provider details', () => {
		expect(() => validateDomainEventPayload('payment.succeeded', {
			provider: 'Stripe',
			providerPaymentId: 'pi_demo',
			total: 12.5,
			currency: 'USD',
		})).not.toThrow();
	});

	it('rejects malformed known event payloads', () => {
		expect(() => validateDomainEventPayload('package.status_changed', {
			orderGroupId: 'group-demo',
		})).toThrow(/Invalid payload/);
	});

	it('leaves provider-specific unknown events extensible', () => {
		expect(validateDomainEventPayload('payment_intent.created', { provider: 'Stripe' })).toEqual({ provider: 'Stripe' });
	});
});

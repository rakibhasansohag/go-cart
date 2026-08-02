import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	abandonedCheckoutBatchSize,
	abandonedCheckoutDelayHours,
	abandonedCheckoutEnabled,
	abandonedCheckoutEventKey,
} from './abandoned-checkout';

describe('abandoned checkout configuration', () => {
	const clearSettings = () => {
		delete process.env.ABANDONED_CHECKOUT_EMAIL_ENABLED;
		delete process.env.ABANDONED_CHECKOUT_AFTER_HOURS;
		delete process.env.ABANDONED_CHECKOUT_BATCH_SIZE;
	};

	beforeEach(clearSettings);
	afterEach(clearSettings);

	it('is disabled by default and uses bounded defaults', () => {
		expect(abandonedCheckoutEnabled()).toBe(false);
		expect(abandonedCheckoutDelayHours()).toBe(24);
		expect(abandonedCheckoutBatchSize()).toBe(25);
	});

	it('creates one stable idempotency key per unchanged saved cart', () => {
		const updatedAt = new Date('2026-08-02T12:00:00.000Z');
		expect(abandonedCheckoutEventKey('cart-1', updatedAt)).toBe(
			'checkout:abandoned:cart-1:2026-08-02T12:00:00.000Z',
		);
	});

	it('accepts explicit settings and caps a batch at 100', () => {
		process.env.ABANDONED_CHECKOUT_EMAIL_ENABLED = 'true';
		process.env.ABANDONED_CHECKOUT_AFTER_HOURS = '12';
		process.env.ABANDONED_CHECKOUT_BATCH_SIZE = '500';

		expect(abandonedCheckoutEnabled()).toBe(true);
		expect(abandonedCheckoutDelayHours()).toBe(12);
		expect(abandonedCheckoutBatchSize()).toBe(100);
	});
});

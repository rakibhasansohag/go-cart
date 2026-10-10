import { describe, expect, it } from 'vitest';
import { effectiveDiscount, effectivePrice } from './pricing';

describe('automatic sale pricing', () => {
	const now = Date.parse('2026-10-10T12:00:00Z');
	const size = { price: 19.99, discount: 5, automaticDiscount: 25,
		automaticDiscountEndsAt: new Date(now + 1000) };
	it('uses the better discount without stacking and rounds currency', () => {
		expect(effectivePrice(size, now)).toBe(14.99);
		expect(effectiveDiscount({ ...size, discount: 40 }, now)).toBe(40);
	});
	it('expires at the deadline even when cron has not run', () => {
		expect(effectiveDiscount(size, now + 1000)).toBe(5);
		expect(effectivePrice(size, now + 1000)).toBe(18.99);
		expect(effectiveDiscount({ ...size, automaticDiscountEndsAt: null }, now)).toBe(5);
		expect(size.discount).toBe(5);
	});
});

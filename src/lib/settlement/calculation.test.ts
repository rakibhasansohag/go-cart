import { describe, expect, it } from 'vitest';
import { allocateProportionally, calculateSettlementSnapshot, percentFromConfig } from './calculation';

describe('settlement calculation', () => {
	it('keeps provider fees transparent but pays the seller after commission', () => {
		expect(calculateSettlementSnapshot({
			grossCents: 10_000,
			discountCents: 1_000,
			shippingCents: 500,
			taxCents: 200,
			providerFeeCents: 329,
			commissionPercent: 2,
		})).toEqual({
			grossCents: 10_000,
			discountCents: 1_000,
			shippingCents: 500,
			taxCents: 200,
			providerFeeCents: 329,
			commissionCents: 194,
			sellerPayableCents: 9_506,
		});
	});

	it('reverses only the seller amount after a post-payday refund', () => {
		const initial = calculateSettlementSnapshot({ grossCents: 10_000, commissionPercent: 2 });
		const refund = calculateSettlementSnapshot({ grossCents: 10_000, refundCents: 2_500, commissionPercent: 2 });
		expect(initial.sellerPayableCents - refund.sellerPayableCents).toBe(2_450);
		expect(initial.commissionCents - refund.commissionCents).toBe(50);
	});

	it('allocates multi-seller discounts with deterministic cents', () => {
		expect(allocateProportionally(100, [
			{ key: 'store-b', weightCents: 2_000 },
			{ key: 'store-a', weightCents: 1_000 },
		])).toEqual([
			{ key: 'store-a', cents: 33 },
			{ key: 'store-b', cents: 67 },
		]);
	});

	it('accepts the configured default and rejects unsafe rates', () => {
		expect(percentFromConfig('2')).toBe(2);
		expect(() => percentFromConfig('101')).toThrow();
	});
});

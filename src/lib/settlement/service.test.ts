import { describe, expect, it } from 'vitest';
import { payoutHoldDaysFromConfig, settlementReleaseAt } from './service';

describe('settlement payout hold configuration', () => {
	const deliveredAt = new Date('2026-08-14T00:00:00.000Z');

	it('uses the default seven-day hold when no override is supplied', () => {
		expect(settlementReleaseAt(deliveredAt)).toEqual(new Date('2026-08-21T00:00:00.000Z'));
	});

	it('allows zero days for sandbox payout testing', () => {
		expect(settlementReleaseAt(deliveredAt, 0)).toEqual(deliveredAt);
	});

	it('accepts whole-day values through the configured range', () => {
		expect(payoutHoldDaysFromConfig(30)).toBe(30);
		expect(payoutHoldDaysFromConfig(365)).toBe(365);
	});

	it('rejects invalid payout hold values', () => {
		expect(() => payoutHoldDaysFromConfig(-1)).toThrow('0 to 365');
		expect(() => payoutHoldDaysFromConfig(1.5)).toThrow('whole number');
	});
});

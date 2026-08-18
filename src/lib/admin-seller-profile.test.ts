import { describe, expect, it } from 'vitest';
import { parseSellerProfileDateRange, summarizeSellerFinancials } from './admin-seller-profile';

describe('admin seller profile helpers', () => {
	it('creates an inclusive date range with an exclusive next-day boundary', () => {
		const range = parseSellerProfileDateRange({ from: '2026-08-01', to: '2026-08-07' });
		expect(range.valid).toBe(true);
		expect(range.fromDate?.toISOString()).toBe('2026-08-01T00:00:00.000Z');
		expect(range.toDateExclusive?.toISOString()).toBe('2026-08-08T00:00:00.000Z');
	});

	it('rejects malformed and reversed ranges without querying an unsafe interval', () => {
		expect(parseSellerProfileDateRange({ from: '2026-02-30', to: '2026-03-01' }).valid).toBe(false);
		expect(parseSellerProfileDateRange({ from: '2026-08-08', to: '2026-08-01' }).valid).toBe(false);
	});

	it('combines immutable ledger money with current settlement status totals', () => {
		const summary = summarizeSellerFinancials([
			{ entryType: 'INITIAL', _sum: { grossCents: 10_000, discountCents: 500, commissionCents: 190, refundCents: 0, reversalCents: 0, sellerPayableCents: 9_310 } },
			{ entryType: 'REFUND', _sum: { grossCents: 0, discountCents: 0, commissionCents: 0, refundCents: 1_000, reversalCents: 0, sellerPayableCents: -980 } },
			{ entryType: 'REVERSAL', _sum: { grossCents: 0, discountCents: 0, commissionCents: 0, refundCents: 0, reversalCents: 200, sellerPayableCents: -200 } },
		], [
			{ status: 'HELD', _sum: { sellerPayableCents: 4_000, remainingPayableCents: 4_000 } },
			{ status: 'RELEASED', _sum: { sellerPayableCents: 5_110, remainingPayableCents: 0 } },
			{ status: 'FAILED', _sum: { sellerPayableCents: 200, remainingPayableCents: 200 } },
		]);

		expect(summary).toMatchObject({
			grossCents: 10_000,
			discountCents: 500,
			commissionCents: 190,
			refundedCents: 1_000,
			reversedCents: 200,
			heldCents: 4_000,
			releasedCents: 5_110,
			failedCents: 200,
			outstandingCents: 4_200,
		});
	});
});

import { describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/db', () => ({ db: {} }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
import { dailyOfferPlan, offerWindow } from './rotation';

describe('daily sale rotation', () => {
	it('uses the scheduler boundary, including midnight and delayed retries', () => {
		expect(offerWindow(new Date('2026-10-10T07:59:59Z')).endsAt.toISOString()).toBe('2026-10-10T08:00:00.000Z');
		expect(offerWindow(new Date('2026-10-10T08:00:00Z')).bucket).toBe('2026-10-10T08:00:00.000Z');
		expect(offerWindow(new Date('2026-10-11T00:00:00Z')).bucket).toBe('2026-10-10T08:00:00.000Z');
	});
	it('is stable on retries and input order, changes daily, and distributes offers', () => {
		const ids = Array.from({ length: 120 }, (_, i) => `product-${i}`);
		const plan = dailyOfferPlan(ids, '2026-10-10');
		expect(dailyOfferPlan([...ids].reverse(), '2026-10-10')).toEqual(plan);
		expect(dailyOfferPlan(ids, '2026-10-11')).not.toEqual(plan);
		expect(new Set(plan.map(p => p.id)).size).toBe(120);
		expect(plan.every(p => p.discount >= 10 && p.discount <= 30)).toBe(true);
		expect(plan.filter(p => p.offer === 'flash-deals')).toHaveLength(20);
	});
});

import { describe, expect, it } from 'vitest';
import { couponTimestamp } from './coupon-dates';
import { CouponFormSchema, OfferTagFormSchema } from './schemas';

const input = {
	code: 'TIMEZONE', discount: 15, maxUses: 0, maxUsesPerUser: 0,
	startDate: '2026-10-03T12:00:00+06:00', endDate: '2026-10-03T13:00:00+06:00',
};
describe('coupon timestamps', () => {
	it('preserves the Dhaka picker instant when interpreted on a UTC server', () => {
		const previousTimezone = process.env.TZ;
		try {
			process.env.TZ = 'Asia/Dhaka';
			const submitted = couponTimestamp(new Date(2026, 9, 3, 12));
			process.env.TZ = 'UTC';
			expect(submitted).toBe('2026-10-03T06:00:00.000Z');
			expect(new Date(submitted).getUTCHours()).toBe(6);
			expect(CouponFormSchema.parse({ ...input, startDate: submitted }).maxUsesPerUser).toBe(0);
		} finally {
			if (previousTimezone === undefined) delete process.env.TZ;
			else process.env.TZ = previousTimezone;
		}
	});
	it.each(['2026-10-03T12:00:00', '2026-10-03', 'invalid'])('rejects ambiguous or invalid timestamps: %s', startDate => {
		expect(CouponFormSchema.safeParse({ ...input, startDate }).success).toBe(false);
	});
	it('compares actual instants across different offsets', () => {
		expect(CouponFormSchema.safeParse({ ...input, endDate: '2026-10-03T05:59:00Z' }).success).toBe(false);
		expect(CouponFormSchema.safeParse(input).success).toBe(true);
	});
	it('clearing the picker triggers validation instead of retaining its old date', () => {
		expect(couponTimestamp(null)).toBe('');
		expect(couponTimestamp('invalid')).toBe('');
		expect(CouponFormSchema.safeParse({ ...input, endDate: couponTimestamp(null) }).success).toBe(false);
	});
});
it('allows hyphenated offer names while rejecting HTML', () => {
	expect(OfferTagFormSchema.safeParse({ name: 'Back-to-school', url: 'back-to-school' }).success).toBe(true);
	expect(OfferTagFormSchema.safeParse({ name: '<script>alert(1)</script>', url: 'test' }).success).toBe(false);
});

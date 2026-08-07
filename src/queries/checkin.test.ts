import { describe, it, expect } from 'vitest';
import { CHECKIN_REWARDS } from '@/lib/checkin-constants';

describe('Daily Check-In Reward Schedule & Anti-Abuse Logic', () => {
	it('defines 31 days in reward schedule', () => {
		expect(Object.keys(CHECKIN_REWARDS).length).toBe(31);
	});

	it('grants milestone coupons on Days 7, 14, 21, and 28', () => {
		expect(CHECKIN_REWARDS[7].couponDiscount).toBe(10);
		expect(CHECKIN_REWARDS[14].couponDiscount).toBe(12);
		expect(CHECKIN_REWARDS[21].couponDiscount).toBe(15);
		expect(CHECKIN_REWARDS[28].couponDiscount).toBe(20);
	});

	it('ensures non-milestone days only grant GoCoins', () => {
		expect(CHECKIN_REWARDS[1].couponDiscount).toBeUndefined();
		expect(CHECKIN_REWARDS[5].couponDiscount).toBeUndefined();
		expect(CHECKIN_REWARDS[30].couponDiscount).toBeUndefined();
	});

	it('generates unique personal coupon code prefixes for milestone days', () => {
		expect(CHECKIN_REWARDS[7].couponCodePrefix).toBe('STREAK7');
		expect(CHECKIN_REWARDS[14].couponCodePrefix).toBe('STREAK14');
		expect(CHECKIN_REWARDS[21].couponCodePrefix).toBe('STREAK21');
		expect(CHECKIN_REWARDS[28].couponCodePrefix).toBe('STREAK28');
	});
});

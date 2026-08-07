import { describe, expect, it } from 'vitest';
import {
	coinsEarned,
	coinsToDiscount,
	discountToCoins,
	maxRedeemableCoins,
	validateRedemption,
	COINS_PER_DOLLAR_EARNED,
	COINS_PER_DOLLAR_REDEEMED,
	MIN_REDEEM_COINS,
	MAX_REDEEM_PERCENT,
} from './coins';

describe('GoCoins loyalty helpers', () => {
	it('calculates earned coins accurately (2 coins per $1)', () => {
		expect(coinsEarned(100)).toBe(200);
		expect(coinsEarned(82)).toBe(164);
		expect(coinsEarned(12.99)).toBe(25); // floor(12.99 * 2 = 25.98) -> 25
		expect(coinsEarned(0.49)).toBe(0);
		expect(coinsEarned(-10)).toBe(0);
	});

	it('converts coins to discount dollar amount (100 coins = $1)', () => {
		expect(coinsToDiscount(100)).toBe(1.0);
		expect(coinsToDiscount(500)).toBe(5.0);
		expect(coinsToDiscount(1250)).toBe(12.5);
		expect(coinsToDiscount(0)).toBe(0);
	});

	it('converts dollars to coins', () => {
		expect(discountToCoins(1.0)).toBe(100);
		expect(discountToCoins(5.5)).toBe(550);
		expect(discountToCoins(0)).toBe(0);
	});

	it('calculates max redeemable coins capped at 30% of subTotal', () => {
		// $100 subtotal -> 30% is $30 max discount -> 3,000 coins
		expect(maxRedeemableCoins(100)).toBe(3000);
		// $50 subtotal -> 30% is $15 max discount -> 1,500 coins
		expect(maxRedeemableCoins(50)).toBe(1500);
		// $0 subtotal -> 0
		expect(maxRedeemableCoins(0)).toBe(0);
	});

	it('validates redemption rules correctly', () => {
		// Valid 0 redemption
		expect(validateRedemption(500, 0, 100)).toEqual({ valid: true });

		// Valid 500 coins redemption on $100 subtotal (max allowed is 3,000)
		expect(validateRedemption(1000, 500, 100)).toEqual({ valid: true });

		// Reject below 100 minimum
		const minCheck = validateRedemption(1000, 50, 100);
		expect(minCheck.valid).toBe(false);
		expect(minCheck.error).toContain('Minimum redemption is 100');

		// Reject exceeding user balance
		const balanceCheck = validateRedemption(200, 500, 100);
		expect(balanceCheck.valid).toBe(false);
		expect(balanceCheck.error).toContain('Insufficient GoCoins balance');

		// Reject exceeding 30% subtotal cap (e.g. 2,000 coins = $20 on $50 subtotal where max is $15 / 1,500 coins)
		const capCheck = validateRedemption(5000, 2000, 50);
		expect(capCheck.valid).toBe(false);
		expect(capCheck.error).toContain('Cannot redeem more than 30%');
	});
});

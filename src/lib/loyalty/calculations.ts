// Shared loyalty calculations used by the browser and server.
export const COINS_PER_DOLLAR_EARNED = 2;
export const COINS_PER_DOLLAR_REDEEMED = 100;
export const MIN_REDEEM_COINS = 100;
export const MAX_REDEEM_PERCENT = 0.3;

export function coinsEarned(amountPaid: number): number {
  if (amountPaid <= 0) return 0;
  return Math.floor(amountPaid * COINS_PER_DOLLAR_EARNED);
}

export function coinsToDiscount(coins: number): number {
  if (coins <= 0) return 0;
  return Number((coins / COINS_PER_DOLLAR_REDEEMED).toFixed(2));
}

export function discountToCoins(dollars: number): number {
  if (dollars <= 0) return 0;
  return Math.round(dollars * COINS_PER_DOLLAR_REDEEMED);
}

export function maxRedeemableCoins(subTotal: number): number {
  if (subTotal <= 0) return 0;
  // 30% of subTotal converted to coins (e.g. $100 subTotal -> $30 max discount -> 3,000 coins)
  return Math.floor(subTotal * MAX_REDEEM_PERCENT * COINS_PER_DOLLAR_REDEEMED);
}

export function validateRedemption(
  balance: number,
  requested: number,
  subTotal: number,
): { valid: boolean; error?: string } {
  if (requested <= 0) {
    return { valid: true };
  }

  if (requested < MIN_REDEEM_COINS) {
    return {
      valid: false,
      error: `Minimum redemption is ${MIN_REDEEM_COINS} GoCoins ($${(MIN_REDEEM_COINS / COINS_PER_DOLLAR_REDEEMED).toFixed(2)}).`,
    };
  }

  if (requested > balance) {
    return {
      valid: false,
      error: `Insufficient GoCoins balance. You have ${balance} coins.`,
    };
  }

  const maxCoins = maxRedeemableCoins(subTotal);
  if (requested > maxCoins) {
    return {
      valid: false,
      error: `Cannot redeem more than 30% of product subtotal (${maxCoins} GoCoins / $${(maxCoins / COINS_PER_DOLLAR_REDEEMED).toFixed(2)}).`,
    };
  }

  return { valid: true };
}


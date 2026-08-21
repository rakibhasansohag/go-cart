import { PrismaClient } from "@prisma/client";

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

// Database transaction operations
type DbTransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export async function getOrCreateAccount(
  tx: DbTransactionClient,
  userId: string,
) {
  const existing = await tx.loyaltyAccount.findUnique({
    where: { userId },
  });
  if (existing) return existing;

  return tx.loyaltyAccount.create({
    data: {
      userId,
      balance: 0,
      lifetimeEarned: 0,
    },
  });
}

export async function awardCoins(
  tx: DbTransactionClient,
  input: {
    userId: string;
    orderId: string;
    amountPaid: number;
    idempotencyKey: string;
  },
) {
  const pointsToEarn = coinsEarned(input.amountPaid);
  if (pointsToEarn <= 0) return null;

  const account = await getOrCreateAccount(tx, input.userId);

  // Check if already awarded for this idempotencyKey
  const existingTx = await tx.loyaltyTransaction.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existingTx) {
    return existingTx;
  }

  const transaction = await tx.loyaltyTransaction.create({
    data: {
      accountId: account.id,
      orderId: input.orderId,
      type: "EARN",
      points: pointsToEarn,
      idempotencyKey: input.idempotencyKey,
      note: `Earned ${pointsToEarn} GoCoins on paid order`,
    },
  });

  const updatedAccount = await tx.loyaltyAccount.update({
    where: { id: account.id },
    data: {
      balance: { increment: pointsToEarn },
      lifetimeEarned: { increment: pointsToEarn },
    },
  });

  // Emit in-app notification for earned coins
  try {
    const domainEvent = await tx.domainEvent.create({
      data: {
        eventKey: `gocoin.earned:${input.idempotencyKey}`,
        eventType: "gocoin.earned",
        aggregateType: "LOYALTY_ACCOUNT",
        aggregateId: account.id,
        actorUserId: input.userId,
        payload: {
          coinsEarned: pointsToEarn,
          newBalance: updatedAccount.balance,
          orderId: input.orderId,
        },
      },
    });

    await tx.notification.create({
      data: {
        sourceEventId: domainEvent.id,
        recipientId: input.userId,
        category: "SYSTEM",
        eventType: "gocoin.earned",
        title: `You earned ${pointsToEarn.toLocaleString()} GoCoins!`,
        message: `Order payment confirmed. ${pointsToEarn.toLocaleString()} GoCoins added to your balance.`,
        actionUrl: "/profile/rewards",
      },
    });
  } catch (notifErr) {
    console.warn("Failed to publish GoCoins notification:", notifErr);
  }

  return transaction;
}

export async function redeemCoins(
  tx: DbTransactionClient,
  input: {
    userId: string;
    orderId: string;
    coins: number;
    idempotencyKey: string;
  },
) {
  if (input.coins <= 0) return null;

  const account = await getOrCreateAccount(tx, input.userId);

  const existingTx = await tx.loyaltyTransaction.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existingTx) {
    return existingTx;
  }

  const discount = coinsToDiscount(input.coins);

  // Decrement only when the account still has enough balance. This conditional
  // update is atomic at the database level and prevents concurrent redemptions
  // from overspending the same GoCoins balance.
  const debited = await tx.loyaltyAccount.updateMany({
    where: { id: account.id, balance: { gte: input.coins } },
    data: { balance: { decrement: input.coins } },
  });
  if (debited.count !== 1) {
    throw new Error("Insufficient GoCoins balance.");
  }

  const transaction = await tx.loyaltyTransaction.create({
    data: {
      accountId: account.id,
      orderId: input.orderId,
      type: "REDEEM",
      points: -input.coins,
      idempotencyKey: input.idempotencyKey,
      note: `Redeemed ${input.coins} GoCoins ($${discount.toFixed(2)} discount)`,
    },
  });

  await tx.loyaltyRedemption.create({
    data: {
      accountId: account.id,
      orderId: input.orderId,
      points: input.coins,
      discount,
    },
  });

  return transaction;
}

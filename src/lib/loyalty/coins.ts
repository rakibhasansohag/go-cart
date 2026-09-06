import { LoyaltyTxType, Prisma, PrismaClient } from "@prisma/client";
import { DOMAIN_EVENT_TYPES, publishDomainEvent } from "@/lib/notifications/domain-events";

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
type DbTransactionClient = Prisma.TransactionClient | Omit<
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

  // Check if already awarded for this idempotencyKey or for this order's EARN event
  const existingTx = await tx.loyaltyTransaction.findFirst({
    where: {
      OR: [
        { idempotencyKey: input.idempotencyKey },
        { orderId: input.orderId, type: LoyaltyTxType.EARN },
      ],
    },
  });
  if (existingTx) {
    return existingTx;
  }

  const transaction = await tx.loyaltyTransaction.create({
    data: {
      accountId: account.id,
      orderId: input.orderId,
      type: LoyaltyTxType.EARN,
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

  // Emit in-app notification for earned coins through the typed domain event pipeline
  try {
    await publishDomainEvent(tx, {
      eventKey: `gocoin.earned:${input.idempotencyKey}`,
      eventType: DOMAIN_EVENT_TYPES.GOCOIN_EARNED,
      aggregateType: "LOYALTY_ACCOUNT",
      aggregateId: account.id,
      actorUserId: input.userId,
      orderId: input.orderId,
      payload: {
        coinsEarned: pointsToEarn,
        newBalance: updatedAccount.balance,
        orderId: input.orderId,
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
      type: LoyaltyTxType.REDEEM,
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

  // Emit in-app notification for redeemed coins through typed pipeline
  try {
    const updated = await tx.loyaltyAccount.findUnique({ where: { id: account.id } });
    await publishDomainEvent(tx, {
      eventKey: `gocoin.redeemed:${input.idempotencyKey}`,
      eventType: DOMAIN_EVENT_TYPES.GOCOIN_REDEEMED,
      aggregateType: "LOYALTY_ACCOUNT",
      aggregateId: account.id,
      actorUserId: input.userId,
      orderId: input.orderId,
      payload: {
        coinsRedeemed: input.coins,
        newBalance: updated?.balance ?? 0,
        orderId: input.orderId,
        discount,
      },
    });
  } catch (notifErr) {
    console.warn("Failed to publish GoCoins redemption notification:", notifErr);
  }

  return transaction;
}

export async function reconcileCoinsForRefund(
  tx: DbTransactionClient,
  input: {
    orderId: string;
    refundAmount: number;
    returnRequestId?: string;
    actorUserId?: string;
    reason?: string;
  },
) {
  if (input.refundAmount <= 0) return null;

  const order = await tx.order.findUnique({
    where: { id: input.orderId },
    include: {
      loyaltyRedemption: true,
    },
  });
  if (!order) return null;

  const account = await getOrCreateAccount(tx, order.userId);
  const identifierSuffix = input.returnRequestId || input.orderId;

  // 1. Claw back earned coins proportionally: 2 coins per $1 refunded
  const coinsToClawback = Math.floor(input.refundAmount * COINS_PER_DOLLAR_EARNED);
  const clawbackKey = `refund-clawback:${identifierSuffix}`;
  let existingClawback = await tx.loyaltyTransaction.findUnique({
    where: { idempotencyKey: clawbackKey },
  });

  let clawedBackPoints = 0;
  if (!existingClawback && coinsToClawback > 0) {
    // Check current balance to prevent balance < 0
    const currentAccount = await tx.loyaltyAccount.findUnique({ where: { id: account.id } });
    const currentBalance = currentAccount?.balance ?? 0;
    const actualDeduction = Math.min(currentBalance, coinsToClawback);

    if (actualDeduction > 0) {
      await tx.loyaltyAccount.update({
        where: { id: account.id },
        data: {
          balance: { decrement: actualDeduction },
          lifetimeEarned: { decrement: actualDeduction },
        },
      });
    }

    existingClawback = await tx.loyaltyTransaction.create({
      data: {
        accountId: account.id,
        orderId: order.id,
        type: LoyaltyTxType.ADJUSTMENT,
        points: -coinsToClawback,
        idempotencyKey: clawbackKey,
        note: `GoCoins adjustment for refunded order (${input.reason || "Refund"})`,
      },
    });
    clawedBackPoints = coinsToClawback;
  }

  // 2. Restore redeemed coins proportionally if customer used GoCoins on this order
  const restoreKey = `refund-restore:${identifierSuffix}`;
  let existingRestore = await tx.loyaltyTransaction.findUnique({
    where: { idempotencyKey: restoreKey },
  });

  let restoredPoints = 0;
  if (!existingRestore && order.coinDiscount > 0 && order.loyaltyRedemption) {
    const totalRedeemed = order.loyaltyRedemption.points;
    const ratio = order.total > 0 ? Math.min(1, input.refundAmount / order.total) : 1;
    const coinsToRestore = Math.min(totalRedeemed, Math.round(totalRedeemed * ratio));

    if (coinsToRestore > 0) {
      await tx.loyaltyAccount.update({
        where: { id: account.id },
        data: {
          balance: { increment: coinsToRestore },
        },
      });

      existingRestore = await tx.loyaltyTransaction.create({
        data: {
          accountId: account.id,
          orderId: order.id,
          type: LoyaltyTxType.REFUND,
          points: coinsToRestore,
          idempotencyKey: restoreKey,
          note: `Restored ${coinsToRestore} GoCoins from refund of order`,
        },
      });
      restoredPoints = coinsToRestore;
    }
  }

  // Emit reversal notification if any adjustment or restore occurred
  if (clawedBackPoints > 0 || restoredPoints > 0) {
    try {
      const refreshedAccount = await tx.loyaltyAccount.findUnique({ where: { id: account.id } });
      await publishDomainEvent(tx, {
        eventKey: `gocoin.reversed:${identifierSuffix}`,
        eventType: DOMAIN_EVENT_TYPES.GOCOIN_REVERSED,
        aggregateType: "LOYALTY_ACCOUNT",
        aggregateId: account.id,
        actorUserId: order.userId,
        orderId: order.id,
        payload: {
          orderId: order.id,
          coinsReversed: -clawedBackPoints + restoredPoints,
          newBalance: refreshedAccount?.balance ?? 0,
          reason: input.reason || "Order refund processed",
        },
      });
    } catch (notifErr) {
      console.warn("Failed to publish GoCoins refund reversal notification:", notifErr);
    }
  }

  return {
    clawback: existingClawback,
    restoration: existingRestore,
  };
}

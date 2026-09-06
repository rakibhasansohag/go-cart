import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/notifications/domain-events', () => ({
	DOMAIN_EVENT_TYPES: {
		GOCOIN_EARNED: 'gocoin.earned',
		GOCOIN_REDEEMED: 'gocoin.redeemed',
		GOCOIN_REVERSED: 'gocoin.reversed',
	},
	publishDomainEvent: vi.fn().mockResolvedValue({ id: 'evt-mock' }),
}));

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

describe('GoCoins transactional operations', () => {
	it('awards coins idempotently without double crediting', async () => {
		const { awardCoins } = await import('./coins');
		let account = { id: 'acc-1', userId: 'user-1', balance: 0, lifetimeEarned: 0 };
		const createdTransactions: Array<{ id: string; points: number; idempotencyKey: string; type: string }> = [];

		const mockTx = {
			loyaltyAccount: {
				findUnique: vi.fn().mockImplementation(async () => account),
				create: vi.fn(),
				update: vi.fn().mockImplementation(async ({ data }: { data: { balance: { increment: number }; lifetimeEarned: { increment: number } } }) => {
					account = {
						...account,
						balance: account.balance + data.balance.increment,
						lifetimeEarned: account.lifetimeEarned + data.lifetimeEarned.increment,
					};
					return account;
				}),
			},
			loyaltyTransaction: {
				findFirst: vi.fn().mockImplementation(async ({ where }: { where: { OR: Array<{ idempotencyKey?: string; orderId?: string }> } }) => {
					return createdTransactions.find(t => t.idempotencyKey === where.OR[0]?.idempotencyKey || t.id === 'tx-1') ?? null;
				}),
				create: vi.fn().mockImplementation(async ({ data }: { data: { points: number; idempotencyKey: string; type: string } }) => {
					const record = { id: 'tx-1', ...data };
					createdTransactions.push(record);
					return record;
				}),
			},
			domainEvent: {
				create: vi.fn().mockResolvedValue({ id: 'evt-1' }),
				upsert: vi.fn().mockResolvedValue({ id: 'evt-1' }),
			},
			notification: {
				create: vi.fn().mockResolvedValue({ id: 'notif-1' }),
				upsert: vi.fn().mockResolvedValue({ id: 'notif-1' }),
			},
			notificationDeliveryAudit: { upsert: vi.fn().mockResolvedValue({}) },
			notificationPreference: { findMany: vi.fn().mockResolvedValue([]) },
			user: { findMany: vi.fn().mockResolvedValue([{ id: 'user-1', email: 'test@example.com', role: 'USER' }]) },
		};

		// First award
		const res1 = await awardCoins(mockTx as unknown as Parameters<typeof awardCoins>[0], {
			userId: 'user-1',
			orderId: 'order-1',
			amountPaid: 50,
			idempotencyKey: 'order:order-1:paid:earn',
		});

		expect(res1?.points).toBe(100);
		expect(account.balance).toBe(100);
		expect(mockTx.loyaltyTransaction.create).toHaveBeenCalledTimes(1);

		// Duplicate call with same order/idempotency key
		const res2 = await awardCoins(mockTx as unknown as Parameters<typeof awardCoins>[0], {
			userId: 'user-1',
			orderId: 'order-1',
			amountPaid: 50,
			idempotencyKey: 'order:order-1:paid:earn',
		});

		expect(res2?.points).toBe(100);
		expect(account.balance).toBe(100); // Does NOT double credit
		expect(mockTx.loyaltyTransaction.create).toHaveBeenCalledTimes(1); // Still 1
	});

	it('redeems coins atomically and rejects overdraft', async () => {
		const { redeemCoins } = await import('./coins');
		let account = { id: 'acc-2', userId: 'user-2', balance: 200, lifetimeEarned: 200 };

		const mockTx = {
			loyaltyAccount: {
				findUnique: vi.fn().mockImplementation(async () => account),
				updateMany: vi.fn().mockImplementation(async ({ where, data }: { where: { balance: { gte: number } }; data: { balance: { decrement: number } } }) => {
					if (account.balance >= where.balance.gte) {
						account = { ...account, balance: account.balance - data.balance.decrement };
						return { count: 1 };
					}
					return { count: 0 };
				}),
			},
			loyaltyTransaction: {
				findUnique: vi.fn().mockResolvedValue(null),
				create: vi.fn().mockImplementation(async ({ data }: { data: unknown }) => data),
			},
			loyaltyRedemption: {
				create: vi.fn().mockResolvedValue({}),
			},
			domainEvent: {
				create: vi.fn().mockResolvedValue({ id: 'evt-2' }),
				upsert: vi.fn().mockResolvedValue({ id: 'evt-2' }),
			},
			notification: {
				create: vi.fn().mockResolvedValue({ id: 'notif-2' }),
				upsert: vi.fn().mockResolvedValue({ id: 'notif-2' }),
			},
			notificationDeliveryAudit: { upsert: vi.fn().mockResolvedValue({}) },
			notificationPreference: { findMany: vi.fn().mockResolvedValue([]) },
			user: { findMany: vi.fn().mockResolvedValue([{ id: 'user-2', email: 'test2@example.com', role: 'USER' }]) },
		};

		// Successful redemption of 150 coins
		await redeemCoins(mockTx as unknown as Parameters<typeof redeemCoins>[0], {
			userId: 'user-2',
			orderId: 'order-2',
			coins: 150,
			idempotencyKey: 'redeem:order-2',
		});

		expect(account.balance).toBe(50);

		// Second redemption of 100 coins should throw because only 50 left
		await expect(
			redeemCoins(mockTx as unknown as Parameters<typeof redeemCoins>[0], {
				userId: 'user-2',
				orderId: 'order-3',
				coins: 100,
				idempotencyKey: 'redeem:order-3',
			}),
		).rejects.toThrow('Insufficient GoCoins balance.');
	});

	it('reconciles coins on refund: claws back earned and restores redeemed without negative balance', async () => {
		const { reconcileCoinsForRefund } = await import('./coins');
		let account = { id: 'acc-3', userId: 'user-3', balance: 50, lifetimeEarned: 200 };

		const mockTx = {
			order: {
				findUnique: vi.fn().mockResolvedValue({
					id: 'order-refund-1',
					userId: 'user-3',
					total: 100,
					coinDiscount: 2, // $2 discount
					loyaltyRedemption: { points: 200 }, // 200 coins redeemed originally
				}),
			},
			loyaltyAccount: {
				findUnique: vi.fn().mockImplementation(async () => account),
				update: vi.fn().mockImplementation(async ({ data }: { data: { balance?: { decrement?: number; increment?: number }; lifetimeEarned?: { decrement?: number } } }) => {
					if (data.balance?.decrement) {
						account.balance -= data.balance.decrement;
					}
					if (data.balance?.increment) {
						account.balance += data.balance.increment;
					}
					if (data.lifetimeEarned?.decrement) {
						account.lifetimeEarned -= data.lifetimeEarned.decrement;
					}
					return account;
				}),
			},
			loyaltyTransaction: {
				findUnique: vi.fn().mockResolvedValue(null),
				create: vi.fn().mockImplementation(async ({ data }: { data: unknown }) => data),
			},
			domainEvent: {
				create: vi.fn().mockResolvedValue({ id: 'evt-3' }),
				upsert: vi.fn().mockResolvedValue({ id: 'evt-3' }),
			},
			notification: {
				create: vi.fn().mockResolvedValue({ id: 'notif-3' }),
				upsert: vi.fn().mockResolvedValue({ id: 'notif-3' }),
			},
			notificationDeliveryAudit: { upsert: vi.fn().mockResolvedValue({}) },
			notificationPreference: { findMany: vi.fn().mockResolvedValue([]) },
			user: { findMany: vi.fn().mockResolvedValue([{ id: 'user-3', email: 'test3@example.com', role: 'USER' }]) },
		};

		// Refund $100 (full refund)
		// Earned coins to clawback = 100 * 2 = 200 coins. But balance is only 50!
		// Deducts actual 50 (never negative balance).
		// Redeemed coins restored = 200 coins.
		const result = await reconcileCoinsForRefund(mockTx as unknown as Parameters<typeof reconcileCoinsForRefund>[0], {
			orderId: 'order-refund-1',
			refundAmount: 100,
			returnRequestId: 'ret-1',
			reason: 'Defective item refund',
		});

		expect(result).not.toBeNull();
		// Balance started at 50, deducted 50 (down to 0), then restored 200 (up to 200)
		expect(account.balance).toBe(200);
		expect(mockTx.loyaltyTransaction.create).toHaveBeenCalledTimes(2); // 1 ADJUSTMENT + 1 REFUND
	});
});

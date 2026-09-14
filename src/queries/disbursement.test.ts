import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettlementStatus } from '@prisma/client';

const harness = vi.hoisted(() => ({
	auth: vi.fn(),
	db: {
		user: { findUnique: vi.fn() },
		sellerSettlement: { findUnique: vi.fn(), update: vi.fn() },
		sellerPaymentAccount: { findUnique: vi.fn() },
		settlementLedgerEntry: { create: vi.fn() },
		$transaction: vi.fn(),
	},
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: harness.auth }));
vi.mock('@/lib/db', () => ({ db: harness.db }));

import { processSellerDisbursement } from './disbursement';

describe('processSellerDisbursement query', () => {
	const mockTransferCreator = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		harness.db.$transaction.mockImplementation(async (callback: (tx: typeof harness.db) => Promise<unknown>) => {
			return callback(harness.db);
		});
	});

	it('rejects unauthenticated caller', async () => {
		harness.auth.mockResolvedValue({ userId: null });
		await expect(
			processSellerDisbursement({ settlementId: 'settle-1' }, mockTransferCreator),
		).rejects.toThrow('Unauthenticated.');
	});

	it('rejects non-admin user role', async () => {
		harness.auth.mockResolvedValue({ userId: 'user-seller' });
		harness.db.user.findUnique.mockResolvedValue({ role: 'SELLER' });

		await expect(
			processSellerDisbursement({ settlementId: 'settle-1' }, mockTransferCreator),
		).rejects.toThrow('Admin privileges required');
	});

	it('rejects non-payable settlement status', async () => {
		harness.auth.mockResolvedValue({ userId: 'admin-1' });
		harness.db.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
		harness.db.sellerSettlement.findUnique.mockResolvedValue({
			id: 'settle-1',
			status: SettlementStatus.HELD,
			remainingPayableCents: 5000,
			sellerId: 'seller-1',
		});

		await expect(
			processSellerDisbursement({ settlementId: 'settle-1' }, mockTransferCreator),
		).rejects.toThrow('Only APPROVED or ELIGIBLE settlements are payable');
	});

	it('blocks settlement if seller payout account is not transfer-ready', async () => {
		harness.auth.mockResolvedValue({ userId: 'admin-1' });
		harness.db.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
		harness.db.sellerSettlement.findUnique.mockResolvedValue({
			id: 'settle-1',
			status: SettlementStatus.APPROVED,
			remainingPayableCents: 5000,
			sellerId: 'seller-1',
		});
		harness.db.sellerPaymentAccount.findUnique.mockResolvedValue({
			status: 'RESTRICTED',
			transfersCapability: 'inactive',
			country: 'US',
		});

		const result = await processSellerDisbursement(
			{ settlementId: 'settle-1' },
			mockTransferCreator,
		);

		expect(result.success).toBe(false);
		expect(result.error).toContain('not transfer-ready');
		expect(harness.db.sellerSettlement.update).toHaveBeenCalledWith({
			where: { id: 'settle-1' },
			data: expect.objectContaining({ status: SettlementStatus.BLOCKED }),
		});
		expect(mockTransferCreator).not.toHaveBeenCalled();
	});

	it('handles zero payable amount without calling transfer creator', async () => {
		harness.auth.mockResolvedValue({ userId: 'admin-1' });
		harness.db.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
		harness.db.sellerSettlement.findUnique.mockResolvedValue({
			id: 'settle-1',
			status: SettlementStatus.APPROVED,
			remainingPayableCents: 0,
			sellerId: 'seller-1',
		});
		harness.db.sellerPaymentAccount.findUnique.mockResolvedValue({
			status: 'ACTIVE',
			transfersCapability: 'active',
			country: 'US',
		});

		const result = await processSellerDisbursement(
			{ settlementId: 'settle-1' },
			mockTransferCreator,
		);

		expect(result.success).toBe(true);
		expect(result.amountCents).toBe(0);
		expect(mockTransferCreator).not.toHaveBeenCalled();
		expect(harness.db.sellerSettlement.update).toHaveBeenCalledWith({
			where: { id: 'settle-1' },
			data: expect.objectContaining({ status: SettlementStatus.RELEASED }),
		});
	});

	it('successfully processes disbursement and records ledger payout', async () => {
		harness.auth.mockResolvedValue({ userId: 'admin-1' });
		harness.db.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
		harness.db.sellerSettlement.findUnique.mockResolvedValue({
			id: 'settle-1',
			status: SettlementStatus.APPROVED,
			remainingPayableCents: 7500,
			sellerId: 'seller-1',
		});
		harness.db.sellerPaymentAccount.findUnique.mockResolvedValue({
			status: 'ACTIVE',
			transfersCapability: 'active',
			country: 'US',
			providerAccountId: 'acct_stripe_123',
		});
		harness.db.sellerSettlement.update
			.mockResolvedValueOnce({ transferAttempt: 1 })
			.mockResolvedValueOnce({ id: 'settle-1', status: SettlementStatus.RELEASED });

		mockTransferCreator.mockResolvedValue({ id: 'tr_12345' });

		const result = await processSellerDisbursement(
			{ settlementId: 'settle-1' },
			mockTransferCreator,
		);

		expect(result).toEqual({
			success: true,
			settlementId: 'settle-1',
			transferId: 'tr_12345',
			amountCents: 7500,
		});
		expect(mockTransferCreator).toHaveBeenCalledWith({
			amountCents: 7500,
			destination: 'acct_stripe_123',
			idempotencyKey: 'settlement:transfer:settle-1:1',
			settlementId: 'settle-1',
			transferAttempt: 1,
		});
		expect(harness.db.settlementLedgerEntry.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				settlementId: 'settle-1',
				entryType: 'PAYOUT',
				sellerPayableCents: -7500,
				metadata: { providerTransferId: 'tr_12345' },
			}),
		});
	});

	it('handles transfer failure with status update to FAILED', async () => {
		harness.auth.mockResolvedValue({ userId: 'admin-1' });
		harness.db.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
		harness.db.sellerSettlement.findUnique.mockResolvedValue({
			id: 'settle-1',
			status: SettlementStatus.ELIGIBLE,
			remainingPayableCents: 5000,
			sellerId: 'seller-1',
		});
		harness.db.sellerPaymentAccount.findUnique.mockResolvedValue({
			status: 'ACTIVE',
			transfersCapability: 'active',
			country: 'US',
			providerAccountId: 'acct_stripe_123',
		});
		harness.db.sellerSettlement.update.mockResolvedValueOnce({ transferAttempt: 2 });
		mockTransferCreator.mockRejectedValue(new Error('Stripe transfer declined'));

		const result = await processSellerDisbursement(
			{ settlementId: 'settle-1' },
			mockTransferCreator,
		);

		expect(result.success).toBe(false);
		expect(result.error).toBe('Stripe transfer declined');
		expect(harness.db.sellerSettlement.update).toHaveBeenCalledWith({
			where: { id: 'settle-1' },
			data: {
				status: SettlementStatus.FAILED,
				failureReason: 'Stripe transfer declined',
			},
		});
		expect(harness.db.settlementLedgerEntry.create).not.toHaveBeenCalled();
	});
});

import { beforeEach, expect, it, vi } from 'vitest';
const h = vi.hoisted(() => ({
	db: { returnRequest: { findUnique: vi.fn() }, sellerSettlement: { findUnique: vi.fn() }, $transaction: vi.fn() },
	tx: { settlementLedgerEntry: { findUnique: vi.fn(), create: vi.fn() }, sellerSettlement: { findUniqueOrThrow: vi.fn(), update: vi.fn() } },
}));
vi.mock('@/lib/db', () => ({ db: h.db }));
vi.mock('@/lib/payments/stripe-client', () => ({ getStripeClient: vi.fn() }));
import { recordRefundForReturnRequest } from './service';
beforeEach(() => {
	vi.clearAllMocks();
	h.db.returnRequest.findUnique.mockResolvedValue({ orderGroupId: 'group' });
	h.db.sellerSettlement.findUnique.mockResolvedValue({ id: 'settlement', commissionPercent: 2 });
	h.db.$transaction.mockImplementation((callback: (tx: typeof h.tx) => Promise<unknown>) => callback(h.tx));
	h.tx.settlementLedgerEntry.findUnique.mockResolvedValue(null);
	h.tx.settlementLedgerEntry.create.mockResolvedValue({ id: 'refund-entry' });
	h.tx.sellerSettlement.findUniqueOrThrow.mockResolvedValue({ id: 'settlement', status: 'HELD' });
});
it.each([[2500, 2450, 50], [500, 490, 10]])('splits a %i-cent return refund between seller and platform shares', async (gross, seller, commission) => {
	await recordRefundForReturnRequest('return', gross);
	expect(h.tx.settlementLedgerEntry.create).toHaveBeenCalledWith({ data: expect.objectContaining({ refundCents: gross, sellerPayableCents: -seller, commissionCents: -commission }) });
	expect(h.tx.sellerSettlement.update).toHaveBeenCalledWith({ where: { id: 'settlement' }, data: expect.objectContaining({ remainingPayableCents: { decrement: seller } }) });
});
it('records a platform-funded refund when the seller share is zero', async () => {
	h.db.sellerSettlement.findUnique.mockResolvedValue({ id: 'settlement', commissionPercent: 100 });
	await recordRefundForReturnRequest('return', 2500);
	expect(h.tx.sellerSettlement.update).toHaveBeenCalledWith({ where: { id: 'settlement' }, data: expect.objectContaining({ remainingPayableCents: { decrement: 0 } }) });
});
it('does not debit either share again when the refund ledger entry already exists', async () => {
	h.tx.settlementLedgerEntry.findUnique.mockResolvedValue({ id: 'existing-refund' });
	await expect(recordRefundForReturnRequest('return', 2500)).resolves.toEqual({ id: 'existing-refund' });
	expect(h.tx.settlementLedgerEntry.create).not.toHaveBeenCalled();
	expect(h.tx.sellerSettlement.update).not.toHaveBeenCalled();
});

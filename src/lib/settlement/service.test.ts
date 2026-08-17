import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dbMock } = vi.hoisted(() => ({
	dbMock: {
		platformSetting: { findUnique: vi.fn() },
		sellerSettlement: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), groupBy: vi.fn(), update: vi.fn() },
		orderGroup: { findUnique: vi.fn() },
		payoutBatch: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), update: vi.fn() },
	},
}));

vi.mock('@/lib/db', () => ({ db: dbMock }));
vi.mock('@/lib/payments/stripe-client', () => ({ getStripeClient: vi.fn() }));

import {
	payoutHoldDaysFromConfig,
	listPayoutBatches,
	listSellerSettlements,
	listSettlementOperations,
	processPayoutBatch,
	refreshSettlementEligibilityForOrderGroup,
	settlementReleaseAt,
} from './service';

describe('settlement payout hold configuration', () => {
	const deliveredAt = new Date('2026-08-14T00:00:00.000Z');

	it('uses the default seven-day hold when no override is supplied', () => {
		expect(settlementReleaseAt(deliveredAt)).toEqual(new Date('2026-08-21T00:00:00.000Z'));
	});

	it('allows zero days for sandbox payout testing', () => {
		expect(settlementReleaseAt(deliveredAt, 0)).toEqual(deliveredAt);
	});

	it('accepts whole-day values through the configured range', () => {
		expect(payoutHoldDaysFromConfig(30)).toBe(30);
		expect(payoutHoldDaysFromConfig(365)).toBe(365);
	});

	it('rejects invalid payout hold values', () => {
		expect(() => payoutHoldDaysFromConfig(-1)).toThrow('0 to 365');
		expect(() => payoutHoldDaysFromConfig(1.5)).toThrow('whole number');
	});
});

describe('settlement history pagination', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('uses stable database ordering and clamps an admin history page to the available range', async () => {
		dbMock.sellerSettlement.count.mockResolvedValue(26);
		dbMock.sellerSettlement.findMany.mockResolvedValue([]);

		const result = await listSettlementOperations({ page: 9 });

		expect(result.pagination).toEqual({ page: 2, pageSize: 25, total: 26, totalPages: 2 });
		expect(dbMock.sellerSettlement.findMany).toHaveBeenCalledWith(expect.objectContaining({
			orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: 25, take: 25,
		}));
	});

	it('paginates seller records at the store query and preserves ledger totals across pages', async () => {
		dbMock.sellerSettlement.count.mockResolvedValue(28);
		dbMock.sellerSettlement.findMany.mockResolvedValue([]);
		dbMock.sellerSettlement.groupBy.mockResolvedValue([
			{ status: 'BLOCKED', _sum: { sellerPayableCents: 0, remainingPayableCents: 300 } },
			{ status: 'RELEASED', _sum: { sellerPayableCents: 1200, remainingPayableCents: 0 } },
		]);

		const result = await listSellerSettlements({ sellerId: 'seller-1', storeUrl: 'crafts', page: 2 });

		expect(result.pagination).toEqual({ page: 2, pageSize: 25, total: 28, totalPages: 2 });
		expect(result.summary).toEqual({ heldCents: 300, releasedCents: 1200 });
		expect(dbMock.sellerSettlement.findMany).toHaveBeenCalledWith(expect.objectContaining({
			where: { sellerId: 'seller-1', orderGroup: { store: { url: 'crafts' } } }, skip: 25, take: 25,
		}));
	});

	it('keeps weekly batch history reachable beyond the old twenty-batch limit', async () => {
		dbMock.payoutBatch.count.mockResolvedValue(21);
		dbMock.payoutBatch.findMany.mockResolvedValue([]);

		const result = await listPayoutBatches({ page: 3 });

		expect(result.pagination).toEqual({ page: 3, pageSize: 10, total: 21, totalPages: 3 });
		expect(dbMock.payoutBatch.findMany).toHaveBeenCalledWith(expect.objectContaining({
			orderBy: [{ weekStart: 'desc' }, { id: 'desc' }], skip: 20, take: 10,
		}));
	});
});

describe('settlement delivery eligibility refresh', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('moves an old blocked settlement to eligible after delivery evidence', async () => {
		const deliveredAt = new Date('2026-08-14T00:00:00.000Z');
		dbMock.sellerSettlement.findUnique.mockResolvedValue({
			id: 'settlement-1',
			status: 'BLOCKED',
			payoutBatchId: null,
			providerTransferId: null,
			eligibleAt: null,
		});
		dbMock.platformSetting.findUnique.mockResolvedValue({ payoutHoldDays: 0, commissionPercent: 2 });
		dbMock.orderGroup.findUnique.mockResolvedValue({
			order: { paymentStatus: 'Paid' },
			items: [{ deliveredAt: null }],
			shipmentAssignments: [{ shipment: { status: 'DELIVERED', proofOfDeliveryAt: null, estimatedDeliveryAt: null, updatedAt: deliveredAt } }],
		});
		dbMock.sellerSettlement.update.mockResolvedValue({ id: 'settlement-1', status: 'ELIGIBLE' });

		await refreshSettlementEligibilityForOrderGroup('group-1', new Date('2026-08-15T00:00:00.000Z'));

		expect(dbMock.sellerSettlement.update).toHaveBeenCalledWith({
			where: { id: 'settlement-1' },
			data: { status: 'ELIGIBLE', eligibleAt: deliveredAt, failureReason: null },
		});
	});

	it('keeps a paid settlement blocked when delivery evidence is absent', async () => {
		dbMock.sellerSettlement.findUnique.mockResolvedValue({
			id: 'settlement-2',
			status: 'BLOCKED',
			payoutBatchId: null,
			providerTransferId: null,
			eligibleAt: null,
		});
		dbMock.platformSetting.findUnique.mockResolvedValue({ payoutHoldDays: 0, commissionPercent: 2 });
		dbMock.orderGroup.findUnique.mockResolvedValue({
			order: { paymentStatus: 'Paid' },
			items: [{ deliveredAt: null }],
			shipmentAssignments: [{ shipment: { status: 'IN_TRANSIT', proofOfDeliveryAt: null, estimatedDeliveryAt: null, updatedAt: new Date() } }],
		});

		const result = await refreshSettlementEligibilityForOrderGroup('group-2');

		expect(result?.status).toBe('BLOCKED');
		expect(dbMock.sellerSettlement.update).not.toHaveBeenCalled();
	});

	it('does not mark an empty approved batch as paid', async () => {
		dbMock.payoutBatch.findUnique.mockResolvedValue({
			id: 'batch-1',
			status: 'APPROVED',
			settlements: [],
		});

		await expect(processPayoutBatch('batch-1')).rejects.toThrow('no approved seller settlements');
		expect(dbMock.payoutBatch.update).not.toHaveBeenCalled();
	});
});

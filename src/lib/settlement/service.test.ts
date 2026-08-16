import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dbMock } = vi.hoisted(() => ({
	dbMock: {
		platformSetting: { findUnique: vi.fn() },
		sellerSettlement: { findUnique: vi.fn(), update: vi.fn() },
		orderGroup: { findUnique: vi.fn() },
		payoutBatch: { findUnique: vi.fn(), update: vi.fn() },
	},
}));

vi.mock('@/lib/db', () => ({ db: dbMock }));
vi.mock('@/lib/payments/stripe-client', () => ({ getStripeClient: vi.fn() }));

import {
	payoutHoldDaysFromConfig,
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

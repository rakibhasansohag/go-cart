import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReturnRequestStatus, Role } from '@prisma/client';

const {
	authMock,
	transactionMock,
	userFindUniqueMock,
	returnRequestFindUniqueMock,
	returnRequestFindUniqueOrThrowMock,
	returnRequestUpdateManyMock,
	returnEventCreateMock,
	returnItemUpdateManyMock,
	publishDomainEventMock,
} = vi.hoisted(() => ({
	authMock: vi.fn(),
	transactionMock: vi.fn(),
	userFindUniqueMock: vi.fn(),
	returnRequestFindUniqueMock: vi.fn(),
	returnRequestFindUniqueOrThrowMock: vi.fn(),
	returnRequestUpdateManyMock: vi.fn(),
	returnEventCreateMock: vi.fn(),
	returnItemUpdateManyMock: vi.fn(),
	publishDomainEventMock: vi.fn(),
}));

const txMock = {
	returnRequest: {
		findUnique: returnRequestFindUniqueMock,
		findUniqueOrThrow: returnRequestFindUniqueOrThrowMock,
		updateMany: returnRequestUpdateManyMock,
	},
	returnEvent: {
		create: returnEventCreateMock,
	},
	returnItem: {
		updateMany: returnItemUpdateManyMock,
	},
};

vi.mock('@clerk/nextjs/server', () => ({
	auth: authMock,
}));

vi.mock('@/lib/db', () => ({
	db: {
		$transaction: transactionMock,
		user: {
			findUnique: userFindUniqueMock,
		},
	},
}));

vi.mock('@/lib/notifications/domain-events', () => ({
	DOMAIN_EVENT_TYPES: {
		RETURN_REQUESTED: 'return.requested',
		RETURN_STATUS_CHANGED: 'return.status_changed',
		RETURN_DEADLINE_DUE: 'return.deadline_due',
		RETURN_DISPUTE_ESCALATED: 'return.dispute_escalated',
		EXCHANGE_APPROVED: 'exchange.approved',
	},
	publishDomainEvent: publishDomainEventMock,
}));

import { transitionReturnRequest } from './returns';
import { calculateRefundBreakdown } from '@/lib/returns/domain';

describe('Dispute Workflow and Refund/Return Consequences', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		transactionMock.mockImplementation(
			async (callback: (tx: typeof txMock) => unknown) => callback(txMock),
		);
		publishDomainEventMock.mockResolvedValue({ id: 'domain-event-id' });
	});

	describe('Seller Dispute Escalation', () => {
		it('allows the owning seller to escalate a contested return to an active dispute', async () => {
			authMock.mockResolvedValue({ userId: 'seller-user-id' });
			userFindUniqueMock.mockResolvedValue({ role: Role.SELLER });

			returnRequestFindUniqueMock.mockResolvedValue({
				id: 'return-req-1',
				customerId: 'customer-user-id',
				orderId: 'order-1',
				status: ReturnRequestStatus.REQUESTED,
				resolution: 'REFUND',
				refundAmount: 50.0,
				currency: 'USD',
				store: {
					userId: 'seller-user-id',
					name: 'Srank',
					url: 'srank',
					returnWindowDays: 14,
				},
				items: [
					{
						id: 'return-item-1',
						quantity: 1,
						orderItem: {
							name: 'Tailored Blazer',
							sku: 'BLZ-001',
							price: 50.0,
						},
					},
				],
			});

			returnRequestUpdateManyMock.mockResolvedValue({ count: 1 });
			returnEventCreateMock.mockResolvedValue({ id: 'evt-1' });
			returnRequestFindUniqueOrThrowMock.mockResolvedValue({
				id: 'return-req-1',
				status: ReturnRequestStatus.ESCALATED,
				items: [],
				events: [{ id: 'evt-1', status: ReturnRequestStatus.ESCALATED, createdAt: new Date() }],
			});

			const result = await transitionReturnRequest({
				returnRequestId: 'return-req-1',
				toStatus: ReturnRequestStatus.ESCALATED,
				note: 'Buyer claims defect, but product was verified intact before shipping.',
			});

			expect(result.status).toBe(ReturnRequestStatus.ESCALATED);
			expect(publishDomainEventMock).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					eventType: 'return.status_changed',
					aggregateId: 'return-req-1',
					payload: expect.objectContaining({
						nextStatus: 'Escalated',
					}),
				}),
			);
		});

		it('rejects an unauthorized user attempting to escalate another store’s return', async () => {
			authMock.mockResolvedValue({ userId: 'unauthorized-user' });
			userFindUniqueMock.mockResolvedValue({ role: Role.SELLER });

			returnRequestFindUniqueMock.mockResolvedValue({
				id: 'return-req-1',
				customerId: 'customer-user-id',
				status: ReturnRequestStatus.REQUESTED,
				store: {
					userId: 'seller-user-id',
				},
				items: [],
			});

			await expect(
				transitionReturnRequest({
					returnRequestId: 'return-req-1',
					toStatus: ReturnRequestStatus.ESCALATED,
				}),
			).rejects.toThrow('You do not have access');
		});
	});

	describe('Admin Dispute Resolution & Refund Calculation', () => {
		it('allows an administrator to intervene in an escalated dispute and approve it', async () => {
			authMock.mockResolvedValue({ userId: 'admin-user-id' });
			userFindUniqueMock.mockResolvedValue({ role: Role.ADMIN });

			returnRequestFindUniqueMock.mockResolvedValue({
				id: 'return-req-1',
				customerId: 'customer-user-id',
				orderId: 'order-1',
				status: ReturnRequestStatus.ESCALATED,
				resolution: 'REFUND',
				refundAmount: 50.0,
				currency: 'USD',
				store: {
					userId: 'seller-user-id',
					name: 'Srank',
					url: 'srank',
				},
				items: [
					{
						id: 'return-item-1',
						quantity: 1,
						orderItem: {
							name: 'Tailored Blazer',
							sku: 'BLZ-001',
							price: 50.0,
						},
					},
				],
			});

			returnRequestUpdateManyMock.mockResolvedValue({ count: 1 });
			returnEventCreateMock.mockResolvedValue({ id: 'evt-2' });
			returnRequestFindUniqueOrThrowMock.mockResolvedValue({
				id: 'return-req-1',
				status: ReturnRequestStatus.APPROVED,
				items: [],
				events: [{ id: 'evt-2', status: ReturnRequestStatus.APPROVED, createdAt: new Date() }],
			});

			const result = await transitionReturnRequest({
				returnRequestId: 'return-req-1',
				toStatus: ReturnRequestStatus.APPROVED,
				note: 'Admin approved after customer submitted photo evidence.',
			});

			expect(result.status).toBe(ReturnRequestStatus.APPROVED);
			expect(publishDomainEventMock).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					eventType: 'return.status_changed',
					aggregateId: 'return-req-1',
					payload: expect.objectContaining({
						nextStatus: 'Approved',
					}),
				}),
			);
		});

		it('allows an administrator to reject an escalated dispute and release return item claims', async () => {
			authMock.mockResolvedValue({ userId: 'admin-user-id' });
			userFindUniqueMock.mockResolvedValue({ role: Role.ADMIN });

			returnRequestFindUniqueMock.mockResolvedValue({
				id: 'return-req-1',
				customerId: 'customer-user-id',
				orderId: 'order-1',
				status: ReturnRequestStatus.ESCALATED,
				resolution: 'REFUND',
				refundAmount: 50.0,
				currency: 'USD',
				store: {
					userId: 'seller-user-id',
					name: 'Srank',
					url: 'srank',
				},
				items: [],
			});

			returnRequestUpdateManyMock.mockResolvedValue({ count: 1 });
			returnEventCreateMock.mockResolvedValue({ id: 'evt-3' });
			returnRequestFindUniqueOrThrowMock.mockResolvedValue({
				id: 'return-req-1',
				status: ReturnRequestStatus.REJECTED,
				items: [],
				events: [{ id: 'evt-3', status: ReturnRequestStatus.REJECTED, createdAt: new Date() }],
			});

			const result = await transitionReturnRequest({
				returnRequestId: 'return-req-1',
				toStatus: ReturnRequestStatus.REJECTED,
				note: 'Evidence does not substantiate defect. Dispute ruled in seller favor.',
			});

			expect(result.status).toBe(ReturnRequestStatus.REJECTED);
			// Rejection must release item claim so customer cannot claim more than eligible
			expect(returnItemUpdateManyMock).toHaveBeenCalledWith({
				where: { returnRequestId: 'return-req-1' },
				data: { activeRequestKey: null },
			});
			expect(publishDomainEventMock).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					eventType: 'return.status_changed',
					aggregateId: 'return-req-1',
					payload: expect.objectContaining({
						nextStatus: 'Rejected',
					}),
				}),
			);
		});

		it('accurately calculates monetary refund breakdown with proportional shipping and discounts', () => {
			const breakdown = calculateRefundBreakdown({
				unitPrice: 100,
				purchasedQuantity: 2,
				requestedQuantity: 1, // partial return: 1 of 2
				itemShippingFee: 10,
				couponDiscountPercent: 20, // 20% coupon
				itemTaxAmount: 0,
				returnShippingFees: true,
			});

			// Item subtotal: 100 * 1 = 100
			expect(breakdown.itemSubtotal).toBe(100);
			// Proportional shipping: 10 * (1 / 2) = 5
			expect(breakdown.shipping).toBe(5);
			// Coupon discount: (100 + 5) * 20% = 21
			expect(breakdown.couponDiscount).toBe(21);
			// Total refund: 100 + 5 - 21 = 84
			expect(breakdown.total).toBe(84);
		});
	});
});

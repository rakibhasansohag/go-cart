import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
	authMock,
	transactionMock,
	userFindUniqueMock,
	dbOrderItemFindFirstMock,
	orderItemFindFirstMock,
	returnRequestCreateMock,
	returnRequestFindUniqueMock,
	returnRequestUpdateManyMock,
	returnRequestFindUniqueOrThrowMock,
	returnItemUpdateManyMock,
	returnEventCreateMock,
	publishDomainEventMock,
} = vi.hoisted(() => ({
	authMock: vi.fn(),
	transactionMock: vi.fn(),
	userFindUniqueMock: vi.fn(),
	dbOrderItemFindFirstMock: vi.fn(),
	orderItemFindFirstMock: vi.fn(),
	returnRequestCreateMock: vi.fn(),
	returnRequestFindUniqueMock: vi.fn(),
	returnRequestUpdateManyMock: vi.fn(),
	returnRequestFindUniqueOrThrowMock: vi.fn(),
	returnItemUpdateManyMock: vi.fn(),
	returnEventCreateMock: vi.fn(),
	publishDomainEventMock: vi.fn(),
}));

const transactionClient = {
	orderItem: {
		findFirst: orderItemFindFirstMock,
	},
	returnRequest: {
		create: returnRequestCreateMock,
		findUnique: returnRequestFindUniqueMock,
		updateMany: returnRequestUpdateManyMock,
		findUniqueOrThrow: returnRequestFindUniqueOrThrowMock,
	},
	returnItem: {
		updateMany: returnItemUpdateManyMock,
	},
	returnEvent: {
		create: returnEventCreateMock,
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
		orderItem: {
			findFirst: dbOrderItemFindFirstMock,
		},
	},
}));

vi.mock('@/lib/notifications/domain-events', () => ({
	DOMAIN_EVENT_TYPES: { RETURN_REQUESTED: 'return.requested' },
	publishDomainEvent: publishDomainEventMock,
}));

import {
	createReturnRequest,
	getReturnCandidate,
	transitionReturnRequest,
} from './returns';

describe('return request service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		transactionMock.mockImplementation(
			async (callback: (tx: typeof transactionClient) => unknown) =>
				callback(transactionClient),
		);
	});

	it('requires authentication before reading an order item', async () => {
		authMock.mockResolvedValue({ userId: null });

		await expect(
			createReturnRequest({
				orderItemId: 'item-1',
				quantity: 1,
				reason: 'DAMAGED',
				resolution: 'REFUND',
			}),
		).rejects.toThrow('Please sign in');
		expect(transactionMock).not.toHaveBeenCalled();
	});

	it('rejects crafted enum values before starting a transaction', async () => {
		authMock.mockResolvedValue({ userId: 'customer-1' });

		await expect(
			createReturnRequest({
				orderItemId: 'item-1',
				quantity: 1,
				reason: 'NOT_A_REASON' as 'DAMAGED',
				resolution: 'REFUND',
			}),
		).rejects.toThrow('valid return reason');
		expect(transactionMock).not.toHaveBeenCalled();
	});

	it('rejects evidence that did not come from the configured uploader', async () => {
		authMock.mockResolvedValue({ userId: 'customer-1' });

		await expect(
			createReturnRequest({
				orderItemId: 'item-1',
				quantity: 1,
				reason: 'DAMAGED',
				resolution: 'REFUND',
				evidence: [
					{
						type: 'IMAGE',
						url: 'https://example.com/untrusted-image.png',
					},
				],
			}),
		).rejects.toThrow('GoCart uploader');
		expect(transactionMock).not.toHaveBeenCalled();
	});

	it('returns a server-calculated eligibility preview for the customer', async () => {
		authMock.mockResolvedValue({ userId: 'customer-1' });
		dbOrderItemFindFirstMock.mockResolvedValue({
			id: 'item-1',
			orderGroupId: 'group-1',
			name: 'Trail boots · Brown',
			image: 'https://res.cloudinary.com/demo/image/upload/boots.png',
			size: '42',
			sku: 'BOOTS-42',
			status: 'Delivered',
			deliveredAt: new Date(),
			updatedAt: new Date(),
			quantity: 2,
			price: 40,
			shippingFee: 10,
			returnItems: [],
			orderGroup: {
				coupon: { discount: 10 },
				store: {
					id: 'store-1',
					returnPolicy: 'Return in 30 days.',
					returnsAccepted: true,
					returnWindowDays: 30,
					returnShippingFees: true,
				},
				order: {
					id: 'order-1',
					userId: 'customer-1',
					paymentStatus: 'Paid',
					paymentDetails: {
						id: 'payment-1',
						currency: 'USD',
					},
				},
			},
		});

		const result = await getReturnCandidate('item-1');

		expect(result).toMatchObject({
			eligible: true,
			availableQuantity: 2,
			order: { id: 'order-1' },
			amounts: [
				{
					quantity: 1,
					breakdown: {
						itemSubtotal: 40,
						shipping: 5,
						couponDiscount: 4.5,
						total: 40.5,
					},
				},
				{
					quantity: 2,
					breakdown: {
						itemSubtotal: 80,
						shipping: 10,
						couponDiscount: 9,
						total: 81,
					},
				},
			],
		});
		expect(dbOrderItemFindFirstMock).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					id: 'item-1',
					orderGroup: { order: { userId: 'customer-1' } },
				},
			}),
		);
	});

	it('derives ownership and refundable totals from server records', async () => {
		authMock.mockResolvedValue({ userId: 'customer-1' });
		orderItemFindFirstMock.mockResolvedValue({
			id: 'item-1',
			orderGroupId: 'group-1',
			status: 'Delivered',
			deliveredAt: new Date(),
			updatedAt: new Date(),
			quantity: 2,
			price: 40,
			shippingFee: 10,
			returnItems: [],
			orderGroup: {
				coupon: { discount: 10 },
				store: {
					id: 'store-1',
					returnsAccepted: true,
					returnWindowDays: 30,
					returnShippingFees: true,
				},
				order: {
					id: 'order-1',
					userId: 'customer-1',
					paymentStatus: 'Paid',
					paymentDetails: {
						id: 'payment-1',
						currency: 'usd',
					},
				},
			},
		});
		returnRequestCreateMock.mockResolvedValue({ id: 'return-1' });

		await expect(
			createReturnRequest({
				orderItemId: 'item-1',
				quantity: 1,
				reason: 'DAMAGED',
				resolution: 'REFUND',
				note: '  Arrived cracked.  ',
			}),
		).resolves.toEqual({ id: 'return-1' });

		expect(orderItemFindFirstMock).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					id: 'item-1',
					orderGroup: { order: { userId: 'customer-1' } },
				},
			}),
		);
		expect(returnRequestCreateMock).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					customerId: 'customer-1',
					orderId: 'order-1',
					storeId: 'store-1',
					requestedSubtotal: 40,
					requestedShipping: 5,
					requestedDiscount: 4.5,
					requestedTax: 0,
					requestedAmount: 40.5,
					currency: 'USD',
					customerNote: 'Arrived cracked.',
				}),
			}),
		);
	});

	it('rejects a seller from another store before any status write', async () => {
		authMock.mockResolvedValue({ userId: 'seller-2' });
		userFindUniqueMock.mockResolvedValue({ role: 'SELLER' });
		returnRequestFindUniqueMock.mockResolvedValue({
			id: 'return-1',
			status: 'REQUESTED',
			customerId: 'customer-1',
			store: {
				userId: 'seller-1',
				returnWindowDays: 30,
			},
		});

		await expect(
			transitionReturnRequest({
				returnRequestId: 'return-1',
				toStatus: 'UNDER_REVIEW',
			}),
		).rejects.toThrow('store return');
		expect(returnRequestUpdateManyMock).not.toHaveBeenCalled();
		expect(returnEventCreateMock).not.toHaveBeenCalled();
	});

	it('requires a decision note when a seller rejects a request', async () => {
		authMock.mockResolvedValue({ userId: 'seller-1' });
		userFindUniqueMock.mockResolvedValue({ role: 'SELLER' });
		returnRequestFindUniqueMock.mockResolvedValue({
			id: 'return-1',
			status: 'REQUESTED',
			customerId: 'customer-1',
			store: {
				userId: 'seller-1',
				returnWindowDays: 30,
			},
		});

		await expect(
			transitionReturnRequest({
				returnRequestId: 'return-1',
				toStatus: 'REJECTED',
			}),
		).rejects.toThrow('note is required');
		expect(returnRequestUpdateManyMock).not.toHaveBeenCalled();
	});

	it('treats a seller account as the customer on its own return', async () => {
		authMock.mockResolvedValue({ userId: 'seller-customer-1' });
		userFindUniqueMock.mockResolvedValue({ role: 'SELLER' });
		returnRequestFindUniqueMock.mockResolvedValue({
			id: 'return-1',
			status: 'REQUESTED',
			customerId: 'seller-customer-1',
			store: {
				userId: 'different-store-owner',
				returnWindowDays: 30,
			},
		});
		returnRequestUpdateManyMock.mockResolvedValue({ count: 1 });
		returnEventCreateMock.mockResolvedValue({ id: 'event-1' });
		returnItemUpdateManyMock.mockResolvedValue({ count: 1 });
		returnRequestFindUniqueOrThrowMock.mockResolvedValue({
			id: 'return-1',
			status: 'CANCELLED',
		});

		await transitionReturnRequest({
			returnRequestId: 'return-1',
			toStatus: 'CANCELLED',
		});

		expect(returnEventCreateMock).toHaveBeenCalledWith({
			data: expect.objectContaining({
				actorRole: 'CUSTOMER',
				actorId: 'seller-customer-1',
				toStatus: 'CANCELLED',
			}),
		});
	});

	it('writes a valid status change and audit event in one transaction', async () => {
		authMock.mockResolvedValue({ userId: 'seller-1' });
		userFindUniqueMock.mockResolvedValue({ role: 'SELLER' });
		returnRequestFindUniqueMock.mockResolvedValue({
			id: 'return-1',
			status: 'REQUESTED',
			customerId: 'customer-1',
			store: {
				userId: 'seller-1',
				returnWindowDays: 30,
			},
		});
		returnRequestUpdateManyMock.mockResolvedValue({ count: 1 });
		returnEventCreateMock.mockResolvedValue({ id: 'event-1' });
		returnRequestFindUniqueOrThrowMock.mockResolvedValue({
			id: 'return-1',
			status: 'UNDER_REVIEW',
		});

		await expect(
			transitionReturnRequest({
				returnRequestId: 'return-1',
				toStatus: 'UNDER_REVIEW',
				note: 'Review started.',
			}),
		).resolves.toMatchObject({
			id: 'return-1',
			status: 'UNDER_REVIEW',
		});

		expect(returnRequestUpdateManyMock).toHaveBeenCalledWith({
			where: {
				id: 'return-1',
				status: 'REQUESTED',
			},
			data: {
				status: 'UNDER_REVIEW',
			},
		});
		expect(returnEventCreateMock).toHaveBeenCalledWith({
			data: {
				returnRequestId: 'return-1',
				actorRole: 'SELLER',
				actorId: 'seller-1',
				eventType: 'return.status_changed',
				fromStatus: 'REQUESTED',
				toStatus: 'UNDER_REVIEW',
				note: 'Review started.',
			},
		});
	});
});

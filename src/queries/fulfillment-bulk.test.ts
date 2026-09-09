import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PackageStatus } from '@prisma/client';

const harness = vi.hoisted(() => ({
	currentUser: vi.fn(),
	db: {
		store: {
			findFirst: vi.fn(),
			findUnique: vi.fn(),
		},
		orderGroup: {
			findFirst: vi.fn(),
			updateMany: vi.fn(),
			update: vi.fn(),
		},
		orderItem: {
			updateMany: vi.fn(),
		},
		order: {
			findUnique: vi.fn(),
			update: vi.fn(),
		},
		fulfillmentTransition: {
			findUnique: vi.fn(),
			create: vi.fn(),
		},
		$transaction: vi.fn(),
	},
	publishDomainEvent: vi.fn(),
	scheduleEmailOutboxDispatch: vi.fn(),
	refreshSettlementEligibilityForOrderGroup: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({
	currentUser: harness.currentUser,
	auth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
	db: harness.db,
}));

vi.mock('@/lib/notifications/domain-events', () => ({
	DOMAIN_EVENT_TYPES: { PACKAGE_STATUS_CHANGED: 'fulfillment.package.status_changed' },
	publishDomainEvent: harness.publishDomainEvent,
}));

vi.mock('@/lib/email/schedule', () => ({
	scheduleEmailOutboxDispatch: harness.scheduleEmailOutboxDispatch,
}));

vi.mock('@/lib/settlement/service', () => ({
	refreshSettlementEligibilityForOrderGroup: harness.refreshSettlementEligibilityForOrderGroup,
}));

vi.mock('next/cache', () => ({
	updateTag: vi.fn(),
}));

import { bulkUpdatePackageStatus, getStorePackingSlipDetails } from './fulfillment';

describe('Seller Logistics & Bulk Order Operations Queries', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		harness.publishDomainEvent.mockResolvedValue({ id: 'event_1' });
	});

	describe('bulkUpdatePackageStatus', () => {
		it('rejects unauthenticated user', async () => {
			harness.currentUser.mockResolvedValue(null);

			await expect(
				bulkUpdatePackageStatus({
					storeId: 'store_1',
					groupIds: ['group_1'],
					nextStatus: PackageStatus.PROCESSING,
				}),
			).rejects.toThrow('Unauthenticated.');
		});

		it('rejects user without seller privileges', async () => {
			harness.currentUser.mockResolvedValue({
				id: 'user_customer',
				privateMetadata: { role: 'USER' },
			});

			await expect(
				bulkUpdatePackageStatus({
					storeId: 'store_1',
					groupIds: ['group_1'],
					nextStatus: PackageStatus.PROCESSING,
				}),
			).rejects.toThrow('Seller privileges are required.');
		});

		it('rejects if seller does not own the store', async () => {
			harness.currentUser.mockResolvedValue({
				id: 'seller_a',
				privateMetadata: { role: 'SELLER' },
			});
			harness.db.store.findFirst.mockResolvedValue(null);

			await expect(
				bulkUpdatePackageStatus({
					storeId: 'store_other',
					groupIds: ['group_1'],
					nextStatus: PackageStatus.PROCESSING,
				}),
			).rejects.toThrow('You do not own this store.');
		});

		it('returns zero counts for empty groupIds', async () => {
			harness.currentUser.mockResolvedValue({
				id: 'seller_1',
				privateMetadata: { role: 'SELLER' },
			});

			const res = await bulkUpdatePackageStatus({
				storeId: 'store_1',
				groupIds: [],
				nextStatus: PackageStatus.PROCESSING,
			});

			expect(res).toEqual({
				successCount: 0,
				failedCount: 0,
				results: [],
			});
		});

		it('processes multiple packages through transactions and reports results', async () => {
			harness.currentUser.mockResolvedValue({
				id: 'seller_1',
				privateMetadata: { role: 'SELLER' },
			});
			harness.db.store.findFirst.mockResolvedValue({
				id: 'store_1',
				url: 'store-one',
			});

			// Setup transaction mock to handle each package transition
			harness.db.$transaction.mockImplementation(async (callback: (tx: typeof harness.db) => Promise<unknown>) => {
				const txMock = {
					fulfillmentTransition: {
						findUnique: vi.fn().mockResolvedValue(null),
						create: vi.fn().mockResolvedValue({ id: 'ft_1' }),
					},
					orderGroup: {
						findFirst: vi.fn().mockResolvedValue({
							id: 'group_1',
							orderId: 'order_1',
							packageStatus: PackageStatus.ACCEPTED,
							shipmentAssignments: [],
							store: { name: 'Store One', url: 'store-one' },
							items: [],
							order: { paymentDetails: { currency: 'USD' } },
							subTotal: 50,
							shippingFees: 5,
							total: 55,
						}),
						findMany: vi.fn().mockResolvedValue([{ status: 'Processing' }]),
						updateMany: vi.fn().mockResolvedValue({ count: 1 }),
						update: vi.fn().mockResolvedValue({ id: 'group_1' }),
					},
					orderItem: {
						updateMany: vi.fn().mockResolvedValue({ count: 1 }),
					},
					order: {
						findUnique: vi.fn().mockResolvedValue({
							orderGroups: [{ status: 'Processing' }],
						}),
						update: vi.fn().mockResolvedValue({ id: 'order_1' }),
					},
				};
				return callback(txMock as unknown as typeof harness.db);
			});

			const res = await bulkUpdatePackageStatus({
				storeId: 'store_1',
				groupIds: ['group_1'],
				nextStatus: PackageStatus.PROCESSING,
			});

			expect(res.successCount).toBe(1);
			expect(res.failedCount).toBe(0);
			expect(res.results[0].success).toBe(true);
			expect(res.results[0].status).toBe(PackageStatus.PROCESSING);
		});
	});

	describe('getStorePackingSlipDetails', () => {
		it('rejects unauthenticated caller', async () => {
			harness.currentUser.mockResolvedValue(null);

			await expect(
				getStorePackingSlipDetails('store-one', 'order-123'),
			).rejects.toThrow('Unauthenticated.');
		});

		it('rejects if seller does not own store', async () => {
			harness.currentUser.mockResolvedValue({
				id: 'seller_intruder',
				privateMetadata: { role: 'SELLER' },
			});
			harness.db.store.findUnique.mockResolvedValue({
				id: 'store_1',
				userId: 'seller_real_owner',
				url: 'store-one',
			});

			await expect(
				getStorePackingSlipDetails('store-one', 'order-123'),
			).rejects.toThrow("You don't have permission to access this store.");
		});

		it('throws if order group does not exist for the store', async () => {
			harness.currentUser.mockResolvedValue({
				id: 'seller_owner',
				privateMetadata: { role: 'SELLER' },
			});
			harness.db.store.findUnique.mockResolvedValue({
				id: 'store_1',
				userId: 'seller_owner',
				url: 'store-one',
			});
			harness.db.orderGroup.findFirst.mockResolvedValue(null);

			await expect(
				getStorePackingSlipDetails('store-one', 'order-123'),
			).rejects.toThrow('Order package not found for this store.');
		});

		it('returns structured store and order group details for authorized seller', async () => {
			harness.currentUser.mockResolvedValue({
				id: 'seller_owner',
				privateMetadata: { role: 'SELLER' },
			});
			const mockStore = {
				id: 'store_1',
				name: 'Apex Store',
				url: 'apex-store',
				email: 'apex@example.com',
				phone: '123456789',
				logo: 'https://example.com/logo.png',
				cover: 'https://example.com/cover.png',
				userId: 'seller_owner',
			};
			const mockOrderGroup = {
				id: 'pkg_123',
				orderId: 'ord_456',
				status: 'Processing',
				packageStatus: 'PROCESSING',
				shippingService: 'Standard Courier',
				shippingDeliveryMin: 2,
				shippingDeliveryMax: 5,
				shippingFees: 10,
				subTotal: 100,
				total: 110,
				createdAt: new Date('2026-02-01'),
				items: [
					{
						id: 'item_1',
						name: 'Wireless Headphones',
						sku: 'WH-001',
						image: 'https://example.com/img.jpg',
						size: 'Black',
						quantity: 2,
						price: 50,
						totalPrice: 100,
						variantSlug: 'black-edition',
					},
				],
				order: {
					id: 'ord_456',
					paymentStatus: 'Paid',
					createdAt: new Date('2026-02-01'),
					shippingAddress: {
						firstName: 'John',
						lastName: 'Doe',
						address1: '123 Main St',
						city: 'New York',
						state: 'NY',
						zip_code: '10001',
						country: { name: 'United States' },
						phone: '555-1234',
						user: { email: 'john@example.com', name: 'John Doe' },
					},
					paymentDetails: { currency: 'USD' },
				},
				shipmentAssignments: [],
			};

			harness.db.store.findUnique.mockResolvedValue(mockStore);
			harness.db.orderGroup.findFirst.mockResolvedValue(mockOrderGroup);

			const result = await getStorePackingSlipDetails('apex-store', 'ord_456');

			expect(result.store.name).toBe('Apex Store');
			expect(result.orderGroup.id).toBe('pkg_123');
			expect(result.orderGroup.items).toHaveLength(1);
			expect(result.orderGroup.order.shippingAddress.firstName).toBe('John');
		});
	});
});

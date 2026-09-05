import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '@prisma/client';
import { DOMAIN_EVENT_TYPES } from '@/lib/notifications/domain-events';
import { adjustSizeInventory } from '@/lib/inventory/service';

const {
	currentUserMock,
	findUniqueUserMock,
	findUniqueStoreMock,
	findManyProductMock,
	findUniqueSizeMock,
	updateSizeMock,
	publishDomainEventMock,
	transactionMock,
} = vi.hoisted(() => {
	const currentUserMock = vi.fn();
	const findUniqueUserMock = vi.fn();
	const findUniqueStoreMock = vi.fn();
	const findManyProductMock = vi.fn();
	const findUniqueSizeMock = vi.fn();
	const updateSizeMock = vi.fn();
	const publishDomainEventMock = vi.fn();
	const transactionMock = vi.fn((cb: (tx: unknown) => unknown) =>
		cb({
			size: {
				findUnique: findUniqueSizeMock,
				update: updateSizeMock,
			},
		})
	);

	return {
		currentUserMock,
		findUniqueUserMock,
		findUniqueStoreMock,
		findManyProductMock,
		findUniqueSizeMock,
		updateSizeMock,
		publishDomainEventMock,
		transactionMock,
	};
});

vi.mock('@clerk/nextjs/server', () => ({
	currentUser: currentUserMock,
}));

vi.mock('@/lib/db', () => ({
	db: {
		user: { findUnique: findUniqueUserMock },
		store: { findUnique: findUniqueStoreMock },
		product: { findMany: findManyProductMock },
		size: { findUnique: findUniqueSizeMock, update: updateSizeMock },
		$transaction: transactionMock,
	},
}));

vi.mock('@/lib/notifications/domain-events', () => ({
	DOMAIN_EVENT_TYPES: {
		INVENTORY_LOW_STOCK: 'inventory.low_stock',
		INVENTORY_RESTOCKED: 'inventory.restocked',
	},
	publishDomainEvent: publishDomainEventMock,
}));

import {
	getStoreInventory,
	updateSizeQuantity,
	updateSizeThreshold,
	getAdminInventoryOverview,
} from './inventory';

describe('Inventory Service & Queries', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('adjustSizeInventory (Boundary-Crossing Alert Invariant)', () => {
		const mockTx = {
			size: {
				findUnique: findUniqueSizeMock,
				update: updateSizeMock,
			},
		};

		const baseSizeFixture = {
			id: 'size-1',
			size: 'Medium',
			quantity: 10,
			lowStockThreshold: 5,
			productVariant: {
				id: 'variant-1',
				variantName: 'Obsidian Black',
				sku: 'WATCH-BLK-M',
				product: {
					id: 'product-1',
					name: 'Chronos Timepiece',
					slug: 'chronos-timepiece',
					store: {
						id: 'store-1',
						name: 'Horology Store',
						url: 'horology',
						userId: 'seller-user-1',
						email: 'seller@horology.test',
					},
				},
			},
		};

		it('emits INVENTORY_LOW_STOCK when stock crosses from above to at or below threshold', async () => {
			findUniqueSizeMock.mockResolvedValueOnce({
				...baseSizeFixture,
				quantity: 10,
				lowStockThreshold: 5,
			});
			updateSizeMock.mockResolvedValueOnce({ id: 'size-1', quantity: 4 });

			const result = await adjustSizeInventory(mockTx as never, {
				sizeId: 'size-1',
				newQuantity: 4,
				actorUserId: 'buyer-user-1',
			});

			expect(result.thresholdCrossed).toBe('LOW_STOCK');
			expect(result.previousQuantity).toBe(10);
			expect(result.currentQuantity).toBe(4);
			expect(publishDomainEventMock).toHaveBeenCalledTimes(1);
			expect(publishDomainEventMock).toHaveBeenCalledWith(
				mockTx,
				expect.objectContaining({
					eventType: DOMAIN_EVENT_TYPES.INVENTORY_LOW_STOCK,
					aggregateType: 'INVENTORY_SKU',
					aggregateId: 'size-1',
					storeId: 'store-1',
					payload: expect.objectContaining({
						currentQuantity: 4,
						previousQuantity: 10,
						threshold: 5,
						productName: 'Chronos Timepiece',
					}),
				})
			);
		});

		it('does NOT emit duplicate alert when stock is already below threshold', async () => {
			findUniqueSizeMock.mockResolvedValueOnce({
				...baseSizeFixture,
				quantity: 3,
				lowStockThreshold: 5,
			});
			updateSizeMock.mockResolvedValueOnce({ id: 'size-1', quantity: 1 });

			const result = await adjustSizeInventory(mockTx as never, {
				sizeId: 'size-1',
				newQuantity: 1,
			});

			expect(result.thresholdCrossed).toBeNull();
			expect(publishDomainEventMock).not.toHaveBeenCalled();
		});

		it('emits INVENTORY_RESTOCKED when stock crosses from below or at threshold to above threshold', async () => {
			findUniqueSizeMock.mockResolvedValueOnce({
				...baseSizeFixture,
				quantity: 2,
				lowStockThreshold: 5,
			});
			updateSizeMock.mockResolvedValueOnce({ id: 'size-1', quantity: 20 });

			const result = await adjustSizeInventory(mockTx as never, {
				sizeId: 'size-1',
				newQuantity: 20,
				actorUserId: 'seller-user-1',
			});

			expect(result.thresholdCrossed).toBe('RESTOCKED');
			expect(result.previousQuantity).toBe(2);
			expect(result.currentQuantity).toBe(20);
			expect(publishDomainEventMock).toHaveBeenCalledTimes(1);
			expect(publishDomainEventMock).toHaveBeenCalledWith(
				mockTx,
				expect.objectContaining({
					eventType: DOMAIN_EVENT_TYPES.INVENTORY_RESTOCKED,
					aggregateType: 'INVENTORY_SKU',
					aggregateId: 'size-1',
				})
			);
		});

		it('does NOT emit event when stock was already above threshold', async () => {
			findUniqueSizeMock.mockResolvedValueOnce({
				...baseSizeFixture,
				quantity: 15,
				lowStockThreshold: 5,
			});
			updateSizeMock.mockResolvedValueOnce({ id: 'size-1', quantity: 25 });

			const result = await adjustSizeInventory(mockTx as never, {
				sizeId: 'size-1',
				newQuantity: 25,
			});

			expect(result.thresholdCrossed).toBeNull();
			expect(publishDomainEventMock).not.toHaveBeenCalled();
		});

		it('rejects negative stock quantities', async () => {
			await expect(
				adjustSizeInventory(mockTx as never, {
					sizeId: 'size-1',
					newQuantity: -1,
				})
			).rejects.toThrow('Quantity must be a non-negative integer.');
		});
	});

	describe('getStoreInventory', () => {
		it('calculates dynamic threshold low-stock counts accurately', async () => {
			currentUserMock.mockResolvedValueOnce({ id: 'clerk-seller-1' });
			findUniqueUserMock.mockResolvedValueOnce({ id: 'user-1', role: Role.SELLER });
			findUniqueStoreMock.mockResolvedValueOnce({
				id: 'store-1',
				url: 'my-store',
				userId: 'user-1',
			});

			findManyProductMock.mockResolvedValueOnce([
				{
					id: 'p-1',
					name: 'Product A',
					slug: 'product-a',
					variants: [
						{
							id: 'v-1',
							variantName: 'Color Black',
							sku: 'SKU-A',
							images: [{ url: 'https://images.test/1.jpg' }],
							sizes: [
								{
									id: 's-1',
									size: 'S',
									price: 50,
									discount: 0,
									quantity: 0,
									lowStockThreshold: 5,
									updatedAt: new Date(),
								},
								{
									id: 's-2',
									size: 'M',
									price: 50,
									discount: 0,
									quantity: 3,
									lowStockThreshold: 5,
									updatedAt: new Date(),
								},
								{
									id: 's-3',
									size: 'L',
									price: 50,
									discount: 0,
									quantity: 12,
									lowStockThreshold: 10,
									updatedAt: new Date(),
								},
							],
						},
					],
				},
			]);

			const result = await getStoreInventory('my-store');

			expect(result.summary.totalSKUs).toBe(3);
			expect(result.summary.totalUnits).toBe(15);
			expect(result.summary.outOfStockCount).toBe(1);
			expect(result.summary.lowStockCount).toBe(1); // s-2 is 3 <= 5. s-3 is 12 > 10 (in stock).
			expect(result.items).toHaveLength(3);
			expect(result.items[2].lowStockThreshold).toBe(10);
		});

		it('throws when unauthenticated', async () => {
			currentUserMock.mockResolvedValueOnce(null);
			await expect(getStoreInventory('my-store')).rejects.toThrow('Unauthenticated.');
		});
	});

	describe('updateSizeThreshold', () => {
		it('updates threshold for verified store owner', async () => {
			currentUserMock.mockResolvedValueOnce({ id: 'clerk-seller-1' });
			findUniqueUserMock.mockResolvedValueOnce({ id: 'user-1', role: Role.SELLER });
			findUniqueSizeMock.mockResolvedValueOnce({
				productVariant: {
					product: {
						store: {
							userId: 'user-1',
						},
					},
				},
			});
			updateSizeMock.mockResolvedValueOnce({ id: 'size-1', lowStockThreshold: 12 });

			const result = await updateSizeThreshold('size-1', 12);
			expect(result.lowStockThreshold).toBe(12);
			expect(updateSizeMock).toHaveBeenCalledWith({
				where: { id: 'size-1' },
				data: { lowStockThreshold: 12 },
				select: { id: true, lowStockThreshold: true },
			});
		});

		it('rejects negative or out-of-range thresholds', async () => {
			currentUserMock.mockResolvedValueOnce({ id: 'clerk-seller-1' });
			findUniqueUserMock.mockResolvedValueOnce({ id: 'user-1', role: Role.SELLER });

			await expect(updateSizeThreshold('size-1', -5)).rejects.toThrow(
				'Threshold must be an integer between 0 and 10,000.'
			);
		});

		it('rejects unauthorized seller attempting to change another store threshold', async () => {
			currentUserMock.mockResolvedValueOnce({ id: 'clerk-intruder' });
			findUniqueUserMock.mockResolvedValueOnce({ id: 'intruder-id', role: Role.SELLER });
			findUniqueSizeMock.mockResolvedValueOnce({
				productVariant: {
					product: {
						store: {
							userId: 'legitimate-seller-id',
						},
					},
				},
			});

			await expect(updateSizeThreshold('size-1', 10)).rejects.toThrow(
				'Unauthorized to modify this alert threshold.'
			);
		});
	});

	describe('getAdminInventoryOverview', () => {
		it('aggregates platform metrics across all stores for admins', async () => {
			currentUserMock.mockResolvedValueOnce({ id: 'clerk-admin-1' });
			findUniqueUserMock.mockResolvedValueOnce({ id: 'admin-1', role: Role.ADMIN });

			findManyProductMock.mockResolvedValueOnce([
				{
					id: 'p-1',
					name: 'Dress',
					slug: 'dress',
					store: { id: 'store-1', name: 'Fashion Hub', url: 'fashion-hub' },
					variants: [
						{
							id: 'v-1',
							variantName: 'Red',
							sku: 'FASH-RED-M',
							images: [{ url: 'https://images.test/dress.jpg' }],
							sizes: [
								{
									id: 's-1',
									size: 'M',
									price: 100,
									quantity: 0,
									lowStockThreshold: 5,
									updatedAt: new Date(),
								},
							],
						},
					],
				},
				{
					id: 'p-2',
					name: 'Shoes',
					slug: 'shoes',
					store: { id: 'store-2', name: 'Shoe World', url: 'shoe-world' },
					variants: [
						{
							id: 'v-2',
							variantName: 'Blue',
							sku: 'SHOE-BLU-42',
							images: [{ url: 'https://images.test/shoe.jpg' }],
							sizes: [
								{
									id: 's-2',
									size: '42',
									price: 80,
									quantity: 2,
									lowStockThreshold: 5,
									updatedAt: new Date(),
								},
							],
						},
					],
				},
			]);

			const overview = await getAdminInventoryOverview();

			expect(overview.summary.totalUnits).toBe(2);
			expect(overview.summary.totalSKUs).toBe(2);
			expect(overview.summary.outOfStockCount).toBe(1);
			expect(overview.summary.lowStockCount).toBe(1);
			expect(overview.summary.affectedStoresCount).toBe(2);
			expect(overview.criticalItems).toHaveLength(2);
			expect(overview.criticalItems[0].quantity).toBe(0); // Sorted out-of-stock first
			expect(overview.criticalItems[1].quantity).toBe(2);
			expect(overview.stores).toHaveLength(2);
		});

		it('rejects non-admin users', async () => {
			currentUserMock.mockResolvedValueOnce({ id: 'clerk-seller-1' });
			findUniqueUserMock.mockResolvedValueOnce({ id: 'seller-1', role: Role.SELLER });

			await expect(getAdminInventoryOverview()).rejects.toThrow(
				'Unauthorized: Administrator access required.'
			);
		});
	});
});

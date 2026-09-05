'use server';

import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';
import { Role } from '@prisma/client';
import { adjustSizeInventory } from '@/lib/inventory/service';

export interface InventoryItem {
	id: string;
	productId: string;
	productName: string;
	productSlug: string;
	storeUrl: string;
	variantId: string;
	variantName: string;
	variantImage: string;
	sku: string;
	size: string;
	price: number;
	discount: number;
	quantity: number;
	lowStockThreshold: number;
	updatedAt: Date;
}

export interface InventoryOverview {
	items: InventoryItem[];
	summary: {
		totalUnits: number;
		lowStockCount: number;
		outOfStockCount: number;
		totalSKUs: number;
	};
}

export interface AdminInventorySKU {
	id: string;
	productId: string;
	productName: string;
	productSlug: string;
	storeId: string;
	storeName: string;
	storeUrl: string;
	variantId: string;
	variantName: string;
	variantImage: string;
	sku: string;
	size: string;
	price: number;
	quantity: number;
	lowStockThreshold: number;
	updatedAt: Date;
}

export interface AdminStoreInventorySummary {
	storeId: string;
	storeName: string;
	storeUrl: string;
	totalUnits: number;
	totalSKUs: number;
	lowStockCount: number;
	outOfStockCount: number;
}

export interface AdminInventoryOverview {
	summary: {
		totalUnits: number;
		totalSKUs: number;
		lowStockCount: number;
		outOfStockCount: number;
		affectedStoresCount: number;
	};
	criticalItems: AdminInventorySKU[];
	stores: AdminStoreInventorySummary[];
}

export const getStoreInventory = async (
	storeUrl: string,
): Promise<InventoryOverview> => {
	try {
		const user = await currentUser();
		if (!user) throw new Error('Unauthenticated.');

		const dbUser = await db.user.findUnique({
			where: { id: user.id },
			select: { id: true, role: true },
		});
		if (!dbUser) throw new Error('User not found.');

		const store = await db.store.findUnique({
			where: { url: storeUrl },
			select: { id: true, url: true, userId: true },
		});

		if (!store) throw new Error('Store not found.');

		if (dbUser.role !== Role.ADMIN && store.userId !== dbUser.id) {
			throw new Error('Unauthorized to view this store inventory.');
		}

		const products = await db.product.findMany({
			where: { storeId: store.id },
			select: {
				id: true,
				name: true,
				slug: true,
				variants: {
					select: {
						id: true,
						variantName: true,
						sku: true,
						images: {
							select: { url: true },
							take: 1,
						},
						sizes: {
							select: {
								id: true,
								size: true,
								price: true,
								discount: true,
								quantity: true,
								lowStockThreshold: true,
								updatedAt: true,
							},
						},
					},
				},
			},
		});

		const items: InventoryItem[] = [];
		let totalUnits = 0;
		let lowStockCount = 0;
		let outOfStockCount = 0;

		products.forEach((product) => {
			product.variants.forEach((variant) => {
				const image = variant.images[0]?.url || '';
				variant.sizes.forEach((size) => {
					totalUnits += size.quantity;
					const threshold = size.lowStockThreshold ?? 5;

					if (size.quantity === 0) {
						outOfStockCount += 1;
					} else if (size.quantity <= threshold) {
						lowStockCount += 1;
					}

					items.push({
						id: size.id,
						productId: product.id,
						productName: product.name,
						productSlug: product.slug,
						storeUrl: store.url,
						variantId: variant.id,
						variantName: variant.variantName,
						variantImage: image,
						sku: variant.sku,
						size: size.size,
						price: size.price,
						discount: size.discount,
						quantity: size.quantity,
						lowStockThreshold: threshold,
						updatedAt: size.updatedAt,
					});
				});
			});
		});

		return {
			items,
			summary: {
				totalUnits,
				lowStockCount,
				outOfStockCount,
				totalSKUs: items.length,
			},
		};
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : 'Failed to fetch inventory.');
	}
};

export const updateSizeQuantity = async (
	sizeId: string,
	quantity: number,
): Promise<{ id: string; quantity: number }> => {
	try {
		const user = await currentUser();
		if (!user) throw new Error('Unauthenticated.');

		const dbUser = await db.user.findUnique({
			where: { id: user.id },
			select: { id: true, role: true },
		});
		if (!dbUser) throw new Error('User not found.');

		if (!Number.isInteger(quantity) || quantity < 0) {
			throw new Error('Quantity must be a non-negative integer.');
		}

		return await db.$transaction(async (tx) => {
			const sizeRecord = await tx.size.findUnique({
				where: { id: sizeId },
				select: {
					productVariant: {
						select: {
							product: {
								select: {
									store: {
										select: {
											userId: true,
										},
									},
								},
							},
						},
					},
				},
			});

			if (!sizeRecord) throw new Error('Size record not found.');

			const storeOwnerId = sizeRecord.productVariant.product.store.userId;
			if (dbUser.role !== Role.ADMIN && storeOwnerId !== dbUser.id) {
				throw new Error('Unauthorized to modify this inventory item.');
			}

			await adjustSizeInventory(tx, {
				sizeId,
				newQuantity: quantity,
				actorUserId: dbUser.id,
			});

			return { id: sizeId, quantity };
		});
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : 'Failed to update stock quantity.');
	}
};

export const updateSizeThreshold = async (
	sizeId: string,
	threshold: number,
): Promise<{ id: string; lowStockThreshold: number }> => {
	try {
		const user = await currentUser();
		if (!user) throw new Error('Unauthenticated.');

		const dbUser = await db.user.findUnique({
			where: { id: user.id },
			select: { id: true, role: true },
		});
		if (!dbUser) throw new Error('User not found.');

		if (!Number.isInteger(threshold) || threshold < 0 || threshold > 10000) {
			throw new Error('Threshold must be an integer between 0 and 10,000.');
		}

		const sizeRecord = await db.size.findUnique({
			where: { id: sizeId },
			select: {
				productVariant: {
					select: {
						product: {
							select: {
								store: {
									select: {
										userId: true,
									},
								},
							},
						},
					},
				},
			},
		});

		if (!sizeRecord) throw new Error('Size record not found.');

		const storeOwnerId = sizeRecord.productVariant.product.store.userId;
		if (dbUser.role !== Role.ADMIN && storeOwnerId !== dbUser.id) {
			throw new Error('Unauthorized to modify this alert threshold.');
		}

		const updated = await db.size.update({
			where: { id: sizeId },
			data: { lowStockThreshold: threshold },
			select: { id: true, lowStockThreshold: true },
		});

		return updated;
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : 'Failed to update alert threshold.');
	}
};

export const getAdminInventoryOverview = async (): Promise<AdminInventoryOverview> => {
	try {
		const user = await currentUser();
		if (!user) throw new Error('Unauthenticated.');

		const dbUser = await db.user.findUnique({
			where: { id: user.id },
			select: { id: true, role: true },
		});
		if (!dbUser || dbUser.role !== Role.ADMIN) {
			throw new Error('Unauthorized: Administrator access required.');
		}

		const products = await db.product.findMany({
			select: {
				id: true,
				name: true,
				slug: true,
				store: {
					select: {
						id: true,
						name: true,
						url: true,
					},
				},
				variants: {
					select: {
						id: true,
						variantName: true,
						sku: true,
						images: {
							select: { url: true },
							take: 1,
						},
						sizes: {
							select: {
								id: true,
								size: true,
								price: true,
								quantity: true,
								lowStockThreshold: true,
								updatedAt: true,
							},
						},
					},
				},
			},
		});

		let totalUnits = 0;
		let totalSKUs = 0;
		let lowStockCount = 0;
		let outOfStockCount = 0;

		const criticalItems: AdminInventorySKU[] = [];
		const storeSummariesMap = new Map<string, AdminStoreInventorySummary>();

		for (const product of products) {
			const store = product.store;
			if (!storeSummariesMap.has(store.id)) {
				storeSummariesMap.set(store.id, {
					storeId: store.id,
					storeName: store.name,
					storeUrl: store.url,
					totalUnits: 0,
					totalSKUs: 0,
					lowStockCount: 0,
					outOfStockCount: 0,
				});
			}
			const storeSummary = storeSummariesMap.get(store.id)!;

			for (const variant of product.variants) {
				const image = variant.images[0]?.url || '';
				for (const size of variant.sizes) {
					totalUnits += size.quantity;
					totalSKUs += 1;
					storeSummary.totalUnits += size.quantity;
					storeSummary.totalSKUs += 1;

					const threshold = size.lowStockThreshold ?? 5;
					const isOutOfStock = size.quantity === 0;
					const isLowStock = size.quantity > 0 && size.quantity <= threshold;

					if (isOutOfStock) {
						outOfStockCount += 1;
						storeSummary.outOfStockCount += 1;
					} else if (isLowStock) {
						lowStockCount += 1;
						storeSummary.lowStockCount += 1;
					}

					if (isOutOfStock || isLowStock) {
						criticalItems.push({
							id: size.id,
							productId: product.id,
							productName: product.name,
							productSlug: product.slug,
							storeId: store.id,
							storeName: store.name,
							storeUrl: store.url,
							variantId: variant.id,
							variantName: variant.variantName,
							variantImage: image,
							sku: variant.sku,
							size: size.size,
							price: size.price,
							quantity: size.quantity,
							lowStockThreshold: threshold,
							updatedAt: size.updatedAt,
						});
					}
				}
			}
		}

		// Sort critical items: out-of-stock first, then lowest remaining quantity
		criticalItems.sort((a, b) => a.quantity - b.quantity);

		// Filter stores that have any critical stock issues
		const affectedStores = Array.from(storeSummariesMap.values())
			.filter((s) => s.lowStockCount > 0 || s.outOfStockCount > 0)
			.sort((a, b) => (b.outOfStockCount + b.lowStockCount) - (a.outOfStockCount + a.lowStockCount));

		return {
			summary: {
				totalUnits,
				totalSKUs,
				lowStockCount,
				outOfStockCount,
				affectedStoresCount: affectedStores.length,
			},
			criticalItems: criticalItems.slice(0, 50),
			stores: affectedStores,
		};
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : 'Failed to fetch administrator inventory overview.');
	}
};

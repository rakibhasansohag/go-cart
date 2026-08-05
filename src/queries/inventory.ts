'use server';

import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';

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

export const getStoreInventory = async (
	storeUrl: string,
): Promise<InventoryOverview> => {
	try {
		const user = await currentUser();
		if (!user) throw new Error('Unauthenticated.');

		const store = await db.store.findUnique({
			where: { url: storeUrl },
			select: { id: true, url: true, userId: true },
		});

		if (!store) throw new Error('Store not found.');

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

					if (size.quantity === 0) {
						outOfStockCount += 1;
					} else if (size.quantity < 5) {
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
) => {
	try {
		const user = await currentUser();
		if (!user) throw new Error('Unauthenticated.');

		if (quantity < 0) throw new Error('Quantity cannot be negative.');

		const updatedSize = await db.size.update({
			where: { id: sizeId },
			data: { quantity },
		});

		return updatedSize;
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : 'Failed to update stock quantity.');
	}
};

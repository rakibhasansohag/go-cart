import { Prisma, PrismaClient } from '@prisma/client';
import { DOMAIN_EVENT_TYPES, publishDomainEvent } from '@/lib/notifications/domain-events';

export type InventoryDbClient = Prisma.TransactionClient | PrismaClient;

export interface AdjustSizeInventoryInput {
	sizeId: string;
	newQuantity: number;
	actorUserId?: string | null;
	reason?: string;
}

export interface AdjustSizeInventoryResult {
	sizeId: string;
	previousQuantity: number;
	currentQuantity: number;
	threshold: number;
	thresholdCrossed: 'LOW_STOCK' | 'RESTOCKED' | null;
}

export async function adjustSizeInventory(
	tx: InventoryDbClient,
	input: AdjustSizeInventoryInput,
): Promise<AdjustSizeInventoryResult> {
	if (!Number.isInteger(input.newQuantity) || input.newQuantity < 0) {
		throw new Error('Quantity must be a non-negative integer.');
	}

	const existing = await tx.size.findUnique({
		where: { id: input.sizeId },
		include: {
			productVariant: {
				include: {
					product: {
						include: {
							store: {
								select: {
									id: true,
									url: true,
									name: true,
									userId: true,
									email: true,
								},
							},
						},
					},
				},
			},
		},
	});

	if (!existing) {
		throw new Error('Size not found.');
	}

	const prev = existing.quantity;
	const curr = input.newQuantity;
	const threshold = existing.lowStockThreshold ?? 5;
	let thresholdCrossed: 'LOW_STOCK' | 'RESTOCKED' | null = null;

	await tx.size.update({
		where: { id: input.sizeId },
		data: { quantity: curr },
	});

	const store = existing.productVariant.product.store;
	const product = existing.productVariant.product;
	const variant = existing.productVariant;

	// Boundary-crossing invariant: only emit on transitions across the threshold boundary
	if (prev > threshold && curr <= threshold) {
		thresholdCrossed = 'LOW_STOCK';
		const eventNonce = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
		await publishDomainEvent(tx, {
			eventKey: `inventory:low-stock:${existing.id}:${eventNonce}`,
			eventType: DOMAIN_EVENT_TYPES.INVENTORY_LOW_STOCK,
			aggregateType: 'INVENTORY_SKU',
			aggregateId: existing.id,
			actorUserId: input.actorUserId ?? null,
			storeId: store.id,
			payload: {
				storeId: store.id,
				storeUrl: store.url,
				productId: product.id,
				productName: product.name,
				productSlug: product.slug,
				variantId: variant.id,
				variantName: variant.variantName,
				sku: variant.sku ?? '',
				sizeId: existing.id,
				size: existing.size,
				currentQuantity: curr,
				threshold,
				previousQuantity: prev,
			},
		});
	} else if (prev <= threshold && curr > threshold) {
		thresholdCrossed = 'RESTOCKED';
		const eventNonce = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
		await publishDomainEvent(tx, {
			eventKey: `inventory:restocked:${existing.id}:${eventNonce}`,
			eventType: DOMAIN_EVENT_TYPES.INVENTORY_RESTOCKED,
			aggregateType: 'INVENTORY_SKU',
			aggregateId: existing.id,
			actorUserId: input.actorUserId ?? null,
			storeId: store.id,
			payload: {
				storeId: store.id,
				storeUrl: store.url,
				productId: product.id,
				productName: product.name,
				productSlug: product.slug,
				variantId: variant.id,
				variantName: variant.variantName,
				sku: variant.sku ?? '',
				sizeId: existing.id,
				size: existing.size,
				currentQuantity: curr,
				threshold,
				previousQuantity: prev,
			},
		});
	}

	return {
		sizeId: existing.id,
		previousQuantity: prev,
		currentQuantity: curr,
		threshold,
		thresholdCrossed,
	};
}

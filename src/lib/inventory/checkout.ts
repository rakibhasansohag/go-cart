import type { Prisma } from '@prisma/client';
import { requirePositiveQuantity } from '@/lib/security/action-input';

/** Run inside the order transaction, so a shortage rolls back every reservation. */
export async function reserveCheckoutInventory(
	tx: Prisma.TransactionClient,
	items: readonly { sizeId: string; quantity: number }[],
) {
	const quantities = new Map<string, number>();
	for (const item of items) {
		const quantity = requirePositiveQuantity(item.quantity);
		quantities.set(item.sizeId, (quantities.get(item.sizeId) ?? 0) + quantity);
	}
	// Consistent ordering prevents competing multi-item checkouts locking in reverse order.
	for (const [sizeId, quantity] of [...quantities].sort(([a], [b]) => a.localeCompare(b))) {
		const changed = await tx.size.updateMany({
			where: { id: sizeId, quantity: { gte: quantity } },
			data: { quantity: { decrement: quantity } },
		});
		if (changed.count !== 1) throw new Error('A product is no longer available in the requested quantity. Refresh your cart.');
	}
}

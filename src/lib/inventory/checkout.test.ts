import { expect, it, vi } from 'vitest';
import type { Prisma } from '@prisma/client';
import { reserveCheckoutInventory } from './checkout';

it('combines duplicate sizes and reserves them in stable lock order', async () => {
	const updateMany = vi.fn().mockResolvedValue({ count: 1 });
	const tx = { size: { updateMany } } as unknown as Prisma.TransactionClient;
	await reserveCheckoutInventory(tx, [{ sizeId: 'b', quantity: 1 }, { sizeId: 'a', quantity: 2 }, { sizeId: 'b', quantity: 3 }]);
	expect(updateMany).toHaveBeenNthCalledWith(1, { where: { id: 'a', quantity: { gte: 2 } }, data: { quantity: { decrement: 2 } } });
	expect(updateMany).toHaveBeenNthCalledWith(2, { where: { id: 'b', quantity: { gte: 4 } }, data: { quantity: { decrement: 4 } } });
});
it('throws on a shortage so the enclosing order transaction rolls back', async () => {
	const updateMany = vi.fn().mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
	const tx = { size: { updateMany } } as unknown as Prisma.TransactionClient;
	await expect(reserveCheckoutInventory(tx, [{ sizeId: 'a', quantity: 1 }, { sizeId: 'b', quantity: 1 }])).rejects.toThrow('requested quantity');
});

import { db } from '@/lib/db';
import { deriveGroupStatus, deriveOrderStatus } from '@/lib/orders/status-sync';
import { settledQuantityForOrderItem, terminalStatusForSettledLine } from '@/lib/returns/reconciliation';
import { adjustSizeInventory } from '@/lib/inventory/service';

export type ReturnItemDisposition = 'RESTOCKABLE' | 'DAMAGED' | 'DISPOSED' | 'REJECTED';

export type ReconcileReturnInventoryInput = {
	returnRequestId: string;
	items: Array<{
		returnItemId: string;
		restockable: boolean;
		disposition?: ReturnItemDisposition;
		quantity?: number;
	}>;
};

const RETURN_TRANSACTION_OPTIONS = {
	maxWait: 10_000,
	timeout: 30_000,
} as const;

/**
 * Apply an administrator's received-return inventory decision against the
 * real database. Kept separate from auth so isolated integration checks can
 * exercise the same mutation path with a deterministic admin fixture.
 */
export async function reconcileReturnInventoryForAdmin(
	input: ReconcileReturnInventoryInput,
	adminUserId: string,
) {
	const actor = await db.user.findUnique({ where: { id: adminUserId }, select: { role: true } });
	if (actor?.role !== 'ADMIN') throw new Error('Admin access required.');
	if (!input.items.length) throw new Error('Select at least one returned item.');

	return db.$transaction(async (tx) => {
		const request = await tx.returnRequest.findUnique({
			where: { id: input.returnRequestId },
			include: {
				items: {
					include: {
						orderItem: { select: { id: true, sizeId: true, quantity: true, status: true } },
					},
				},
			},
		});
		if (!request) throw new Error('Return request not found.');
		if (!['RECEIVED', 'REFUNDED', 'EXCHANGED'].includes(request.status)) {
			throw new Error('Stock can only be reconciled after the return is received.');
		}

		const decisions = new Map(input.items.map((item) => [item.returnItemId, item]));
		const deltas: Array<{ returnItemId: string; sizeId: string; quantity: number; disposition: ReturnItemDisposition }> = [];
		for (const item of request.items) {
			const decision = decisions.get(item.id);
			if (!decision) continue;
			const received = item.receivedQuantity > 0 ? item.receivedQuantity : item.quantity;
			const requested = decision.quantity ?? received;
			if (!Number.isInteger(requested) || requested < 0 || requested > received) {
				throw new Error('Restock quantities must be whole numbers within the received quantity.');
			}
			const disposition = decision.disposition ?? (decision.restockable ? 'RESTOCKABLE' : 'DAMAGED');
			const isRestockable = decision.restockable && disposition === 'RESTOCKABLE';
			const target = isRestockable ? requested : 0;
			const delta = target - item.restockedQuantity;
			if (delta < 0) throw new Error('Restocked quantities cannot be reduced.');
			if (delta > 0) deltas.push({ returnItemId: item.id, sizeId: item.orderItem.sizeId, quantity: delta, disposition });
			await tx.returnItem.update({
				where: { id: item.id },
				data: {
					restockable: isRestockable,
					receivedQuantity: received,
					restockedQuantity: item.restockedQuantity + delta,
				},
			});
		}
		for (const delta of deltas) {
			const existingSize = await tx.size.findUnique({
				where: { id: delta.sizeId },
				select: { quantity: true },
			});
			if (existingSize) {
				await adjustSizeInventory(tx, {
					sizeId: delta.sizeId,
					newQuantity: existingSize.quantity + delta.quantity,
					actorUserId: adminUserId,
					reason: 'Return item restock',
				});
			}
		}
		if (request.status === 'REFUNDED' || request.status === 'EXCHANGED') {
			const settledLines = await tx.returnItem.findMany({
				where: {
					orderItemId: { in: request.items.map((item) => item.orderItem.id) },
					returnRequest: { status: { in: ['REFUNDED', 'EXCHANGED'] } },
				},
				select: { orderItemId: true, quantity: true, returnRequest: { select: { status: true, resolution: true } } },
			});
			const lines = settledLines.map((line) => ({ orderItemId: line.orderItemId, quantity: line.quantity, status: line.returnRequest.status, resolution: line.returnRequest.resolution }));
			for (const item of request.items) {
				const settledQuantity = settledQuantityForOrderItem(lines, item.orderItem.id);
				const terminalStatus = terminalStatusForSettledLine({ originalQuantity: item.orderItem.quantity, settledQuantity, lines, orderItemId: item.orderItem.id });
				if (!terminalStatus) continue;
				await tx.orderItem.update({ where: { id: item.orderItem.id }, data: { status: terminalStatus } });
			}
		}
		const group = await tx.orderGroup.findUnique({
			where: { id: request.orderGroupId },
			select: { orderId: true, items: { select: { status: true } } },
		});
		if (group) {
			await tx.orderGroup.update({ where: { id: request.orderGroupId }, data: { status: deriveGroupStatus(group.items.map((item) => item.status)) } });
			const groups = await tx.orderGroup.findMany({ where: { orderId: group.orderId }, select: { status: true } });
			await tx.order.update({ where: { id: group.orderId }, data: { orderStatus: deriveOrderStatus(groups.map((entry) => entry.status)) } });
		}
		await tx.returnEvent.create({
			data: {
				returnRequestId: request.id,
				actorRole: 'ADMIN',
				actorId: adminUserId,
				eventType: 'return.inventory_reconciled',
				metadata: { deltas, dispositions: input.items.map((item) => ({ returnItemId: item.returnItemId, restockable: item.restockable, disposition: item.disposition })) },
			},
		});
		return { returnRequestId: request.id, restocked: deltas.reduce((sum, delta) => sum + delta.quantity, 0), deltas };
	}, RETURN_TRANSACTION_OPTIONS);
}

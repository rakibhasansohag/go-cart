import { Prisma } from '@prisma/client';

export type ShipmentItemQuantity = {
	orderItemId: string;
	orderedQuantity: number;
	assignedQuantity: number;
	requestedQuantity: number;
};

/**
 * ShipmentItem is the quantity-bearing record for a package assignment.
 * Keeping this guard outside the query layer makes the invariant reusable by
 * admin actions, carrier webhooks, seed data, and integration tests.
 */
export function assertShipmentItemQuantities(
	items: readonly ShipmentItemQuantity[],
): void {
	for (const item of items) {
		if (!Number.isInteger(item.requestedQuantity) || item.requestedQuantity <= 0) {
			throw new Error('Shipment item quantity must be a positive integer.');
		}
		if (item.assignedQuantity + item.requestedQuantity > item.orderedQuantity) {
			throw new Error(
				`Shipment quantity exceeds the unshipped quantity for order item ${item.orderItemId}.`,
			);
		}
	}
}

export async function assignShipmentItems(
	tx: Prisma.TransactionClient,
	input: {
		shipmentId: string;
		items: readonly { orderItemId: string; quantity: number }[];
	},
) {
	if (input.items.length === 0) {
		throw new Error('At least one shipment item is required.');
	}

	const quantities = new Map<string, number>();
	for (const item of input.items) {
		quantities.set(item.orderItemId, (quantities.get(item.orderItemId) ?? 0) + item.quantity);
	}

	const orderItemIds = [...quantities.keys()];
	const [shipment, orderItems, existingItems] = await Promise.all([
		tx.shipment.findUnique({ where: { id: input.shipmentId }, select: { id: true } }),
		tx.orderItem.findMany({
			where: { id: { in: orderItemIds } },
			select: { id: true, quantity: true, orderGroupId: true },
		}),
		tx.shipmentItem.findMany({
			where: { orderItemId: { in: orderItemIds } },
			select: { orderItemId: true, quantity: true },
		}),
	]);

	if (!shipment) throw new Error('Shipment not found.');
	if (orderItems.length !== orderItemIds.length) {
		throw new Error('One or more shipment items were not found.');
	}

	const assignedByItem = new Map<string, number>();
	for (const item of existingItems) {
		assignedByItem.set(item.orderItemId, (assignedByItem.get(item.orderItemId) ?? 0) + item.quantity);
	}
	assertShipmentItemQuantities(
		orderItems.map((item) => ({
			orderItemId: item.id,
			orderedQuantity: item.quantity,
			assignedQuantity: assignedByItem.get(item.id) ?? 0,
			requestedQuantity: quantities.get(item.id) ?? 0,
		})),
	);

	const groupIds = [...new Set(orderItems.map((item) => item.orderGroupId))];
	await Promise.all(
		groupIds.map((orderGroupId) =>
			tx.shipmentPackageAssignment.upsert({
				where: { shipmentId_orderGroupId: { shipmentId: input.shipmentId, orderGroupId } },
				create: { shipmentId: input.shipmentId, orderGroupId },
				update: {},
			}),
		),
	);

	await Promise.all(
		[...quantities.entries()].map(([orderItemId, quantity]) =>
			tx.shipmentItem.upsert({
				where: {
					shipmentId_orderItemId: {
						shipmentId: input.shipmentId,
						orderItemId,
					},
				},
				create: { shipmentId: input.shipmentId, orderItemId, quantity },
				update: { quantity: { increment: quantity } },
			}),
		),
	);

	return { itemCount: quantities.size };
}

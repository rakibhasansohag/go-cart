import { OrderStatus, ProductStatus } from '@prisma/client';

const ORDER_TO_PRODUCT_STATUS: Record<OrderStatus, ProductStatus> = {
	[OrderStatus.Pending]: ProductStatus.Pending,
	[OrderStatus.Confirmed]: ProductStatus.ReadyForShipment,
	[OrderStatus.Processing]: ProductStatus.Processing,
	[OrderStatus.Shipped]: ProductStatus.Shipped,
	[OrderStatus.OutforDelivery]: ProductStatus.Shipped,
	[OrderStatus.Delivered]: ProductStatus.Delivered,
	[OrderStatus.Cancelled]: ProductStatus.Canceled,
	[OrderStatus.Failed]: ProductStatus.FailedDelivery,
	[OrderStatus.Refunded]: ProductStatus.Refunded,
	[OrderStatus.Returned]: ProductStatus.Returned,
	[OrderStatus.PartiallyShipped]: ProductStatus.PartiallyShipped,
	[OrderStatus.OnHold]: ProductStatus.OnHold,
	[OrderStatus.PickedUp]: ProductStatus.PickedUp,
};

const PRODUCT_TO_ORDER_STATUS: Record<ProductStatus, OrderStatus> = {
	[ProductStatus.Pending]: OrderStatus.Pending,
	[ProductStatus.Processing]: OrderStatus.Processing,
	[ProductStatus.ReadyForShipment]: OrderStatus.Confirmed,
	[ProductStatus.Shipped]: OrderStatus.Shipped,
	[ProductStatus.Delivered]: OrderStatus.Delivered,
	[ProductStatus.Canceled]: OrderStatus.Cancelled,
	[ProductStatus.Returned]: OrderStatus.Returned,
	[ProductStatus.Refunded]: OrderStatus.Refunded,
	[ProductStatus.FailedDelivery]: OrderStatus.Failed,
	[ProductStatus.OnHold]: OrderStatus.OnHold,
	[ProductStatus.Backordered]: OrderStatus.OnHold,
	[ProductStatus.PartiallyShipped]: OrderStatus.PartiallyShipped,
	[ProductStatus.ExchangeRequested]: OrderStatus.OnHold,
	[ProductStatus.AwaitingPickup]: OrderStatus.Confirmed,
	[ProductStatus.PickedUp]: OrderStatus.PickedUp,
};

const IN_TRANSIT_STATUSES = new Set<OrderStatus>([
	OrderStatus.Shipped,
	OrderStatus.OutforDelivery,
	OrderStatus.Delivered,
	OrderStatus.PartiallyShipped,
	OrderStatus.Returned,
	OrderStatus.Refunded,
	OrderStatus.PickedUp,
]);

export function productStatusForOrderStatus(
	status: OrderStatus,
): ProductStatus {
	return ORDER_TO_PRODUCT_STATUS[status];
}

export function orderStatusForProductStatus(
	status: ProductStatus,
): OrderStatus {
	return PRODUCT_TO_ORDER_STATUS[status];
}

/**
 * Derives a safe summary for a parent record.
 *
 * A parent is terminal only when every child has the same terminal state.
 * Mixed fulfillment progress is surfaced as PartiallyShipped so the customer
 * is never told that an entire multi-package order has been delivered early.
 */
export function deriveOrderStatus(
	statuses: readonly OrderStatus[],
): OrderStatus {
	if (statuses.length === 0) return OrderStatus.Pending;

	const firstStatus = statuses[0];
	if (statuses.every((status) => status === firstStatus)) {
		return firstStatus;
	}

	if (
		statuses.every(
			(status) =>
				status === OrderStatus.Delivered || status === OrderStatus.PickedUp,
		)
	) {
		return OrderStatus.Delivered;
	}

	if (statuses.some((status) => IN_TRANSIT_STATUSES.has(status))) {
		return OrderStatus.PartiallyShipped;
	}

	if (statuses.includes(OrderStatus.OnHold)) return OrderStatus.OnHold;
	if (statuses.includes(OrderStatus.Failed)) return OrderStatus.Failed;
	if (statuses.includes(OrderStatus.Processing)) return OrderStatus.Processing;
	if (statuses.includes(OrderStatus.Confirmed)) return OrderStatus.Confirmed;
	if (statuses.includes(OrderStatus.Cancelled)) return OrderStatus.Cancelled;

	return OrderStatus.Pending;
}

export function deriveGroupStatus(
	statuses: readonly ProductStatus[],
): OrderStatus {
	return deriveOrderStatus(statuses.map(orderStatusForProductStatus));
}

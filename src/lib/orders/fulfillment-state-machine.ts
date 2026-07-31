import {
	FulfillmentActorRole,
	FulfillmentMode,
	OrderStatus,
	PackageStatus,
	ProductStatus,
	ShipmentStatus,
} from '@prisma/client';

export const PACKAGE_STATUS_LABELS: Record<PackageStatus, string> = {
	[PackageStatus.PENDING]: 'Pending',
	[PackageStatus.ACCEPTED]: 'Accepted',
	[PackageStatus.PROCESSING]: 'Processing',
	[PackageStatus.READY_FOR_HANDOFF]: 'Ready for handoff',
	[PackageStatus.HANDED_OFF]: 'Handed off',
	[PackageStatus.CANCELLED]: 'Cancelled',
};

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
	[ShipmentStatus.AWAITING_RECEIPT]: 'Awaiting receipt',
	[ShipmentStatus.RECEIVED_AT_HUB]: 'Received at hub',
	[ShipmentStatus.READY_FOR_DISPATCH]: 'Ready for dispatch',
	[ShipmentStatus.IN_TRANSIT]: 'In transit',
	[ShipmentStatus.OUT_FOR_DELIVERY]: 'Out for delivery',
	[ShipmentStatus.DELIVERY_ATTEMPT_FAILED]: 'Delivery attempt failed',
	[ShipmentStatus.READY_FOR_REDELIVERY]: 'Ready for redelivery',
	[ShipmentStatus.RETURNED_TO_HUB]: 'Returned to hub',
	[ShipmentStatus.RETURNED_TO_SELLER]: 'Returned to seller',
	[ShipmentStatus.DELIVERED]: 'Delivered',
	[ShipmentStatus.AWAITING_PICKUP]: 'Awaiting pickup',
	[ShipmentStatus.PICKED_UP]: 'Picked up',
	[ShipmentStatus.CANCELLED]: 'Cancelled',
};

const PACKAGE_FORWARD_TRANSITIONS: Record<PackageStatus, readonly PackageStatus[]> = {
	[PackageStatus.PENDING]: [PackageStatus.ACCEPTED],
	[PackageStatus.ACCEPTED]: [PackageStatus.PROCESSING],
	[PackageStatus.PROCESSING]: [PackageStatus.READY_FOR_HANDOFF],
	[PackageStatus.READY_FOR_HANDOFF]: [PackageStatus.HANDED_OFF],
	[PackageStatus.HANDED_OFF]: [],
	[PackageStatus.CANCELLED]: [],
};

const SHIPMENT_FORWARD_TRANSITIONS: Record<ShipmentStatus, readonly ShipmentStatus[]> = {
	[ShipmentStatus.AWAITING_RECEIPT]: [ShipmentStatus.RECEIVED_AT_HUB],
	[ShipmentStatus.RECEIVED_AT_HUB]: [ShipmentStatus.READY_FOR_DISPATCH],
	[ShipmentStatus.READY_FOR_DISPATCH]: [ShipmentStatus.IN_TRANSIT],
	[ShipmentStatus.IN_TRANSIT]: [ShipmentStatus.OUT_FOR_DELIVERY],
	[ShipmentStatus.OUT_FOR_DELIVERY]: [
		ShipmentStatus.DELIVERED,
		ShipmentStatus.DELIVERY_ATTEMPT_FAILED,
	],
	[ShipmentStatus.DELIVERY_ATTEMPT_FAILED]: [
		ShipmentStatus.READY_FOR_REDELIVERY,
		ShipmentStatus.RETURNED_TO_HUB,
	],
	[ShipmentStatus.READY_FOR_REDELIVERY]: [ShipmentStatus.OUT_FOR_DELIVERY],
	[ShipmentStatus.RETURNED_TO_HUB]: [
		ShipmentStatus.READY_FOR_REDELIVERY,
		ShipmentStatus.RETURNED_TO_SELLER,
	],
	[ShipmentStatus.RETURNED_TO_SELLER]: [],
	[ShipmentStatus.DELIVERED]: [],
	[ShipmentStatus.AWAITING_PICKUP]: [ShipmentStatus.PICKED_UP],
	[ShipmentStatus.PICKED_UP]: [],
	[ShipmentStatus.CANCELLED]: [],
};

const PACKAGE_ACTORS = new Set<FulfillmentActorRole>([
	FulfillmentActorRole.SELLER,
	FulfillmentActorRole.ADMIN,
	FulfillmentActorRole.SYSTEM,
]);

const LOGISTICS_ACTORS = new Set<FulfillmentActorRole>([
	FulfillmentActorRole.WAREHOUSE,
	FulfillmentActorRole.CARRIER,
	FulfillmentActorRole.ADMIN,
	FulfillmentActorRole.SYSTEM,
]);

export function getAllowedPackageTransitions(
	current: PackageStatus,
	actorRole: FulfillmentActorRole,
): PackageStatus[] {
	if (!PACKAGE_ACTORS.has(actorRole)) return [];
	return [...PACKAGE_FORWARD_TRANSITIONS[current]];
}

export function assertPackageTransition(
	current: PackageStatus,
	next: PackageStatus,
	actorRole: FulfillmentActorRole,
): void {
	if (!getAllowedPackageTransitions(current, actorRole).includes(next)) {
		throw new Error(
			`${actorRole.toLowerCase()} cannot move a package from ${PACKAGE_STATUS_LABELS[current]} to ${PACKAGE_STATUS_LABELS[next]}.`,
		);
	}
}

export function getAllowedShipmentTransitions({
	current,
	actorRole,
	mode,
}: {
	current: ShipmentStatus;
	actorRole: FulfillmentActorRole;
	mode: FulfillmentMode;
}): ShipmentStatus[] {
	const actorCanAdvance =
		LOGISTICS_ACTORS.has(actorRole) ||
		(actorRole === FulfillmentActorRole.SELLER &&
			(mode === FulfillmentMode.SELLER ||
				(mode === FulfillmentMode.PICKUP &&
					current === ShipmentStatus.AWAITING_PICKUP)));

	if (!actorCanAdvance) return [];
	return [...SHIPMENT_FORWARD_TRANSITIONS[current]];
}

export function assertShipmentTransition({
	current,
	next,
	actorRole,
	mode,
	packageStatus,
	reasonCode,
}: {
	current: ShipmentStatus;
	next: ShipmentStatus;
	actorRole: FulfillmentActorRole;
	mode: FulfillmentMode;
	packageStatus: PackageStatus;
	reasonCode?: string;
}): void {
	if (
		current === ShipmentStatus.AWAITING_RECEIPT &&
		packageStatus !== PackageStatus.HANDED_OFF
	) {
		throw new Error('The package must be handed off before warehouse receipt.');
	}

	if (
		next === ShipmentStatus.DELIVERY_ATTEMPT_FAILED &&
		!reasonCode?.trim()
	) {
		throw new Error('A failed delivery attempt requires a reason code.');
	}

	if (
		!getAllowedShipmentTransitions({ current, actorRole, mode }).includes(next)
	) {
		throw new Error(
			`${actorRole.toLowerCase()} cannot move a shipment from ${SHIPMENT_STATUS_LABELS[current]} to ${SHIPMENT_STATUS_LABELS[next]}.`,
		);
	}
}

export function canRequestCancellation(status: PackageStatus): boolean {
	const cancellable = new Set<PackageStatus>([
		PackageStatus.PENDING,
		PackageStatus.ACCEPTED,
		PackageStatus.PROCESSING,
		PackageStatus.READY_FOR_HANDOFF,
	]);
	return cancellable.has(status);
}

export function orderStatusForFulfillment({
	packageStatus,
	shipmentStatus,
}: {
	packageStatus: PackageStatus;
	shipmentStatus?: ShipmentStatus | null;
}): OrderStatus {
	if (packageStatus === PackageStatus.CANCELLED) return OrderStatus.Cancelled;

	switch (shipmentStatus) {
		case ShipmentStatus.DELIVERED:
			return OrderStatus.Delivered;
		case ShipmentStatus.PICKED_UP:
			return OrderStatus.PickedUp;
		case ShipmentStatus.IN_TRANSIT:
		case ShipmentStatus.READY_FOR_REDELIVERY:
			return OrderStatus.Shipped;
		case ShipmentStatus.OUT_FOR_DELIVERY:
			return OrderStatus.OutforDelivery;
		case ShipmentStatus.DELIVERY_ATTEMPT_FAILED:
		case ShipmentStatus.RETURNED_TO_HUB:
		case ShipmentStatus.RETURNED_TO_SELLER:
			return OrderStatus.Failed;
		case ShipmentStatus.CANCELLED:
			return OrderStatus.Cancelled;
		default:
			break;
	}

	switch (packageStatus) {
		case PackageStatus.PENDING:
			return OrderStatus.Pending;
		case PackageStatus.PROCESSING:
			return OrderStatus.Processing;
		case PackageStatus.ACCEPTED:
		case PackageStatus.READY_FOR_HANDOFF:
		case PackageStatus.HANDED_OFF:
			return OrderStatus.Confirmed;
	}
}

export function productStatusForFulfillment(
	status: OrderStatus,
): ProductStatus {
	switch (status) {
		case OrderStatus.Pending:
			return ProductStatus.Pending;
		case OrderStatus.Confirmed:
			return ProductStatus.ReadyForShipment;
		case OrderStatus.Processing:
			return ProductStatus.Processing;
		case OrderStatus.Shipped:
		case OrderStatus.OutforDelivery:
		case OrderStatus.PartiallyShipped:
			return ProductStatus.Shipped;
		case OrderStatus.Delivered:
			return ProductStatus.Delivered;
		case OrderStatus.PickedUp:
			return ProductStatus.PickedUp;
		case OrderStatus.Cancelled:
			return ProductStatus.Canceled;
		case OrderStatus.Failed:
			return ProductStatus.FailedDelivery;
		case OrderStatus.Refunded:
			return ProductStatus.Refunded;
		case OrderStatus.Returned:
			return ProductStatus.Returned;
		case OrderStatus.OnHold:
			return ProductStatus.OnHold;
	}
}

export function isFulfillmentComplete(status: OrderStatus): boolean {
	return status === OrderStatus.Delivered || status === OrderStatus.PickedUp;
}

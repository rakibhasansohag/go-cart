export function primaryShipmentFromAssignments<
	T extends { shipmentAssignments: readonly { shipment: unknown }[] },
>(record: T): Omit<T, 'shipmentAssignments'> & { shipment: T['shipmentAssignments'][number]['shipment'] | null } {
	const { shipmentAssignments, ...rest } = record;
	return {
		...rest,
		shipment: shipmentAssignments[0]?.shipment ?? null,
	} as Omit<T, 'shipmentAssignments'> & {
		shipment: T['shipmentAssignments'][number]['shipment'] | null;
	};
}

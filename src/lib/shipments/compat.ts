export function primaryShipmentFromAssignments<
	T extends { shipmentAssignments: readonly { shipment: unknown }[] },
>(record: T): Omit<T, 'shipmentAssignments'> & {
		shipment: T['shipmentAssignments'][number]['shipment'] | null;
		shipments: T['shipmentAssignments'][number]['shipment'][];
	} {
	const { shipmentAssignments, ...rest } = record;
	const shipments = shipmentAssignments.map(({ shipment }) => shipment);
	return {
		...rest,
		shipment: shipments[0] ?? null,
		shipments,
	} as Omit<T, 'shipmentAssignments'> & {
		shipment: T['shipmentAssignments'][number]['shipment'] | null;
		shipments: T['shipmentAssignments'][number]['shipment'][];
	};
}

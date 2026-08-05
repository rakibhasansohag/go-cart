import { PrismaClient, ShipmentStatus } from '@prisma/client';

const db = new PrismaClient();

async function runSimulation() {
	console.log('=== Tracking Simulation Engine ===');

	const shipments = await db.shipment.findMany({
		take: 5,
		include: {
			orderGroup: {
				select: { id: true, store: { select: { name: true } } },
			},
		},
		orderBy: { updatedAt: 'desc' },
	});

	if (shipments.length === 0) {
		console.log('No active shipments found in the database to simulate.');
		return;
	}

	const milestones: ShipmentStatus[] = [
		ShipmentStatus.AWAITING_RECEIPT,
		ShipmentStatus.RECEIVED_AT_HUB,
		ShipmentStatus.IN_TRANSIT,
		ShipmentStatus.OUT_FOR_DELIVERY,
		ShipmentStatus.DELIVERED,
	];

	for (const shipment of shipments) {
		const currentIndex = milestones.indexOf(shipment.status);
		const nextStatus = milestones[Math.min(currentIndex + 1, milestones.length - 1)];

		const updated = await db.shipment.update({
			where: { id: shipment.id },
			data: {
				status: nextStatus,
				carrier: shipment.carrier || 'DHL Express',
				trackingNumber: shipment.trackingNumber || `DHL-${Math.floor(100000000 + Math.random() * 900000000)}`,
				estimatedDeliveryAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
			},
		});

		console.log(`[Package #${shipment.orderGroup.id.slice(-8).toUpperCase()}] (${shipment.orderGroup.store.name}) -> Status updated to: ${updated.status} | Carrier: ${updated.carrier} | Tracking #: ${updated.trackingNumber}`);
	}

	console.log('=== Simulation Completed Successfully ===');
}

runSimulation()
	.catch(console.error)
	.finally(() => db.$disconnect());

import 'server-only';

import { db } from '@/lib/db';
import { syncLegacyFulfillmentSummary } from '@/queries/fulfillment';
import {
	DOMAIN_EVENT_TYPES,
	publishDomainEvent,
} from '@/lib/notifications/domain-events';
import {
	getAllowedPackageTransitions,
	getAllowedShipmentTransitions,
	PACKAGE_STATUS_LABELS,
	SHIPMENT_STATUS_LABELS,
} from './fulfillment-state-machine';
import {
	AutomationRunStatus,
	FulfillmentActorRole,
	FulfillmentEntityType,
	FulfillmentSource,
	PaymentStatus,
	Prisma,
	ShipmentStatus,
} from '@prisma/client';
import {
	demoFulfillmentAutomationEnabled,
	demoFulfillmentBatchSize,
	demoFulfillmentStepHours,
} from './demo-config';

const TX_OPTIONS = { maxWait: 10_000, timeout: 30_000 } as const;

function nextDue() {
	return new Date(Date.now() + demoFulfillmentStepHours() * 60 * 60 * 1000);
}

function key(groupId: string, next: string) {
	return `automation:${groupId}:${next}:${Date.now()}`;
}

async function advanceOne(groupId: string) {
	return db.$transaction(async (tx) => {
		const group = await tx.orderGroup.findUnique({
			where: { id: groupId },
			include: {
				shipmentAssignments: {
					include: { shipment: true },
					orderBy: { createdAt: 'asc' },
				},
				store: { select: { name: true, url: true } },
				items: true,
				order: { select: { id: true, paymentStatus: true, paymentDetails: { select: { currency: true } } } },
			},
		});
		if (!group || group.automationMode !== 'DEMO' || group.automationPaused) return false;
		if (group.order.paymentStatus !== PaymentStatus.Paid) return false;

		const packageNext = getAllowedPackageTransitions(group.packageStatus, FulfillmentActorRole.SYSTEM)[0];
		if (packageNext) {
			const idempotencyKey = key(group.id, packageNext);
			const changed = await tx.orderGroup.updateMany({
				where: { id: group.id, packageStatus: group.packageStatus, automationMode: 'DEMO', automationPaused: false },
				data: { packageStatus: packageNext, nextTransitionAt: nextDue() },
			});
			if (changed.count !== 1) return false;
			await tx.fulfillmentTransition.create({
				data: {
					entityType: FulfillmentEntityType.PACKAGE,
					previousStatus: group.packageStatus,
					nextStatus: packageNext,
					actorRole: FulfillmentActorRole.SYSTEM,
					source: FulfillmentSource.AUTOMATION,
					idempotencyKey,
					orderId: group.orderId,
					orderGroupId: group.id,
				},
			});
			await publishDomainEvent(tx, {
				eventKey: `fulfillment:${idempotencyKey}`,
				eventType: DOMAIN_EVENT_TYPES.PACKAGE_STATUS_CHANGED,
				aggregateType: 'ORDER_PACKAGE',
				aggregateId: group.id,
				actorUserId: null,
				orderId: group.orderId,
				storeId: group.storeId,
				payload: {
					orderId: group.orderId,
					orderGroupId: group.id,
					storeUrl: group.store.url,
					storeName: group.store.name,
					previousStatus: PACKAGE_STATUS_LABELS[group.packageStatus],
					nextStatus: PACKAGE_STATUS_LABELS[packageNext],
					items: group.items.map((item) => ({ name: item.name, image: item.image, sku: item.sku, size: item.size, quantity: item.quantity, unitPrice: item.price, totalPrice: item.totalPrice, storeName: group.store.name })),
				},
			});
			await syncLegacyFulfillmentSummary(tx, {
				...group,
				packageStatus: packageNext,
				shipment: group.shipmentAssignments[0]?.shipment ?? null,
			});
			return true;
		}

		const shipment = group.shipmentAssignments[0]?.shipment ?? null;
		if (!shipment) {
			await tx.orderGroup.update({ where: { id: group.id }, data: { automationMode: 'MANUAL', nextTransitionAt: null } });
			return false;
		}
		const shipmentNext = getAllowedShipmentTransitions({ current: shipment.status, actorRole: FulfillmentActorRole.SYSTEM, mode: group.fulfillmentMode }).find((status) => status !== ShipmentStatus.DELIVERY_ATTEMPT_FAILED);
		if (!shipmentNext) {
			await tx.orderGroup.update({ where: { id: group.id }, data: { automationMode: 'MANUAL', nextTransitionAt: null } });
			return false;
		}
		const idempotencyKey = key(group.id, shipmentNext);
		const changed = await tx.shipment.updateMany({ where: { id: shipment.id, status: shipment.status }, data: { status: shipmentNext } });
		if (changed.count !== 1) return false;
		await tx.fulfillmentTransition.create({
			data: {
				entityType: FulfillmentEntityType.SHIPMENT,
				previousStatus: shipment.status,
				nextStatus: shipmentNext,
				actorRole: FulfillmentActorRole.SYSTEM,
				source: FulfillmentSource.AUTOMATION,
				idempotencyKey,
				orderId: group.orderId,
				orderGroupId: group.id,
				shipmentId: shipment.id,
			},
		});
		await publishDomainEvent(tx, {
			eventKey: `fulfillment:${idempotencyKey}`,
			eventType: DOMAIN_EVENT_TYPES.SHIPMENT_STATUS_CHANGED,
			aggregateType: 'SHIPMENT',
			aggregateId: shipment.id,
			orderId: group.orderId,
			storeId: group.storeId,
			payload: {
				orderId: group.orderId,
				orderGroupId: group.id,
				shipmentId: shipment.id,
				storeUrl: group.store.url,
				storeName: group.store.name,
				previousStatus: SHIPMENT_STATUS_LABELS[shipment.status],
				nextStatus: SHIPMENT_STATUS_LABELS[shipmentNext],
				items: group.items.map((item) => ({ name: item.name, image: item.image, sku: item.sku, size: item.size, quantity: item.quantity, unitPrice: item.price, totalPrice: item.totalPrice, storeName: group.store.name })),
			},
		});
		await tx.orderGroup.update({ where: { id: group.id }, data: { nextTransitionAt: nextDue() } });
		await syncLegacyFulfillmentSummary(tx, { ...group, shipment: { status: shipmentNext } });
		return true;
	}, TX_OPTIONS);
}

export async function runDemoFulfillment(input: { manual?: boolean } = {}) {
	if (!demoFulfillmentAutomationEnabled() && !input.manual) {
		return { disabled: true, scanned: 0, advanced: 0, failed: 0 };
	}
	const bucket = input.manual ? Date.now() : Math.floor(Date.now() / 86_400_000);
	const idempotencyKey = `demo-fulfillment:${bucket}`;
	let run;
	try {
		run = await db.automationRun.create({ data: { idempotencyKey } });
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return { duplicate: true, scanned: 0, advanced: 0, failed: 0 };
		throw error;
	}
	const due = await db.orderGroup.findMany({
		where: {
			automationMode: 'DEMO',
			automationPaused: false,
			...(input.manual ? {} : { nextTransitionAt: { lte: new Date() } }),
			order: { paymentStatus: PaymentStatus.Paid },
		},
		select: { id: true }, orderBy: { nextTransitionAt: 'asc' }, take: demoFulfillmentBatchSize(),
	});
	let advanced = 0;
	let failed = 0;
	const errors: string[] = [];
	for (const group of due) {
		try { if (await advanceOne(group.id)) advanced++; }
		catch (error) { failed++; errors.push(error instanceof Error ? error.message : String(error)); }
	}
	await db.automationRun.update({ where: { id: run.id }, data: { status: failed ? (advanced ? AutomationRunStatus.PARTIAL : AutomationRunStatus.FAILED) : AutomationRunStatus.SUCCEEDED, finishedAt: new Date(), scannedCount: due.length, advancedCount: advanced, failedCount: failed, errorSummary: errors.join('\n').slice(0, 4000) || null } });
	return { disabled: false, runId: run.id, scanned: due.length, advanced, failed };
}

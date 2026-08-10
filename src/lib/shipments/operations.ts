import 'server-only';

import { db } from '@/lib/db';
import { assignShipmentItems } from '@/lib/shipments/assignments';
import {
	assertShipmentTransition,
} from '@/lib/orders/fulfillment-state-machine';
import { syncLegacyFulfillmentSummary } from '@/queries/fulfillment';
import { DOMAIN_EVENT_TYPES, publishDomainEvent } from '@/lib/notifications/domain-events';
import { scheduleEmailOutboxDispatch } from '@/lib/email/schedule';
import { currentUser } from '@clerk/nextjs/server';
import {
	FulfillmentActorRole,
	FulfillmentEntityType,
	FulfillmentSource,
	Prisma,
	ShipmentStatus,
} from '@prisma/client';

// Kept here so admin actions and the carrier webhook share the same transaction
// boundary and cannot create a tracking event without its audit transition.
const TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 30_000 } as const;

function key(value: string) {
	const trimmed = value.trim();
	if (trimmed.length < 8 || trimmed.length > 200) throw new Error('A valid idempotency key is required.');
	return trimmed;
}

function requireAdmin(user: Awaited<ReturnType<typeof currentUser>>) {
	if (!user) throw new Error('Unauthenticated.');
	if (user.privateMetadata.role !== 'ADMIN') throw new Error('Admin logistics privileges are required.');
}

type ShipmentContext = Prisma.ShipmentGetPayload<{
	include: {
		packageAssignments: {
			include: {
				orderGroup: {
					include: {
						store: { select: { name: true, url: true } },
						items: true,
						order: { select: { paymentDetails: { select: { currency: true } } } },
					},
				},
			},
		};
	};
}>;

async function shipmentContext(tx: Prisma.TransactionClient, shipmentId: string): Promise<ShipmentContext> {
	const shipment = await tx.shipment.findUnique({
		where: { id: shipmentId },
		include: {
			packageAssignments: {
				include: {
					orderGroup: {
						include: {
							store: { select: { name: true, url: true } },
							items: true,
							order: { select: { paymentDetails: { select: { currency: true } } } },
						},
					},
				},
				orderBy: { createdAt: 'asc' },
			},
		},
	});
	if (!shipment || shipment.packageAssignments.length === 0) throw new Error('Shipment package assignment not found.');
	return shipment;
}

function primaryGroup(shipment: ShipmentContext) {
	return shipment.packageAssignments[0].orderGroup;
}

function eventPayload(shipment: ShipmentContext, previousStatus: ShipmentStatus, nextStatus: ShipmentStatus, extra: Prisma.InputJsonObject = {}) {
	const group = primaryGroup(shipment);
	return {
		orderId: group.orderId,
		orderGroupId: group.id,
		shipmentId: shipment.id,
		storeUrl: group.store.url,
		storeName: group.store.name,
		previousStatus,
		nextStatus,
		items: group.items.map((item) => ({ name: item.name, sku: item.sku, quantity: item.quantity })),
		...extra,
	} satisfies Prisma.InputJsonObject;
}

async function publishShipmentStatusEvent(
	tx: Prisma.TransactionClient,
	shipment: ShipmentContext,
	previousStatus: ShipmentStatus,
	nextStatus: ShipmentStatus,
	actorUserId: string | null,
	source: FulfillmentSource,
	eventKey: string,
	extra: Prisma.InputJsonObject = {},
) {
	const group = primaryGroup(shipment);
	return publishDomainEvent(tx, {
		eventKey,
		eventType: DOMAIN_EVENT_TYPES.SHIPMENT_STATUS_CHANGED,
		aggregateType: 'SHIPMENT',
		aggregateId: shipment.id,
		actorUserId,
		orderId: group.orderId,
		storeId: group.storeId,
		payload: eventPayload(shipment, previousStatus, nextStatus, {
			...extra,
			source,
		}),
	});
}

export async function assignShipmentItemsAction(input: {
	shipmentId: string;
	items: Array<{ orderItemId: string; quantity: number }>;
	}) {
	const user = await currentUser();
	requireAdmin(user);
	return db.$transaction((tx) => assignShipmentItems(tx, input), TRANSACTION_OPTIONS);
}

export async function createDeliveryAttemptAction(input: {
	shipmentId: string;
	outcome: string;
	reasonCode?: string;
	message?: string;
	occurredAt?: string | Date;
	idempotencyKey: string;
}) {
	const user = await currentUser();
	requireAdmin(user);
	const idempotencyKey = key(input.idempotencyKey);
	const result = await db.$transaction(async (tx) => {
		const duplicate = await tx.fulfillmentTransition.findUnique({ where: { idempotencyKey } });
		if (duplicate) return { attemptId: null, sourceEventIds: [] as string[] };
		const shipment = await shipmentContext(tx, input.shipmentId);
		const last = await tx.deliveryAttempt.findFirst({ where: { shipmentId: shipment.id }, orderBy: { attemptNumber: 'desc' }, select: { attemptNumber: true } });
		const attempt = await tx.deliveryAttempt.create({
			data: {
				shipmentId: shipment.id,
				attemptNumber: (last?.attemptNumber ?? 0) + 1,
				outcome: input.outcome.trim(),
				reasonCode: input.reasonCode?.trim() || null,
				message: input.message?.trim() || null,
				occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
			},
		});
		const group = primaryGroup(shipment);
		const eventIds: string[] = [];
		await tx.fulfillmentTransition.create({
			data: {
				entityType: FulfillmentEntityType.SHIPMENT,
				previousStatus: shipment.status,
				nextStatus: shipment.status,
				actorRole: FulfillmentActorRole.ADMIN,
				source: FulfillmentSource.MANUAL,
				reasonCode: input.reasonCode?.trim() || null,
				message: input.message?.trim() || input.outcome.trim(),
				idempotencyKey,
				actorUserId: user?.id,
				orderId: group.orderId,
				orderGroupId: group.id,
				shipmentId: shipment.id,
			},
		});
		const event = await publishDomainEvent(tx, {
			eventKey: `shipment:delivery-attempt:${idempotencyKey}`,
			eventType: DOMAIN_EVENT_TYPES.SHIPMENT_DELIVERY_ATTEMPT,
			aggregateType: 'SHIPMENT',
			aggregateId: shipment.id,
			actorUserId: user?.id,
			orderId: group.orderId,
			storeId: group.storeId,
			payload: eventPayload(shipment, shipment.status, shipment.status, {
				attemptNumber: attempt.attemptNumber,
				outcome: attempt.outcome,
				deliveryAttemptId: attempt.id,
			}),
		});
		eventIds.push(event.id);
		return { attemptId: attempt.id, sourceEventIds: eventIds };
	}, TRANSACTION_OPTIONS);
	scheduleEmailOutboxDispatch(result.sourceEventIds);
	return result;
}

export async function recordShipmentTrackingEvent(input: {
	shipmentId: string;
	status: ShipmentStatus;
	providerEventId?: string;
	location?: string;
	description?: string;
	occurredAt?: string | Date;
	reasonCode?: string;
	message?: string;
	proofOfDeliveryUrl?: string;
	proofOfDeliveryAt?: string | Date;
	idempotencyKey: string;
	actorRole: FulfillmentActorRole;
	actorUserId?: string | null;
	source: FulfillmentSource;
}) {
	const idempotencyKey = key(input.idempotencyKey);
	const result = await db.$transaction(async (tx) => {
		if (input.providerEventId) {
			const duplicate = await tx.trackingEvent.findUnique({ where: { providerEventId: input.providerEventId } });
			if (duplicate) return { duplicate: true, trackingEventId: duplicate.id, sourceEventIds: [] as string[] };
		}
		const transitionDuplicate = await tx.fulfillmentTransition.findUnique({ where: { idempotencyKey } });
		if (transitionDuplicate) return { duplicate: true, trackingEventId: null, sourceEventIds: [] as string[] };
		const shipment = await shipmentContext(tx, input.shipmentId);
		const group = primaryGroup(shipment);
		const previousStatus = shipment.status;
		if (input.status !== previousStatus) {
			assertShipmentTransition({
				current: previousStatus,
				next: input.status,
				actorRole: input.actorRole,
				mode: group.fulfillmentMode,
				packageStatus: group.packageStatus,
				reasonCode: input.reasonCode,
				allowSkip: false,
			});
		}
		const trackingEvent = await tx.trackingEvent.create({
			data: {
				shipmentId: input.shipmentId,
				providerEventId: input.providerEventId || null,
				status: input.status,
				location: input.location?.trim() || null,
				description: input.description?.trim() || null,
				occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
			},
		});
		if (input.status !== previousStatus) {
			await tx.shipment.update({
				where: { id: input.shipmentId },
				data: {
					status: input.status,
					failureReasonCode: input.status === ShipmentStatus.DELIVERY_ATTEMPT_FAILED ? input.reasonCode?.trim() || null : null,
					failureMessage: input.status === ShipmentStatus.DELIVERY_ATTEMPT_FAILED ? input.message?.trim() || null : null,
				},
			});
		}
		if (input.status === ShipmentStatus.DELIVERY_ATTEMPT_FAILED) {
			const last = await tx.deliveryAttempt.findFirst({ where: { shipmentId: input.shipmentId }, orderBy: { attemptNumber: 'desc' }, select: { attemptNumber: true } });
			await tx.deliveryAttempt.create({
				data: {
					shipmentId: input.shipmentId,
					attemptNumber: (last?.attemptNumber ?? 0) + 1,
					outcome: 'FAILED',
					reasonCode: input.reasonCode?.trim() || null,
					message: input.message?.trim() || null,
					occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
				},
			});
		}
		if (input.proofOfDeliveryUrl || input.proofOfDeliveryAt) {
			await tx.shipment.update({
				where: { id: input.shipmentId },
				data: {
					proofOfDeliveryUrl: input.proofOfDeliveryUrl?.trim() || undefined,
					proofOfDeliveryAt: input.proofOfDeliveryAt ? new Date(input.proofOfDeliveryAt) : new Date(),
				},
			});
		}
		const eventIds: string[] = [];
		await tx.fulfillmentTransition.create({
			data: {
				entityType: FulfillmentEntityType.SHIPMENT,
				previousStatus,
				nextStatus: input.status,
				actorRole: input.actorRole,
				source: input.source,
				reasonCode: input.reasonCode?.trim() || null,
				message: input.message?.trim() || input.description?.trim() || null,
				idempotencyKey,
				actorUserId: input.actorUserId ?? null,
				orderId: group.orderId,
				orderGroupId: group.id,
				shipmentId: shipment.id,
			},
		});
		const statusEvent = await publishShipmentStatusEvent(tx, shipment, previousStatus, input.status, input.actorUserId ?? null, input.source, `shipment:status:${idempotencyKey}`, { trackingEventId: trackingEvent.id, location: input.location || '' });
		eventIds.push(statusEvent.id);
		const trackingEventNotification = await publishDomainEvent(tx, {
			eventKey: `shipment:tracking:${idempotencyKey}`,
			eventType: DOMAIN_EVENT_TYPES.SHIPMENT_TRACKING_UPDATED,
			aggregateType: 'SHIPMENT',
			aggregateId: shipment.id,
			actorUserId: input.actorUserId ?? null,
			orderId: group.orderId,
			storeId: group.storeId,
			payload: eventPayload(shipment, previousStatus, input.status, { trackingEventId: trackingEvent.id, location: input.location || '' }),
		});
		eventIds.push(trackingEventNotification.id);
		await syncLegacyFulfillmentSummary(tx, { ...group, shipment: { status: input.status } });
		return { duplicate: false, trackingEventId: trackingEvent.id, sourceEventIds: eventIds };
	}, TRANSACTION_OPTIONS);
	scheduleEmailOutboxDispatch(result.sourceEventIds);
	return result;
}

export async function recordShipmentTrackingEventAction(input: Omit<Parameters<typeof recordShipmentTrackingEvent>[0], 'actorRole' | 'actorUserId' | 'source'>) {
	const user = await currentUser();
	requireAdmin(user);
	return recordShipmentTrackingEvent({ ...input, actorRole: FulfillmentActorRole.ADMIN, actorUserId: user?.id, source: FulfillmentSource.MANUAL });
}

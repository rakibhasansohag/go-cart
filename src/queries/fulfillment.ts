'use server';

import { db } from '@/lib/db';
import { scheduleEmailOutboxDispatch } from '@/lib/email/schedule';
import { after } from 'next/server';
import {
	assertPackageTransition,
	assertShipmentTransition,
	canRequestCancellation,
	orderStatusForFulfillment,
	PACKAGE_STATUS_LABELS,
	productStatusForFulfillment,
	SHIPMENT_STATUS_LABELS,
} from '@/lib/orders/fulfillment-state-machine';
import {
	DOMAIN_EVENT_TYPES,
	publishDomainEvent,
	type PublishDomainEventInput,
} from '@/lib/notifications/domain-events';
import { deriveOrderStatus } from '@/lib/orders/status-sync';
import { refreshSettlementEligibilityForOrderGroup } from '@/lib/settlement/service';
import { auth, currentUser } from '@clerk/nextjs/server';
import {
	CancellationReasonCode,
	CancellationRequestStatus,
	FulfillmentActorRole,
	FulfillmentEntityType,
	FulfillmentSource,
	PackageStatus,
	Prisma,
	ShipmentStatus,
} from '@prisma/client';
import { updateTag } from 'next/cache';

type TransactionClient = Prisma.TransactionClient;

// Fulfillment updates touch the package, items, order summary, and audit trail.
// Remote Postgres providers can legitimately take longer than Prisma's default
// five-second interactive transaction timeout.
const FULFILLMENT_TRANSACTION_OPTIONS = {
	maxWait: 10_000,
	timeout: 30_000,
} as const;

function requiredIdempotencyKey(value: string): string {
	const key = value.trim();
	if (key.length < 8 || key.length > 200) {
		throw new Error('A valid idempotency key is required.');
	}
	return key;
}

async function scheduleFulfillmentEventNotifications(
	input: PublishDomainEventInput,
	sourceEventId: string,
) {
	const fanOut = async () => {
		try {
			const event = await publishDomainEvent(db, input);
			scheduleEmailOutboxDispatch([event.id]);
		} catch (error) {
			console.error('Fulfillment notifications could not be published:', error);
			// The event is durable even if notification fan-out needs recovery.
			scheduleEmailOutboxDispatch([sourceEventId]);
		}
	};

	try {
		after(fanOut);
	} catch {
		// Maintenance scripts and unit tests have no request scope; finish the
		// same work synchronously in those contexts.
		await fanOut();
	}
}

export async function syncLegacyFulfillmentSummary(
	tx: TransactionClient,
	group: {
		id: string;
		orderId: string;
		packageStatus: PackageStatus;
		shipment: { status: ShipmentStatus } | null;
	},
) {
	const groupStatus = orderStatusForFulfillment({
		packageStatus: group.packageStatus,
		shipmentStatus: group.shipment?.status,
	});
	const itemStatus = productStatusForFulfillment(groupStatus);
	const completedAt =
		groupStatus === 'Delivered' || groupStatus === 'PickedUp'
			? new Date()
			: undefined;

	await tx.orderGroup.update({
		where: { id: group.id },
		data: { status: groupStatus },
	});
	await tx.orderItem.updateMany({
		where: { orderGroupId: group.id },
		data: {
			status: itemStatus,
			...(completedAt ? { deliveredAt: completedAt } : {}),
		},
	});

	const groups = await tx.orderGroup.findMany({
		where: { orderId: group.orderId },
		select: { status: true },
	});
	await tx.order.update({
		where: { id: group.orderId },
		data: {
			orderStatus: deriveOrderStatus(groups.map(({ status }) => status)),
		},
	});

	return groupStatus;
}

export async function updatePackageStatus(input: {
	storeId: string;
	groupId: string;
	nextStatus: PackageStatus;
	idempotencyKey: string;
}) {
	const user = await currentUser();
	if (!user) throw new Error('Unauthenticated.');
	if (user.privateMetadata.role !== 'SELLER') {
		throw new Error('Seller privileges are required.');
	}

	const idempotencyKey = requiredIdempotencyKey(input.idempotencyKey);
	const store = await db.store.findFirst({
		where: { id: input.storeId, userId: user.id },
		select: { id: true },
	});
	if (!store) throw new Error('You do not own this store.');

	const result = await db.$transaction(async (tx) => {
		const duplicate = await tx.fulfillmentTransition.findUnique({
			where: { idempotencyKey },
		});
		if (duplicate) {
			return {
				status: duplicate.nextStatus as PackageStatus,
				sourceEventId: null,
				notificationInput: null,
			};
		}

		const group = await tx.orderGroup.findFirst({
		where: { id: input.groupId, storeId: store.id },
		include: {
				shipmentAssignments: {
					include: { shipment: true },
					orderBy: { createdAt: 'asc' },
				},
				store: { select: { name: true, url: true } },
				items: true,
				order: {
					select: { paymentDetails: { select: { currency: true } } },
				},
			},
		});
		if (!group) throw new Error('Package not found.');
		const shipment = group.shipmentAssignments[0]?.shipment ?? null;

		assertPackageTransition(
			group.packageStatus,
			input.nextStatus,
			FulfillmentActorRole.SELLER,
		);

		const changed = await tx.orderGroup.updateMany({
			where: { id: group.id, packageStatus: group.packageStatus },
			data: { packageStatus: input.nextStatus },
		});
		if (changed.count !== 1) {
			throw new Error('Package changed elsewhere. Refresh and try again.');
		}

		await tx.fulfillmentTransition.create({
			data: {
				entityType: FulfillmentEntityType.PACKAGE,
				previousStatus: group.packageStatus,
				nextStatus: input.nextStatus,
				actorRole: FulfillmentActorRole.SELLER,
				source: FulfillmentSource.MANUAL,
				idempotencyKey,
				actorUserId: user.id,
				orderId: group.orderId,
				orderGroupId: group.id,
			},
		});

		const notificationInput: PublishDomainEventInput = {
			eventKey: `fulfillment:${idempotencyKey}`,
			eventType: DOMAIN_EVENT_TYPES.PACKAGE_STATUS_CHANGED,
			aggregateType: 'ORDER_PACKAGE',
			aggregateId: group.id,
			actorUserId: user.id,
			orderId: group.orderId,
			storeId: store.id,
			payload: {
				orderId: group.orderId,
				orderGroupId: group.id,
				storeUrl: group.store.url,
				storeName: group.store.name,
				previousStatus: PACKAGE_STATUS_LABELS[group.packageStatus],
				nextStatus: PACKAGE_STATUS_LABELS[input.nextStatus],
				subTotal: group.subTotal,
				shippingFees: group.shippingFees,
				total: group.total,
				currency: group.order.paymentDetails?.currency?.toUpperCase() ?? 'USD',
				itemCount: group.items.reduce((count, item) => count + item.quantity, 0),
				items: group.items.map((item) => ({
					name: item.name,
					image: item.image,
					sku: item.sku,
					size: item.size,
					quantity: item.quantity,
					unitPrice: item.price,
					totalPrice: item.totalPrice,
					storeName: group.store.name,
				})),
			},
		};

		const domainEvent = await publishDomainEvent(tx, {
			...notificationInput,
			persistEventOnly: true,
		});

		await syncLegacyFulfillmentSummary(tx, {
			...group,
			packageStatus: input.nextStatus,
			shipment,
		});
		return {
			status: input.nextStatus,
			sourceEventId: domainEvent.id,
			notificationInput,
		};
	}, FULFILLMENT_TRANSACTION_OPTIONS);

	if (result.notificationInput && result.sourceEventId) {
		await scheduleFulfillmentEventNotifications(
			result.notificationInput,
			result.sourceEventId,
		);
	}
	await refreshSettlementEligibilityForOrderGroup(input.groupId);
	updateTag('user-orders');
	return result.status;
}

export async function updateShipmentStatus(input: {
	groupId: string;
	nextStatus: ShipmentStatus;
	skipIntermediate?: boolean;
	reasonCode?: string;
	message?: string;
	idempotencyKey: string;
}) {
	const user = await currentUser();
	if (!user) throw new Error('Unauthenticated.');
	if (user.privateMetadata.role !== 'ADMIN') {
		throw new Error('Admin logistics privileges are required.');
	}

	const idempotencyKey = requiredIdempotencyKey(input.idempotencyKey);
	const result = await db.$transaction(async (tx) => {
		const duplicate = await tx.fulfillmentTransition.findUnique({
			where: { idempotencyKey },
		});
		if (duplicate) {
			return {
				status: duplicate.nextStatus as ShipmentStatus,
				sourceEventId: null,
				notificationInput: null,
			};
		}

		const group = await tx.orderGroup.findUnique({
			where: { id: input.groupId },
			include: {
				shipmentAssignments: {
					include: { shipment: true },
					orderBy: { createdAt: 'asc' },
				},
				store: { select: { name: true, url: true } },
				items: true,
				order: {
					select: { paymentDetails: { select: { currency: true } } },
				},
			},
		});
		if (!group) throw new Error('Shipment not found.');
		const shipment = group.shipmentAssignments[0]?.shipment ?? null;
		if (!shipment) throw new Error('Shipment not found.');

		assertShipmentTransition({
			current: shipment.status,
			next: input.nextStatus,
			actorRole: FulfillmentActorRole.ADMIN,
			mode: group.fulfillmentMode,
			packageStatus: group.packageStatus,
			reasonCode: input.reasonCode,
			allowSkip: input.skipIntermediate === true,
		});

		const changed = await tx.shipment.updateMany({
			where: { id: shipment.id, status: shipment.status },
			data: {
				status: input.nextStatus,
				failureReasonCode:
					input.nextStatus === ShipmentStatus.DELIVERY_ATTEMPT_FAILED
						? input.reasonCode?.trim()
						: null,
				failureMessage:
					input.nextStatus === ShipmentStatus.DELIVERY_ATTEMPT_FAILED
						? input.message?.trim() || null
						: null,
			},
		});
		if (changed.count !== 1) {
			throw new Error('Shipment changed elsewhere. Refresh and try again.');
		}
		if (input.nextStatus === ShipmentStatus.DELIVERY_ATTEMPT_FAILED) {
			const previousAttempt = await tx.deliveryAttempt.findFirst({
				where: { shipmentId: shipment.id },
				orderBy: { attemptNumber: 'desc' },
				select: { attemptNumber: true },
			});
			await tx.deliveryAttempt.create({
				data: {
					shipmentId: shipment.id,
					attemptNumber: (previousAttempt?.attemptNumber ?? 0) + 1,
					outcome: 'FAILED',
					reasonCode: input.reasonCode?.trim() || null,
					message: input.message?.trim() || null,
				},
			});
		}

		await tx.fulfillmentTransition.create({
			data: {
				entityType: FulfillmentEntityType.SHIPMENT,
				previousStatus: shipment.status,
				nextStatus: input.nextStatus,
				actorRole: FulfillmentActorRole.ADMIN,
				source: FulfillmentSource.MANUAL,
				reasonCode: input.reasonCode?.trim() || null,
				message: input.message?.trim() || null,
				idempotencyKey,
				actorUserId: user.id,
				orderId: group.orderId,
				orderGroupId: group.id,
				shipmentId: shipment.id,
			},
		});

		const notificationInput: PublishDomainEventInput = {
			eventKey: `fulfillment:${idempotencyKey}`,
			eventType: DOMAIN_EVENT_TYPES.SHIPMENT_STATUS_CHANGED,
			aggregateType: 'SHIPMENT',
			aggregateId: shipment.id,
			actorUserId: user.id,
			orderId: group.orderId,
			storeId: group.storeId,
			payload: {
				orderId: group.orderId,
				orderGroupId: group.id,
				shipmentId: shipment.id,
				storeUrl: group.store.url,
				storeName: group.store.name,
				shippingService: group.shippingService,
				deliveryEstimate: `${group.shippingDeliveryMin}-${group.shippingDeliveryMax} days after dispatch`,
				previousStatus: SHIPMENT_STATUS_LABELS[shipment.status],
				nextStatus: SHIPMENT_STATUS_LABELS[input.nextStatus],
				failureReason:
					input.nextStatus === ShipmentStatus.DELIVERY_ATTEMPT_FAILED
						? input.message?.trim() || input.reasonCode?.trim() || ''
						: '',
				subTotal: group.subTotal,
				shippingFees: group.shippingFees,
				total: group.total,
				currency: group.order.paymentDetails?.currency?.toUpperCase() ?? 'USD',
				itemCount: group.items.reduce((count, item) => count + item.quantity, 0),
				items: group.items.map((item) => ({
					name: item.name,
					image: item.image,
					sku: item.sku,
					size: item.size,
					quantity: item.quantity,
					unitPrice: item.price,
					totalPrice: item.totalPrice,
					storeName: group.store.name,
				})),
			},
		};
		const domainEvent = await publishDomainEvent(tx, {
			...notificationInput,
			persistEventOnly: true,
		});

		await syncLegacyFulfillmentSummary(tx, {
			...group,
			shipment: { status: input.nextStatus },
		});
		return {
			status: input.nextStatus,
			sourceEventId: domainEvent.id,
			notificationInput,
		};
	}, FULFILLMENT_TRANSACTION_OPTIONS);

	if (result.notificationInput && result.sourceEventId) {
		await scheduleFulfillmentEventNotifications(
			result.notificationInput,
			result.sourceEventId,
		);
	}
	await refreshSettlementEligibilityForOrderGroup(input.groupId);
	updateTag('user-orders');
	return result.status;
}

export async function requestPackageCancellation(input: {
	groupId: string;
	reasonCode: CancellationReasonCode;
	message?: string;
}) {
	const user = await currentUser();
	if (!user) throw new Error('Unauthenticated.');

	const group = await db.orderGroup.findFirst({
		where: { id: input.groupId, order: { userId: user.id } },
		select: {
			id: true,
			orderId: true,
			packageStatus: true,
			cancellationRequests: {
				where: { status: CancellationRequestStatus.REQUESTED },
				select: { id: true },
				take: 1,
			},
		},
	});
	if (!group) throw new Error('Package not found.');
	if (!canRequestCancellation(group.packageStatus)) {
		throw new Error('This package can no longer be cancelled.');
	}
	if (group.cancellationRequests[0]) {
		return group.cancellationRequests[0];
	}

	const request = await db.cancellationRequest.create({
		data: {
			customerId: user.id,
			orderId: group.orderId,
			orderGroupId: group.id,
			reasonCode: input.reasonCode,
			message: input.message?.trim() || null,
		},
	});

	updateTag('user-orders');
	return request;
}

export async function decidePackageCancellation(input: {
	storeId: string;
	requestId: string;
	decision: 'APPROVE' | 'REJECT';
	decisionNote?: string;
	idempotencyKey: string;
}) {
	const user = await currentUser();
	if (!user) throw new Error('Unauthenticated.');
	if (user.privateMetadata.role !== 'SELLER') {
		throw new Error('Seller privileges are required.');
	}

	const idempotencyKey = requiredIdempotencyKey(input.idempotencyKey);
	const result = await db.$transaction(async (tx) => {
		const request = await tx.cancellationRequest.findFirst({
			where: {
				id: input.requestId,
				orderGroup: {
					storeId: input.storeId,
					store: { userId: user.id },
				},
			},
			include: {
				orderGroup: {
					include: {
						shipmentAssignments: {
							include: { shipment: true },
							orderBy: { createdAt: 'asc' },
						},
					},
				},
			},
		});
		if (!request) throw new Error('Cancellation request not found.');
		if (request.status !== CancellationRequestStatus.REQUESTED) return request;

		if (input.decision === 'REJECT') {
			return tx.cancellationRequest.update({
				where: { id: request.id },
				data: {
					status: CancellationRequestStatus.REJECTED,
					decisionNote: input.decisionNote?.trim() || null,
					decidedById: user.id,
					decidedAt: new Date(),
				},
			});
		}

		if (!canRequestCancellation(request.orderGroup.packageStatus)) {
			throw new Error('This package has passed the cancellable stage.');
		}

		await tx.orderGroup.update({
			where: { id: request.orderGroup.id },
			data: { packageStatus: PackageStatus.CANCELLED },
		});
		const shipment = request.orderGroup.shipmentAssignments[0]?.shipment ?? null;
		if (shipment) {
			await tx.shipment.update({
				where: { id: shipment.id },
				data: { status: ShipmentStatus.CANCELLED },
			});
		}
		await tx.fulfillmentTransition.create({
			data: {
				entityType: FulfillmentEntityType.PACKAGE,
				previousStatus: request.orderGroup.packageStatus,
				nextStatus: PackageStatus.CANCELLED,
				actorRole: FulfillmentActorRole.SELLER,
				source: FulfillmentSource.MANUAL,
				reasonCode: request.reasonCode,
				message: input.decisionNote?.trim() || request.message,
				idempotencyKey,
				actorUserId: user.id,
				orderId: request.orderId,
				orderGroupId: request.orderGroupId,
			},
		});
		if (shipment) {
			await tx.fulfillmentTransition.create({
				data: {
					entityType: FulfillmentEntityType.SHIPMENT,
					previousStatus: shipment.status,
					nextStatus: ShipmentStatus.CANCELLED,
					actorRole: FulfillmentActorRole.SELLER,
					source: FulfillmentSource.MANUAL,
					reasonCode: request.reasonCode,
					message: input.decisionNote?.trim() || request.message,
					idempotencyKey: `${idempotencyKey}:shipment`,
					actorUserId: user.id,
					orderId: request.orderId,
					orderGroupId: request.orderGroupId,
					shipmentId: shipment.id,
				},
			});
		}

		await syncLegacyFulfillmentSummary(tx, {
			...request.orderGroup,
			packageStatus: PackageStatus.CANCELLED,
			shipment: shipment
				? { status: ShipmentStatus.CANCELLED }
				: null,
		});

		return tx.cancellationRequest.update({
			where: { id: request.id },
			data: {
				status: CancellationRequestStatus.APPROVED,
				decisionNote: input.decisionNote?.trim() || null,
				decidedById: user.id,
				decidedAt: new Date(),
			},
		});
	}, FULFILLMENT_TRANSACTION_OPTIONS);

	updateTag('user-orders');
	return result;
}

export async function updateShipmentCarrierInfo(input: {
	shipmentId: string;
	carrier?: string;
	trackingNumber?: string;
	serviceLevel?: string;
	estimatedDeliveryAt?: string | Date | null;
	proofOfDeliveryUrl?: string | null;
	proofOfDeliveryAt?: string | Date | null;
	idempotencyKey?: string;
}) {
	const user = await currentUser();
	if (!user) throw new Error('Unauthenticated.');
	if (user.privateMetadata.role !== 'ADMIN') {
		throw new Error('Admin logistics privileges are required.');
	}

	const result = await db.$transaction(async (tx) => {
		const shipment = await tx.shipment.findUnique({
			where: { id: input.shipmentId },
			include: { packageAssignments: { orderBy: { createdAt: 'asc' }, take: 1, include: { orderGroup: { select: { id: true, orderId: true } } } } },
		});
		if (!shipment || !shipment.packageAssignments[0]) throw new Error('Shipment not found.');
		const updated = await tx.shipment.update({
			where: { id: input.shipmentId },
			data: {
			...(input.carrier !== undefined ? { carrier: input.carrier.trim() || null } : {}),
			...(input.trackingNumber !== undefined ? { trackingNumber: input.trackingNumber.trim() || null } : {}),
			...(input.serviceLevel !== undefined ? { serviceLevel: input.serviceLevel.trim() || null } : {}),
			...(input.estimatedDeliveryAt !== undefined
				? { estimatedDeliveryAt: input.estimatedDeliveryAt ? new Date(input.estimatedDeliveryAt) : null }
				: {}),
			...(input.proofOfDeliveryUrl !== undefined ? { proofOfDeliveryUrl: input.proofOfDeliveryUrl ? input.proofOfDeliveryUrl.trim() : null } : {}),
			...(input.proofOfDeliveryAt !== undefined ? { proofOfDeliveryAt: input.proofOfDeliveryAt ? new Date(input.proofOfDeliveryAt) : null } : {}),
			},
		});
		if (input.proofOfDeliveryUrl !== undefined || input.proofOfDeliveryAt !== undefined) {
			const idempotencyKey = input.idempotencyKey?.trim() || `proof:${input.shipmentId}:${input.proofOfDeliveryUrl || 'cleared'}`;
			const duplicate = await tx.fulfillmentTransition.findUnique({ where: { idempotencyKey } });
			if (!duplicate) {
				await tx.fulfillmentTransition.create({
					data: {
						entityType: FulfillmentEntityType.SHIPMENT,
						previousStatus: shipment.status,
						nextStatus: shipment.status,
						actorRole: FulfillmentActorRole.ADMIN,
						source: FulfillmentSource.MANUAL,
						message: input.proofOfDeliveryUrl ? 'Proof of delivery attached.' : 'Proof of delivery cleared.',
						idempotencyKey,
						actorUserId: user.id,
						orderId: shipment.packageAssignments[0].orderGroup.orderId,
						orderGroupId: shipment.packageAssignments[0].orderGroup.id,
						shipmentId: shipment.id,
					},
				});
			}
		}
		return { updated, orderGroupId: shipment.packageAssignments[0].orderGroup.id };
	}, FULFILLMENT_TRANSACTION_OPTIONS);

	await refreshSettlementEligibilityForOrderGroup(result.orderGroupId);
	updateTag('user-orders');
	return result.updated;
}

export async function getShipmentTracking(orderId: string) {
	const { userId } = await auth();
	if (!userId) throw new Error('Unauthenticated.');

	const shipments = await db.shipment.findMany({
		where: {
			packageAssignments: {
				some: {
					orderGroup: {
						orderId,
						OR: [
							{ order: { userId } },
							{ store: { userId } },
						],
					},
				},
			},
		},
		include: {
			packageAssignments: {
				include: {
					orderGroup: {
						select: {
							id: true,
							packageStatus: true,
							fulfillmentMode: true,
							store: { select: { id: true, name: true, url: true, logo: true } },
							items: {
								select: {
									id: true,
									name: true,
									sku: true,
									image: true,
									quantity: true,
									status: true,
								},
							},
						},
					},
				},
			},
			items: {
				include: {
					orderItem: { select: { id: true, name: true, sku: true, image: true } },
				},
			},
			trackingEvents: { orderBy: { occurredAt: 'desc' } },
			deliveryAttempts: { orderBy: { occurredAt: 'desc' } },
			fulfillmentEvents: { orderBy: { createdAt: 'asc' } },
		},
	});

	return shipments;
}

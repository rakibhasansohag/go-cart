'use server';

import { db } from '@/lib/db';
import {
	assertPackageTransition,
	assertShipmentTransition,
	canRequestCancellation,
	orderStatusForFulfillment,
	productStatusForFulfillment,
} from '@/lib/orders/fulfillment-state-machine';
import { deriveOrderStatus } from '@/lib/orders/status-sync';
import { currentUser } from '@clerk/nextjs/server';
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

function requiredIdempotencyKey(value: string): string {
	const key = value.trim();
	if (key.length < 8 || key.length > 200) {
		throw new Error('A valid idempotency key is required.');
	}
	return key;
}

async function syncLegacyFulfillmentSummary(
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
			return duplicate.nextStatus as PackageStatus;
		}

		const group = await tx.orderGroup.findFirst({
			where: { id: input.groupId, storeId: store.id },
			include: { shipment: true },
		});
		if (!group) throw new Error('Package not found.');

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

		await syncLegacyFulfillmentSummary(tx, {
			...group,
			packageStatus: input.nextStatus,
		});
		return input.nextStatus;
	});

	updateTag('user-orders');
	return result;
}

export async function updateShipmentStatus(input: {
	groupId: string;
	nextStatus: ShipmentStatus;
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
		if (duplicate) return duplicate.nextStatus as ShipmentStatus;

		const group = await tx.orderGroup.findUnique({
			where: { id: input.groupId },
			include: { shipment: true },
		});
		if (!group?.shipment) throw new Error('Shipment not found.');

		assertShipmentTransition({
			current: group.shipment.status,
			next: input.nextStatus,
			actorRole: FulfillmentActorRole.ADMIN,
			mode: group.fulfillmentMode,
			packageStatus: group.packageStatus,
			reasonCode: input.reasonCode,
		});

		const changed = await tx.shipment.updateMany({
			where: { id: group.shipment.id, status: group.shipment.status },
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

		await tx.fulfillmentTransition.create({
			data: {
				entityType: FulfillmentEntityType.SHIPMENT,
				previousStatus: group.shipment.status,
				nextStatus: input.nextStatus,
				actorRole: FulfillmentActorRole.ADMIN,
				source: FulfillmentSource.MANUAL,
				reasonCode: input.reasonCode?.trim() || null,
				message: input.message?.trim() || null,
				idempotencyKey,
				actorUserId: user.id,
				orderId: group.orderId,
				orderGroupId: group.id,
				shipmentId: group.shipment.id,
			},
		});

		await syncLegacyFulfillmentSummary(tx, {
			...group,
			shipment: { status: input.nextStatus },
		});
		return input.nextStatus;
	});

	updateTag('user-orders');
	return result;
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
				orderGroup: { include: { shipment: true } },
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
		if (request.orderGroup.shipment) {
			await tx.shipment.update({
				where: { id: request.orderGroup.shipment.id },
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
		if (request.orderGroup.shipment) {
			await tx.fulfillmentTransition.create({
				data: {
					entityType: FulfillmentEntityType.SHIPMENT,
					previousStatus: request.orderGroup.shipment.status,
					nextStatus: ShipmentStatus.CANCELLED,
					actorRole: FulfillmentActorRole.SELLER,
					source: FulfillmentSource.MANUAL,
					reasonCode: request.reasonCode,
					message: input.decisionNote?.trim() || request.message,
					idempotencyKey: `${idempotencyKey}:shipment`,
					actorUserId: user.id,
					orderId: request.orderId,
					orderGroupId: request.orderGroupId,
					shipmentId: request.orderGroup.shipment.id,
				},
			});
		}

		await syncLegacyFulfillmentSummary(tx, {
			...request.orderGroup,
			packageStatus: PackageStatus.CANCELLED,
			shipment: request.orderGroup.shipment
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
	});

	updateTag('user-orders');
	return result;
}

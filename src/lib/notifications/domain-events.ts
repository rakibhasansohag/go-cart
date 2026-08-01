import { NotificationCategory, Prisma, Role } from '@prisma/client';

type TransactionClient = Prisma.TransactionClient;

export const DOMAIN_EVENT_TYPES = {
	PAYMENT_SUCCEEDED: 'payment.succeeded',
	PAID_PACKAGE_READY: 'package.paid_ready',
	PACKAGE_STATUS_CHANGED: 'package.status_changed',
	SHIPMENT_STATUS_CHANGED: 'shipment.status_changed',
	RETURN_REQUESTED: 'return.requested',
} as const;

export type DomainEventType =
	(typeof DOMAIN_EVENT_TYPES)[keyof typeof DOMAIN_EVENT_TYPES];

export type PublishDomainEventInput = {
	eventKey: string;
	eventType: DomainEventType;
	aggregateType: 'ORDER' | 'ORDER_PACKAGE' | 'SHIPMENT' | 'RETURN_REQUEST';
	aggregateId: string;
	actorUserId?: string | null;
	orderId?: string;
	storeId?: string;
	payload: Prisma.InputJsonObject;
};

type Recipient = {
	id: string;
	email: string;
	role: Role;
};

function payloadText(payload: Prisma.InputJsonObject, key: string) {
	const value = payload[key];
	return typeof value === 'string' ? value : '';
}

async function resolveRecipients(
	tx: TransactionClient,
	input: PublishDomainEventInput,
): Promise<Recipient[]> {
	const recipientIds = new Set<string>();

	if (
		input.orderId &&
		(input.eventType === DOMAIN_EVENT_TYPES.PAYMENT_SUCCEEDED ||
			input.eventType === DOMAIN_EVENT_TYPES.PACKAGE_STATUS_CHANGED ||
			input.eventType === DOMAIN_EVENT_TYPES.SHIPMENT_STATUS_CHANGED)
	) {
		const order = await tx.order.findUnique({
			where: { id: input.orderId },
			select: { userId: true },
		});
		if (order) recipientIds.add(order.userId);
	}

	if (
		input.storeId &&
		(input.eventType === DOMAIN_EVENT_TYPES.PAID_PACKAGE_READY ||
			input.eventType === DOMAIN_EVENT_TYPES.SHIPMENT_STATUS_CHANGED ||
			input.eventType === DOMAIN_EVENT_TYPES.RETURN_REQUESTED)
	) {
		const store = await tx.store.findUnique({
			where: { id: input.storeId },
			select: { userId: true },
		});
		if (store) recipientIds.add(store.userId);
	}

	// A seller handoff transfers operational control to logistics. Notify every
	// platform admin so the warehouse/admin queue can continue the shipment.
	if (
		input.eventType === DOMAIN_EVENT_TYPES.PACKAGE_STATUS_CHANGED &&
		payloadText(input.payload, 'nextStatus') === 'Handed off'
	) {
		const admins = await tx.user.findMany({
			where: { role: Role.ADMIN },
			select: { id: true },
		});
		for (const admin of admins) recipientIds.add(admin.id);
	}

	if (recipientIds.size === 0) return [];

	return tx.user.findMany({
		where: { id: { in: [...recipientIds] } },
		select: { id: true, email: true, role: true },
	});
}

function notificationFor(input: PublishDomainEventInput, recipient: Recipient) {
	const orderId = input.orderId ?? payloadText(input.payload, 'orderId');
	const storeUrl = payloadText(input.payload, 'storeUrl');
	const nextStatus = payloadText(input.payload, 'nextStatus');

	switch (input.eventType) {
		case DOMAIN_EVENT_TYPES.PAYMENT_SUCCEEDED:
			return {
				category: NotificationCategory.PAYMENT,
				title: 'Payment confirmed',
				message: 'Your payment was successful and your order is confirmed.',
				actionUrl: orderId ? `/order/${orderId}` : null,
			};
		case DOMAIN_EVENT_TYPES.PAID_PACKAGE_READY:
			return {
				category: NotificationCategory.ORDER,
				title: 'New paid order',
				message: 'A paid package is ready for preparation.',
				actionUrl: storeUrl
					? `/dashboard/seller/stores/${storeUrl}/orders`
					: null,
			};
		case DOMAIN_EVENT_TYPES.PACKAGE_STATUS_CHANGED:
			if (recipient.role === Role.ADMIN) {
				return {
					category: NotificationCategory.FULFILLMENT,
					title: 'Package ready for logistics',
					message: 'A seller handed off a package for warehouse processing.',
					actionUrl: '/dashboard/admin/orders',
				};
			}
			return {
				category: NotificationCategory.FULFILLMENT,
				title: 'Package preparation updated',
				message: `Your package is now ${nextStatus || 'being prepared'}.`,
				actionUrl: orderId ? `/order/${orderId}` : null,
			};
		case DOMAIN_EVENT_TYPES.SHIPMENT_STATUS_CHANGED:
			return recipient.role === Role.SELLER
				? {
						category: NotificationCategory.DELIVERY,
						title: 'Shipment status updated',
						message: `A handed-off package is now ${nextStatus || 'in transit'}.`,
						actionUrl: storeUrl
							? `/dashboard/seller/stores/${storeUrl}/orders`
							: null,
					}
				: {
						category: NotificationCategory.DELIVERY,
						title: 'Delivery progress updated',
						message: `Your shipment is now ${nextStatus || 'in transit'}.`,
						actionUrl: orderId ? `/order/${orderId}` : null,
					};
		case DOMAIN_EVENT_TYPES.RETURN_REQUESTED:
			return {
				category: NotificationCategory.RETURN,
				title: 'New return request',
				message: 'A customer submitted a return request for your review.',
				actionUrl: storeUrl
					? `/dashboard/seller/stores/${storeUrl}/orders`
					: null,
			};
	}
}

export async function publishPaidOrderNotifications(
	tx: TransactionClient,
	input: { orderId: string; provider: string; providerPaymentId: string },
) {
	await publishDomainEvent(tx, {
		eventKey: `payment:succeeded:${input.provider}:${input.providerPaymentId}`,
		eventType: DOMAIN_EVENT_TYPES.PAYMENT_SUCCEEDED,
		aggregateType: 'ORDER',
		aggregateId: input.orderId,
		orderId: input.orderId,
		payload: {
			orderId: input.orderId,
			providerPaymentId: input.providerPaymentId,
			provider: input.provider,
		},
	});

	const packages = await tx.orderGroup.findMany({
		where: { orderId: input.orderId },
		select: {
			id: true,
			storeId: true,
			store: { select: { url: true } },
		},
	});

	for (const orderPackage of packages) {
		await publishDomainEvent(tx, {
			eventKey: `package:paid-ready:${input.provider}:${input.providerPaymentId}:${orderPackage.id}`,
			eventType: DOMAIN_EVENT_TYPES.PAID_PACKAGE_READY,
			aggregateType: 'ORDER_PACKAGE',
			aggregateId: orderPackage.id,
			orderId: input.orderId,
			storeId: orderPackage.storeId,
			payload: {
				orderId: input.orderId,
				orderGroupId: orderPackage.id,
				storeUrl: orderPackage.store.url,
				providerPaymentId: input.providerPaymentId,
				provider: input.provider,
			},
		});
	}
}

export async function publishDomainEvent(
	tx: TransactionClient,
	input: PublishDomainEventInput,
) {
	const event = await tx.domainEvent.upsert({
		where: { eventKey: input.eventKey },
		update: {},
		create: {
			eventKey: input.eventKey,
			eventType: input.eventType,
			aggregateType: input.aggregateType,
			aggregateId: input.aggregateId,
			actorUserId: input.actorUserId ?? null,
			payload: input.payload,
		},
	});

	const recipients = await resolveRecipients(tx, input);
	for (const recipient of recipients) {
		const content = notificationFor(input, recipient);
		await tx.notification.upsert({
			where: {
				sourceEventId_recipientId: {
					sourceEventId: event.id,
					recipientId: recipient.id,
				},
			},
			update: {},
			create: {
				sourceEventId: event.id,
				recipientId: recipient.id,
				eventType: input.eventType,
				...content,
			},
		});
		await tx.emailOutbox.upsert({
			where: {
				sourceEventId_recipientId: {
					sourceEventId: event.id,
					recipientId: recipient.id,
				},
			},
			update: {},
			create: {
				sourceEventId: event.id,
				recipientId: recipient.id,
				recipientEmail: recipient.email,
				templateKey: input.eventType,
				payload: {
					...input.payload,
					title: content.title,
					message: content.message,
					actionUrl: content.actionUrl,
				},
			},
		});
	}

	return event;
}

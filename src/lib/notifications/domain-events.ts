import { NotificationCategory, NotificationChannel, Prisma, Role } from '@prisma/client';
import { formatOrderId, formatPackageId } from '@/lib/orders/references';
import { demoFulfillmentAutomationEnabled, demoFulfillmentStepHours } from '@/lib/orders/demo-config';
import { validateDomainEventPayload } from './contracts';

type TransactionClient = Prisma.TransactionClient;

export const DOMAIN_EVENT_TYPES = {
	PAYMENT_SUCCEEDED: 'payment.succeeded',
	PAID_PACKAGE_READY: 'package.paid_ready',
	PACKAGE_STATUS_CHANGED: 'package.status_changed',
	SHIPMENT_STATUS_CHANGED: 'shipment.status_changed',
	RETURN_REQUESTED: 'return.requested',
	RETURN_STATUS_CHANGED: 'return.status_changed',
	CHECKOUT_ABANDONED: 'checkout.abandoned',
} as const;

export type DomainEventType =
	(typeof DOMAIN_EVENT_TYPES)[keyof typeof DOMAIN_EVENT_TYPES];

export type PublishDomainEventInput = {
	eventKey: string;
	eventType: DomainEventType;
	aggregateType:
		'ORDER' | 'ORDER_PACKAGE' | 'SHIPMENT' | 'RETURN_REQUEST' | 'CART';
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

function humanizeStatus(value: string) {
	return value
		.toLowerCase()
		.replaceAll('_', ' ')
		.replace(/\b\w/g, (character) => character.toUpperCase());
}

async function resolveRecipients(
	tx: TransactionClient,
	input: PublishDomainEventInput,
): Promise<Recipient[]> {
	const recipientIds = new Set<string>();
	const recipientEmailOverrides = new Map<string, string>();

	if (
		input.orderId &&
		(input.eventType === DOMAIN_EVENT_TYPES.PAYMENT_SUCCEEDED ||
			input.eventType === DOMAIN_EVENT_TYPES.PACKAGE_STATUS_CHANGED ||
			input.eventType === DOMAIN_EVENT_TYPES.SHIPMENT_STATUS_CHANGED ||
			input.eventType === DOMAIN_EVENT_TYPES.RETURN_STATUS_CHANGED)
	) {
		const order = await tx.order.findUnique({
			where: { id: input.orderId },
			select: { userId: true },
		});
		if (order) recipientIds.add(order.userId);
	}

	if (input.eventType === DOMAIN_EVENT_TYPES.CHECKOUT_ABANDONED) {
		const cart = await tx.cart.findUnique({
			where: { id: input.aggregateId },
			select: { userId: true },
		});
		if (cart) recipientIds.add(cart.userId);
	}

	if (
		input.storeId &&
		(input.eventType === DOMAIN_EVENT_TYPES.PAID_PACKAGE_READY ||
			input.eventType === DOMAIN_EVENT_TYPES.SHIPMENT_STATUS_CHANGED ||
			input.eventType === DOMAIN_EVENT_TYPES.RETURN_REQUESTED)
	) {
		const store = await tx.store.findUnique({
			where: { id: input.storeId },
			select: { userId: true, email: true },
		});
		if (store) {
			recipientIds.add(store.userId);
			// Seller operational mail belongs at the store contact address. This also
			// shields delivery from stale legacy User.email values while Clerk remains
			// the source of truth for authentication.
			recipientEmailOverrides.set(store.userId, store.email);
		}
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

	const users = await tx.user.findMany({
		where: { id: { in: [...recipientIds] } },
		select: { id: true, email: true, role: true },
	});
	return users.map((user) => ({
		...user,
		email: recipientEmailOverrides.get(user.id) ?? user.email,
	}));
}

function hasDeliverableEmail(value: string) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function notificationFor(input: PublishDomainEventInput, recipient: Recipient) {
	const orderId = input.orderId ?? payloadText(input.payload, 'orderId');
	const orderGroupId =
		payloadText(input.payload, 'orderGroupId') ||
		(input.aggregateType === 'ORDER_PACKAGE' ? input.aggregateId : '');
	const storeUrl = payloadText(input.payload, 'storeUrl');
	const nextStatus = payloadText(input.payload, 'nextStatus');
	const orderReference = orderId ? formatOrderId(orderId) : '';
	const packageReference = orderGroupId ? formatPackageId(orderGroupId) : '';

	switch (input.eventType) {
		case DOMAIN_EVENT_TYPES.PAYMENT_SUCCEEDED:
			return {
				category: NotificationCategory.PAYMENT,
				title: 'Payment confirmed',
				message:
					'Your payment was successful and your order is confirmed.',
				actionUrl: orderId ? `/order/${orderId}` : null,
			};
		case DOMAIN_EVENT_TYPES.PAID_PACKAGE_READY:
			return {
				category: NotificationCategory.ORDER,
				title: 'New paid order',
				message: `${packageReference || 'A package'}${orderReference ? ` in ${orderReference}` : ''} is paid and ready for preparation.`,
				actionUrl: storeUrl
					? `/dashboard/seller/stores/${storeUrl}/orders`
					: null,
			};
		case DOMAIN_EVENT_TYPES.PACKAGE_STATUS_CHANGED:
			if (recipient.role === Role.ADMIN) {
				return {
					category: NotificationCategory.FULFILLMENT,
					title: 'Package ready for logistics',
					message: `${packageReference || 'A package'}${orderReference ? ` in ${orderReference}` : ''} was handed off for warehouse processing.`,
					actionUrl: '/dashboard/admin/orders',
				};
			}
			return {
				category: NotificationCategory.FULFILLMENT,
				title: 'Package preparation updated',
				message: `${packageReference || 'Your package'} is now ${nextStatus || 'being prepared'}.`,
				actionUrl: orderId ? `/order/${orderId}` : null,
			};
		case DOMAIN_EVENT_TYPES.SHIPMENT_STATUS_CHANGED:
			return recipient.role === Role.SELLER
				? {
						category: NotificationCategory.DELIVERY,
						title: 'Shipment status updated',
						message: `${packageReference || 'A handed-off package'} is now ${nextStatus || 'in transit'}.`,
						actionUrl: storeUrl
							? `/dashboard/seller/stores/${storeUrl}/orders`
							: null,
					}
				: {
						category: NotificationCategory.DELIVERY,
						title: 'Delivery progress updated',
						message: `${packageReference || 'Your package'} is now ${nextStatus || 'in transit'}.`,
						actionUrl: orderId ? `/order/${orderId}` : null,
					};
		case DOMAIN_EVENT_TYPES.RETURN_REQUESTED:
			return {
				category: NotificationCategory.RETURN,
					title: 'New return request',
				message: `A customer submitted a return request for ${packageReference || 'a package'}${orderReference ? ` in ${orderReference}` : ''}.`,
				actionUrl: storeUrl
						? `/dashboard/seller/stores/${storeUrl}/returns`
						: null,
			};
		case DOMAIN_EVENT_TYPES.RETURN_STATUS_CHANGED:
			{
				const statusLabel = humanizeStatus(nextStatus || 'updated');
				return {
					category: NotificationCategory.RETURN,
					title: `Return request ${statusLabel}`,
					message: `${packageReference || 'Your return request'} is now ${statusLabel}.`,
					actionUrl: payloadText(input.payload, 'returnRequestId')
						? `/profile/returns/${payloadText(input.payload, 'returnRequestId')}`
						: null,
				};
			}
		case DOMAIN_EVENT_TYPES.CHECKOUT_ABANDONED:
			return {
				category: NotificationCategory.ORDER,
				title: 'Your cart is waiting',
				message: 'You still have saved items ready for checkout.',
				actionUrl: '/cart',
			};
	}
}

export async function publishPaidOrderNotifications(
	tx: TransactionClient,
	input: {
		orderId: string;
		provider: string;
		providerPaymentId: string;
		amount: number;
		currency: string;
		paidAt: Date;
	},
) {
	const paidOrder = await tx.order.findUnique({
		where: { id: input.orderId },
		select: {
			id: true,
			subTotal: true,
			shippingFees: true,
			total: true,
			groups: {
				select: {
					id: true,
					storeId: true,
					subTotal: true,
					shippingFees: true,
					total: true,
					coupon: { select: { code: true } },
					store: { select: { name: true, url: true } },
					items: {
						select: {
							name: true,
							image: true,
							sku: true,
							size: true,
							quantity: true,
							price: true,
							totalPrice: true,
						},
					},
				},
			},
		},
	});
	if (!paidOrder) throw new Error('Paid order could not be found.');
	const sourceEventIds: string[] = [];
	const originalSubtotal = paidOrder.groups.reduce(
		(total, orderPackage) => total + orderPackage.subTotal,
		0,
	);
	const shippingFees = paidOrder.groups.reduce(
		(total, orderPackage) => total + orderPackage.shippingFees,
		0,
	);
	const discountAmount = Math.max(
		0,
		originalSubtotal + shippingFees - input.amount,
	);
	const couponCode = [
		...new Set(
			paidOrder.groups
				.map((orderPackage) => orderPackage.coupon?.code)
				.filter((code): code is string => Boolean(code)),
		),
	].join(', ');

	const paymentEvent = await publishDomainEvent(tx, {
		eventKey: `payment:succeeded:${input.provider}:${input.providerPaymentId}`,
		eventType: DOMAIN_EVENT_TYPES.PAYMENT_SUCCEEDED,
		aggregateType: 'ORDER',
		aggregateId: input.orderId,
		orderId: input.orderId,
		payload: {
			orderId: input.orderId,
			providerPaymentId: input.providerPaymentId,
			provider: input.provider,
			paymentMethod: input.provider,
			paymentReference: input.providerPaymentId,
			paidAt: input.paidAt.toISOString(),
			subTotal: originalSubtotal,
			shippingFees,
			discountAmount,
			couponCode,
			total: input.amount,
			currency: input.currency,
			itemCount: paidOrder.groups.reduce(
				(total, orderPackage) =>
					total +
					orderPackage.items.reduce(
						(count, item) => count + item.quantity,
						0,
					),
				0,
			),
			items: paidOrder.groups.flatMap((orderPackage) =>
				orderPackage.items.map((item) => ({
					name: item.name,
					image: item.image,
					sku: item.sku,
					size: item.size,
					quantity: item.quantity,
					unitPrice: item.price,
					totalPrice: item.totalPrice,
					storeName: orderPackage.store.name,
				})),
			),
		},
	});
	sourceEventIds.push(paymentEvent.id);

	for (const orderPackage of paidOrder.groups) {
		if (demoFulfillmentAutomationEnabled()) {
			await tx.orderGroup.update({
				where: { id: orderPackage.id },
				data: {
					automationMode: 'DEMO',
					nextTransitionAt: new Date(Date.now() + demoFulfillmentStepHours() * 60 * 60 * 1000),
				},
			});
		}
		const packageEvent = await publishDomainEvent(tx, {
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
				storeName: orderPackage.store.name,
				providerPaymentId: input.providerPaymentId,
				provider: input.provider,
				subTotal: orderPackage.subTotal,
				shippingFees: orderPackage.shippingFees,
				total: orderPackage.total,
				discountAmount: Math.max(
					0,
					orderPackage.subTotal +
						orderPackage.shippingFees -
						orderPackage.total,
				),
				couponCode: orderPackage.coupon?.code ?? '',
				currency: input.currency,
				itemCount: orderPackage.items.reduce(
					(count, item) => count + item.quantity,
					0,
				),
				items: orderPackage.items.map((item) => ({
					name: item.name,
					image: item.image,
					sku: item.sku,
					size: item.size,
					quantity: item.quantity,
					unitPrice: item.price,
					totalPrice: item.totalPrice,
					storeName: orderPackage.store.name,
				})),
				nextStatus: 'Awaiting acceptance',
			},
		});
		sourceEventIds.push(packageEvent.id);
	}

	return sourceEventIds;
}

export async function publishDomainEvent(
	tx: TransactionClient,
	input: PublishDomainEventInput,
) {
	validateDomainEventPayload(input.eventType, input.payload);
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
	const preferenceRows = await tx.notificationPreference.findMany({
		where: { userId: { in: recipients.map((recipient) => recipient.id) } },
		select: { userId: true, category: true, channel: true, enabled: true },
	});
	const preferences = new Map(
		preferenceRows.map((row) => [`${row.userId}:${row.category}:${row.channel}`, row.enabled]),
	);
	for (const recipient of recipients) {
		const content = notificationFor(input, recipient);
		const inAppEnabled = preferences.get(`${recipient.id}:${content.category}:${NotificationChannel.IN_APP}`) ?? true;
		const emailEnabled = preferences.get(`${recipient.id}:${content.category}:${NotificationChannel.EMAIL}`) ?? true;
		if (inAppEnabled) await tx.notification.upsert({
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
		if (!emailEnabled || !hasDeliverableEmail(recipient.email)) continue;
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

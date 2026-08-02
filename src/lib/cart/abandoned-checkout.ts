import 'server-only';

import { db } from '@/lib/db';
import {
	DOMAIN_EVENT_TYPES,
	publishDomainEvent,
} from '@/lib/notifications/domain-events';

const DEFAULT_DELAY_HOURS = 24;
const DEFAULT_BATCH_SIZE = 25;

function positiveInteger(value: string | undefined, fallback: number) {
	const parsed = Number.parseInt(value ?? '', 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function abandonedCheckoutEnabled() {
	return process.env.ABANDONED_CHECKOUT_EMAIL_ENABLED === 'true';
}

export function abandonedCheckoutDelayHours() {
	return positiveInteger(
		process.env.ABANDONED_CHECKOUT_AFTER_HOURS,
		DEFAULT_DELAY_HOURS,
	);
}

export function abandonedCheckoutBatchSize() {
	return Math.min(
		100,
		positiveInteger(
			process.env.ABANDONED_CHECKOUT_BATCH_SIZE,
			DEFAULT_BATCH_SIZE,
		),
	);
}

export function abandonedCheckoutEventKey(cartId: string, updatedAt: Date) {
	return `checkout:abandoned:${cartId}:${updatedAt.toISOString()}`;
}

export async function enqueueAbandonedCheckoutReminders(now = new Date()) {
	if (!abandonedCheckoutEnabled()) {
		return { disabled: true, scanned: 0, sourceEventIds: [] as string[] };
	}

	const cutoff = new Date(
		now.getTime() - abandonedCheckoutDelayHours() * 60 * 60 * 1000,
	);
	const carts = await db.cart.findMany({
		where: {
			updatedAt: { lte: cutoff },
			cartItems: { some: {} },
		},
		select: {
			id: true,
			updatedAt: true,
			subTotal: true,
			shippingFees: true,
			total: true,
			coupon: { select: { code: true } },
			cartItems: {
				select: {
					name: true,
					image: true,
					sku: true,
					size: true,
					quantity: true,
					price: true,
					totalPrice: true,
					store: { select: { name: true } },
				},
			},
		},
		orderBy: { updatedAt: 'asc' },
		take: abandonedCheckoutBatchSize(),
	});

	const sourceEventIds: string[] = [];
	for (const cart of carts) {
		const event = await db.$transaction((tx) =>
			publishDomainEvent(tx, {
				eventKey: abandonedCheckoutEventKey(cart.id, cart.updatedAt),
				eventType: DOMAIN_EVENT_TYPES.CHECKOUT_ABANDONED,
				aggregateType: 'CART',
				aggregateId: cart.id,
				payload: {
					cartId: cart.id,
					nextStatus: 'Saved cart',
					subTotal: cart.subTotal,
					shippingFees: cart.shippingFees,
					discountAmount: Math.max(
						0,
						cart.subTotal + cart.shippingFees - cart.total,
					),
					couponCode: cart.coupon?.code ?? '',
					total: cart.total,
					currency: 'USD',
					itemCount: cart.cartItems.reduce(
						(count, item) => count + item.quantity,
						0,
					),
					items: cart.cartItems.map((item) => ({
						name: item.name,
						image: item.image,
						sku: item.sku,
						size: item.size,
						quantity: item.quantity,
						unitPrice: item.price,
						totalPrice: item.totalPrice,
						storeName: item.store.name,
					})),
					actionUrl: '/cart',
				},
			}),
		);
		sourceEventIds.push(event.id);
	}

	return { disabled: false, scanned: carts.length, sourceEventIds };
}

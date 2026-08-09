import { PrismaClient, Role } from '@prisma/client';
import { assertSafeE2ERuntime } from '../src/lib/runtime-safety';
import { deriveOrderStatus } from '../src/lib/orders/status-sync';
import { redeemCoins } from '../src/lib/loyalty/coins';
import { randomUUID } from 'node:crypto';

assertSafeE2ERuntime();

const db = new PrismaClient();
const epsilon = 0.01;

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(`[integration] ${message}`);
}

function closeEnough(actual: number, expected: number): boolean {
	return Math.abs(actual - expected) <= epsilon;
}

async function main() {
	const users = await db.user.findMany({
		where: { email: { in: ['rakibdev133@gmail.com', 'drdevil133@gmail.com', 'rakibhasansohag133@gmail.com'] } },
		select: { email: true, role: true },
	});
	const roles = new Map(users.map((user) => [user.email, user.role]));
	assert(roles.get('rakibdev133@gmail.com') === Role.USER, 'demo customer role is incorrect');
	assert(roles.get('drdevil133@gmail.com') === Role.SELLER, 'demo seller role is incorrect');
	assert(roles.get('rakibhasansohag133@gmail.com') === Role.ADMIN, 'demo admin role is incorrect');

	const orderCount = await db.order.count();
	assert(orderCount >= 1000, `expected at least 1000 demo orders, found ${orderCount}`);

	const orders = await db.order.findMany({
		take: 25,
		orderBy: { createdAt: 'asc' },
		select: {
			total: true,
			orderStatus: true,
			groups: {
				select: {
					status: true,
					total: true,
					subTotal: true,
					shippingFees: true,
					items: { select: { price: true, quantity: true, shippingFee: true, totalPrice: true } },
				},
			},
		},
	});
	for (const order of orders) {
		const groupTotal = order.groups.reduce((sum, group) => sum + group.total, 0);
		assert(closeEnough(order.total, groupTotal), 'order total does not equal group totals');
		assert(deriveOrderStatus(order.groups.map((group) => group.status)) === order.orderStatus, 'order status does not match group statuses');
		for (const group of order.groups) {
			assert(closeEnough(group.total, group.subTotal + group.shippingFees), 'group total invariant failed');
			for (const item of group.items) {
				assert(item.quantity > 0, 'order item quantity must be positive');
				assert(closeEnough(item.totalPrice, item.price * item.quantity + item.shippingFee), 'order item total invariant failed');
			}
		}
	}

	const invalidSizes = await db.size.count({ where: { quantity: { lt: 0 } } });
	assert(invalidSizes === 0, `found ${invalidSizes} inventory sizes with negative quantity`);

	const paidOrders = await db.order.findMany({
		where: { paymentStatus: 'Paid' },
		take: 25,
		select: { total: true, paymentMethod: true, paymentDetails: { select: { amount: true, currency: true } } },
	});
	for (const order of paidOrders) {
		assert(order.paymentMethod !== null, 'paid order is missing a payment method');
		assert(order.paymentDetails !== null, 'paid order is missing payment details');
		assert(closeEnough(order.paymentDetails.amount, order.total), 'paid amount does not match order total');
		assert(Boolean(order.paymentDetails.currency), 'payment currency is missing');
	}
	const duplicateEventKeys = await db.paymentEvent.groupBy({
		by: ['providerEventId'],
		_count: { providerEventId: true },
		having: { providerEventId: { _count: { gt: 1 } } },
	});
	assert(duplicateEventKeys.length === 0, 'duplicate payment webhook event IDs detected');

	const limitedCoupons = await db.coupon.findMany({
		where: { maxUses: { gt: 0 } },
		select: {
			code: true,
			maxUses: true,
			maxUsesPerUser: true,
			orders: {
				where: { order: { paymentStatus: 'Paid' } },
				select: { order: { select: { userId: true } } },
			},
		},
	});
	for (const coupon of limitedCoupons) {
		assert(coupon.orders.length <= coupon.maxUses, `coupon ${coupon.code} exceeded maxUses`);
		const usesByUser = new Map<string, number>();
		for (const redemption of coupon.orders) {
			const count = (usesByUser.get(redemption.order.userId) ?? 0) + 1;
			assert(count <= coupon.maxUsesPerUser, `coupon ${coupon.code} exceeded maxUsesPerUser`);
			usesByUser.set(redemption.order.userId, count);
		}
	}

	const returnItems = await db.returnItem.findMany({
		select: {
			quantity: true,
			receivedQuantity: true,
			restockedQuantity: true,
			requestedAmount: true,
			approvedAmount: true,
		},
	});
	for (const item of returnItems) {
		assert(item.quantity > 0, 'return quantity must be positive');
		assert(item.receivedQuantity >= 0 && item.restockedQuantity >= 0, 'return quantities cannot be negative');
		assert(item.restockedQuantity <= item.receivedQuantity, 'restocked quantity exceeds received quantity');
		assert(item.requestedAmount >= 0 && (item.approvedAmount ?? 0) >= 0, 'return amounts cannot be negative');
	}
	const refunds = await db.refundTransaction.findMany({
		select: { amount: true, status: true, processedAt: true, idempotencyKey: true },
	});
	assert(new Set(refunds.map((refund) => refund.idempotencyKey)).size === refunds.length, 'duplicate refund idempotency keys detected');
	for (const refund of refunds) {
		assert(refund.amount > 0, 'refund amount must be positive');
		if (refund.status === 'SUCCEEDED') assert(refund.processedAt !== null, 'successful refund is missing processedAt');
	}

	const shipments = await db.shipment.findMany({
		select: { items: { select: { quantity: true, orderItemId: true, orderItem: { select: { quantity: true } } } } },
	});
	const shippedByItem = new Map<string, number>();
	for (const shipment of shipments) {
		for (const item of shipment.items) {
			assert(item.quantity > 0, 'shipment item quantity must be positive');
			const shipped = (shippedByItem.get(item.orderItemId) ?? 0) + item.quantity;
			assert(shipped <= item.orderItem.quantity, 'shipment quantity exceeds ordered quantity');
			shippedByItem.set(item.orderItemId, shipped);
		}
	}
	const trackingEvents = await db.trackingEvent.findMany({ select: { providerEventId: true } });
	const eventKeys = trackingEvents.map((event) => event.providerEventId).filter(Boolean);
	assert(new Set(eventKeys).size === eventKeys.length, 'duplicate carrier event IDs detected');
	const deliveryAttempts = await db.deliveryAttempt.findMany({ select: { shipmentId: true, attemptNumber: true } });
	assert(deliveryAttempts.every((attempt) => attempt.attemptNumber > 0), 'delivery attempt number must be positive');

	const loyaltyAccounts = await db.loyaltyAccount.findMany({ select: { balance: true, lifetimeEarned: true } });
	for (const account of loyaltyAccounts) {
		assert(account.balance >= 0, 'GoCoins balance cannot be negative');
		assert(account.lifetimeEarned >= account.balance, 'GoCoins lifetime earned cannot be below balance');
	}
	const loyaltyTransactions = await db.loyaltyTransaction.findMany({ select: { idempotencyKey: true, points: true } });
	assert(new Set(loyaltyTransactions.map((transaction) => transaction.idempotencyKey)).size === loyaltyTransactions.length, 'duplicate GoCoins idempotency keys detected');
	assert(loyaltyTransactions.every((transaction) => transaction.points > 0), 'GoCoins transaction points must be positive');

	const domainEvents = await db.domainEvent.findMany({ select: { eventKey: true } });
	assert(new Set(domainEvents.map((event) => event.eventKey)).size === domainEvents.length, 'duplicate domain event keys detected');
	const notifications = await db.notification.findMany({ select: { sourceEventId: true, recipientId: true } });
	assert(new Set(notifications.map((notification) => `${notification.sourceEventId}:${notification.recipientId}`)).size === notifications.length, 'duplicate notifications detected');

	const raceEmail = `integration-race-${randomUUID()}@example.test`;
	const raceUser = await db.user.create({ data: { name: 'Integration Race User', email: raceEmail, picture: '', role: Role.USER } });
	try {
		await db.loyaltyAccount.create({ data: { userId: raceUser.id, balance: 100, lifetimeEarned: 100 } });
		const raceOrders = await db.order.findMany({ take: 2, select: { id: true } });
		const raceResults = await Promise.all(raceOrders.map((order, index) =>
			db.$transaction((tx) => redeemCoins(tx, {
				userId: raceUser.id,
				orderId: order.id,
				coins: 100,
				idempotencyKey: `integration-race:${raceUser.id}:${index}`,
			})).then(() => true).catch(() => false),
		));
		assert(raceResults.filter(Boolean).length === 1, 'concurrent GoCoins redemption was not serialized');
		const raceAccount = await db.loyaltyAccount.findUniqueOrThrow({ where: { userId: raceUser.id } });
		assert(raceAccount.balance === 0, 'concurrent GoCoins redemption left an incorrect balance');
	} finally {
		await db.user.delete({ where: { id: raceUser.id } });
	}

	console.log(`Integration checks passed: ${orderCount} orders, permissions, totals, coupons, transitions, inventory, payments, returns, shipments, GoCoins, and notifications.`);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
}).finally(() => db.$disconnect());

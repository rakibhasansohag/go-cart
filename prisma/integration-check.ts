import { PrismaClient, Role } from '@prisma/client';
import { assertSafeE2ERuntime } from '../src/lib/runtime-safety';
import { deriveOrderStatus } from '../src/lib/orders/status-sync';

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

	console.log(`Integration checks passed: ${orderCount} orders, permissions, totals, coupons, transitions, inventory, and payment invariants.`);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
}).finally(() => db.$disconnect());

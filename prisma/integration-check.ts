import { PrismaClient, Role } from '@prisma/client';
import { assertSafeE2ERuntime } from '../src/lib/runtime-safety';

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
			groups: {
				select: {
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

	console.log(`Integration checks passed: ${orderCount} orders, role permissions, totals, and inventory invariants.`);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
}).finally(() => db.$disconnect());

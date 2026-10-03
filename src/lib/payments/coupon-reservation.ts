import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { assertCouponUsageAvailable } from '@/lib/security/coupon-eligibility';
import { requirePositiveQuantity } from '@/lib/security/action-input';

export async function lockOwnedOrder(tx: Prisma.TransactionClient, orderId: string, userId: string) {
	await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} AND "userId" = ${userId} FOR UPDATE`;
}

export async function hasPaymentReservation(tx: Prisma.TransactionClient, orderId: string) {
	const rows = await tx.$queryRaw<{ orderId: string }[]>`SELECT "orderId" FROM "OrderPaymentReservation" WHERE "orderId" = ${orderId}`;
	return rows.length > 0;
}

/** Reserve before exposing a provider payment. Unknown provider outcomes must keep the slot. */
export async function reserveOwnedOrderPayment(orderId: string, userId: string) {
	return db.$transaction(async (tx) => {
		await lockOwnedOrder(tx, orderId, userId);
		const order = await tx.order.findFirst({
			where: { id: orderId, userId },
			include: { paymentDetails: true, groups: { include: { items: true, coupon: true } } },
		});
		if (!order) throw new Error('Order not found or you do not have access to it.');
		if (!['Pending', 'Failed', 'Declined', 'Cancelled'].includes(order.paymentStatus)) {
			throw new Error(order.paymentStatus === 'Paid' ? 'This order is already paid.' : 'This order is not currently eligible for payment.');
		}
		if (!Number.isFinite(order.total) || order.total <= 0) throw new Error('This order has an invalid payable total.');
		if (order.groups.some(group => group.packageStatus === 'CANCELLED' || group.status === 'Cancelled')) {
			throw new Error('This order contains a cancelled package. Create a new checkout for the remaining items.');
		}
		for (const group of order.groups) {
			for (const item of group.items) requirePositiveQuantity(item.quantity);
		}
		if (await hasPaymentReservation(tx, orderId)) return order;
		const couponIds = [...new Set(order.groups.flatMap(group => group.coupon ? [group.coupon.id] : []))].sort();
		// Stable lock ordering serializes competing checkouts without cross-coupon deadlocks.
		for (const couponId of couponIds) {
			await tx.$queryRaw`SELECT id FROM "Coupon" WHERE id = ${couponId} FOR UPDATE`;
			const coupon = await tx.coupon.findUniqueOrThrow({ where: { id: couponId } });
			await assertCouponUsageAvailable(coupon, userId, tx, orderId);
		}
		await tx.$executeRaw`INSERT INTO "OrderPaymentReservation" ("orderId", "couponIds") VALUES (${orderId}, ${couponIds}::text[])`;
		return order;
	}, { isolationLevel: 'ReadCommitted' });
}

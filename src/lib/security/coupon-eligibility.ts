import { db } from '@/lib/db';
import type { Coupon, Prisma } from '@prisma/client';

/** Paid redemptions are the existing business definition of coupon usage. */
export async function assertCouponUsageAvailable(
	coupon: Pick<Coupon, 'id' | 'maxUses' | 'maxUsesPerUser'>,
	userId: string,
	client: Pick<Prisma.TransactionClient, 'orderGroup'> = db,
) {
	const [totalUses, userUses] = await Promise.all([
		coupon.maxUses > 0 ? client.orderGroup.count({
			where: { couponId: coupon.id, order: { paymentStatus: 'Paid' } },
		}) : 0,
		coupon.maxUsesPerUser > 0 ? client.orderGroup.count({
			where: { couponId: coupon.id, order: { userId, paymentStatus: 'Paid' } },
		}) : 0,
	]);
	if (coupon.maxUses > 0 && totalUses >= coupon.maxUses) {
		throw new Error('This coupon has reached its total usage limit.');
	}
	if (coupon.maxUsesPerUser > 0 && userUses >= coupon.maxUsesPerUser) {
		throw new Error("You have reached this coupon's per-customer limit.");
	}
}

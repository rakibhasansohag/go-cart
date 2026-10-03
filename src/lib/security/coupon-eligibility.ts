import { db } from '@/lib/db';
import type { Coupon, Prisma } from '@prisma/client';

/** One use per checkout. Holds survive refunds: another provider attempt may still be payable. */
export async function assertCouponUsageAvailable(
 coupon: Pick<Coupon, 'id' | 'maxUses' | 'maxUsesPerUser'>,
 userId: string,
 client: Pick<Prisma.TransactionClient, '$queryRaw'> = db,
 excludeOrderId = '',
) {
 const [usage] = await client.$queryRaw<{ totalUses: number; userUses: number }[]>`
  SELECT COUNT(*)::int AS "totalUses",
   COUNT(*) FILTER (WHERE o."userId" = ${userId})::int AS "userUses"
  FROM "Order" o
  WHERE o.id <> ${excludeOrderId}
  AND (
   EXISTS (SELECT 1 FROM "OrderPaymentReservation" r
    WHERE r."orderId" = o.id AND ${coupon.id} = ANY(r."couponIds"))
   OR (EXISTS (SELECT 1 FROM "OrderGroup" g WHERE g."orderId" = o.id AND g."couponId" = ${coupon.id})
    AND (o."paymentStatus" IN ('Paid', 'PartiallyRefunded')
     OR EXISTS (SELECT 1 FROM "PaymentDetails" p WHERE p."orderId" = o.id)))
  )`;
 if (coupon.maxUses > 0 && usage.totalUses >= coupon.maxUses) {
  throw new Error('This coupon has reached its total usage limit.');
 }
 if (coupon.maxUsesPerUser > 0 && usage.userUses >= coupon.maxUsesPerUser) {
  throw new Error("You have reached this coupon's per-customer limit.");
 }
 return usage;
}

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { db } from '../src/lib/db';
import { assertSafeE2ERuntime } from '../src/lib/runtime-safety';
import { reserveOwnedOrderPayment } from '../src/lib/payments/coupon-reservation';
import { assertCouponUsageAvailable } from '../src/lib/security/coupon-eligibility';

assertSafeE2ERuntime();
const target = new URL(process.env.DATABASE_URL ?? '');
assert(['localhost', '127.0.0.1'].includes(target.hostname) && target.pathname === '/gocart_e2e');
const orderIds: string[] = [];
const couponIds: string[] = [];
try {
  const addresses = await db.shippingAddress.findMany({ distinct: ['userId'], take: 2 });
  assert.equal(addresses.length, 2, 'Seed two customers before running this check.');
  const stores = await db.store.findMany({ take: 2 });
  assert.equal(stores.length, 2);
  async function coupon(maxUses: number, maxUsesPerUser = 0) {
    const row = await db.coupon.create({ data: { code: `RACE-${randomUUID()}`, discount: 10, startDate: '2020-01-01', endDate: '2099-01-01', maxUses, maxUsesPerUser } });
    couponIds.push(row.id);
    return row;
  }
  async function order(couponId: string, customer = 0, groups = 1) {
    const address = addresses[customer];
    const row = await db.order.create({ data: {
      userId: address.userId, shippingAddressId: address.id, shippingFees: 0, subTotal: 100, total: 90,
      groups: { create: stores.slice(0, groups).map(store => ({ storeId: store.id, couponId, shippingService: 'Test', shippingDeliveryMin: 1, shippingDeliveryMax: 2, shippingFees: 0, subTotal: 100 / groups, total: 90 / groups })) },
    } });
    orderIds.push(row.id);
    return row;
  }
  const global = await coupon(1);
  const a = await order(global.id, 0, 2);
  const b = await order(global.id, 1);
  // Reproduce the original read-then-pay boundary: both checks admit the last use.
  await Promise.all([assertCouponUsageAvailable(global, a.userId), assertCouponUsageAvailable(global, b.userId)]);
  const race = await Promise.allSettled([reserveOwnedOrderPayment(a.id, a.userId), reserveOwnedOrderPayment(b.id, b.userId)]);
  assert.equal(race.filter(result => result.status === 'fulfilled').length, 1);
  const winner = race[0].status === 'fulfilled' ? a : b;
  const loser = winner.id === a.id ? b : a;
  await Promise.all(Array.from({ length: 4 }, () => reserveOwnedOrderPayment(winner.id, winner.userId)));
  await assert.rejects(reserveOwnedOrderPayment(loser.id, loser.userId), /total usage/);
  const holds = await db.$queryRaw<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM "OrderPaymentReservation" WHERE "orderId" = ${winner.id}`;
  assert.equal(holds[0].count, 1);
  for (const paymentStatus of ['Failed', 'Cancelled', 'Declined'] as const) {
    await db.order.update({ where: { id: winner.id }, data: { paymentStatus } });
    await reserveOwnedOrderPayment(winner.id, winner.userId);
    await assert.rejects(reserveOwnedOrderPayment(loser.id, loser.userId), /total usage/);
  }
  await db.order.update({ where: { id: winner.id }, data: { paymentStatus: 'PartiallyRefunded' } });
  await assert.rejects(reserveOwnedOrderPayment(loser.id, loser.userId), /total usage/);
  await db.order.update({ where: { id: winner.id }, data: { paymentStatus: 'Refunded' } });
  await assert.rejects(reserveOwnedOrderPayment(loser.id, loser.userId), /total usage/);

  const multi = await coupon(2);
  const multiOrder = await order(multi.id, 0, 2);
  await reserveOwnedOrderPayment(multiOrder.id, multiOrder.userId);
  await db.order.update({ where: { id: multiOrder.id }, data: { paymentStatus: 'Paid' } });
  // Legacy paid checkout has no reservation: still count its two groups once.
  await db.$executeRaw`DELETE FROM "OrderPaymentReservation" WHERE "orderId" = ${multiOrder.id}`;
  const second = await order(multi.id, 1);
  await reserveOwnedOrderPayment(second.id, second.userId);
  const third = await order(multi.id, 1);
  await assert.rejects(reserveOwnedOrderPayment(third.id, third.userId), /total usage/);

  const personal = await coupon(0, 1);
  const sameUser = await Promise.all([order(personal.id), order(personal.id)]);
  const perUserRace = await Promise.allSettled(sameUser.map(row => reserveOwnedOrderPayment(row.id, row.userId)));
  assert.equal(perUserRace.filter(result => result.status === 'fulfilled').length, 1);
  const otherUser = await order(personal.id, 1);
  await reserveOwnedOrderPayment(otherUser.id, otherUser.userId);
  await assert.rejects(reserveOwnedOrderPayment(otherUser.id, addresses[0].userId), /Order not found/);
  console.log('PASS: original read-only race reproduced; atomic global/per-user limits, multi-store checkout counted once, idempotent retries, failed-payment holds, partial/full refunds, and ownership.');
} finally {
  await db.orderGroup.deleteMany({ where: { orderId: { in: orderIds } } });
  await db.order.deleteMany({ where: { id: { in: orderIds } } });
  await db.coupon.deleteMany({ where: { id: { in: couponIds } } });
  await db.$disconnect();
}

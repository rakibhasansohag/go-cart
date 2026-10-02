import { PaymentStatus } from '@prisma/client';
import { assertSafeE2ERuntime } from '../src/lib/runtime-safety';
import { db } from '../src/lib/db';

assertSafeE2ERuntime();
const target = new URL(process.env.DATABASE_URL ?? '');
if (!['localhost', '127.0.0.1'].includes(target.hostname) || target.pathname !== '/gocart_e2e') {
  throw new Error('Analytics fixtures require the isolated local database.');
}

// Replace only the authenticated identity. Aggregates and authorization roles
// still use real PostgreSQL rows. This is not a browser authentication test.
let identity: string | null = null;
// Bun exposes this testing API at runtime; keep the tiny used contract typed
// without adding Bun's global declarations to the Next.js application.
const { mock } = await import('bun:' + 'test') as {
  mock: { module: (name: string, factory: () => {
    auth: () => Promise<{ userId: string | null }>;
  }) => void };
};
mock.module('@clerk/nextjs/server', () => ({ auth: async () => ({ userId: identity }) }));
const { getAdminAnalyticsData, getSellerStoreAnalyticsData } = await import('../src/queries/analytics');

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function equalMoney(actual: number, expected: number, message: string) {
  assert(Math.abs(actual - expected) < 0.011, `${message}: ${actual} versus ${expected}`);
}

try {
  const admin = await db.user.findFirstOrThrow({ where: { role: 'ADMIN' } });
  const store = await db.store.findUniqueOrThrow({ where: { url: 'gocart-demo-store' } });
  const candidates = await db.order.findMany({ where: { groups: { some: { storeId: store.id } } }, include: { groups: true }, take: 30 });
  const order = candidates.find((candidate) => candidate.groups.length === 1);
  assert(order, 'A single-store fixture order is required');
  const group = order.groups[0];
  const snapshot = async () => {
    identity = admin.id;
    const platform = await getAdminAnalyticsData();
    identity = store.userId;
    const seller = await getSellerStoreAnalyticsData(store.url);
    return { platform, seller };
  };
  try {
    await db.order.update({ where: { id: order.id }, data: { paymentStatus: 'Pending' } });
    await db.orderGroup.update({ where: { id: group.id }, data: { createdAt: new Date() } });
    await db.store.update({ where: { id: store.id }, data: { status: 'ACTIVE' } });
    const baseline = await snapshot();
    for (const status of [PaymentStatus.Paid, PaymentStatus.PartiallyRefunded, PaymentStatus.Refunded, PaymentStatus.Chargeback]) {
      await db.order.update({ where: { id: order.id }, data: { paymentStatus: status } });
      const result = await snapshot();
      const counted = status === PaymentStatus.Paid || status === PaymentStatus.PartiallyRefunded;
      const amount = counted ? group.total : 0;
      equalMoney(result.platform.totalRevenue, baseline.platform.totalRevenue + amount, `Admin GMV ${status}`);
      equalMoney(result.seller.totalRevenue, baseline.seller.totalRevenue + amount, `Seller GMV ${status}`);
      assert(result.platform.totalOrders === baseline.platform.totalOrders + Number(counted), `Admin count ${status}`);
      assert(result.seller.totalOrders === baseline.seller.totalOrders + Number(counted), `Seller count ${status}`);
      equalMoney(result.platform.monthlyPerformance.reduce((sum, month) => sum + month.gmv, 0), baseline.platform.monthlyPerformance.reduce((sum, month) => sum + month.gmv, 0) + amount, `Admin monthly GMV ${status}`);
      equalMoney(result.seller.monthlyRevenue.reduce((sum, month) => sum + month.revenue, 0), baseline.seller.monthlyRevenue.reduce((sum, month) => sum + month.revenue, 0) + amount, `Seller monthly GMV ${status}`);
      assert(result.platform.riskSignals.chargebacks === baseline.platform.riskSignals.chargebacks + Number(status === PaymentStatus.Chargeback), 'Chargeback signal');
    }
    await db.store.update({ where: { id: store.id }, data: { status: 'DISABLED' } });
    const disabled = await snapshot();
    assert(disabled.platform.activeStores === baseline.platform.activeStores - 1, 'Active store count');
    identity = store.userId;
    let denied = false;
    try { await getAdminAnalyticsData(); } catch { denied = true; }
    assert(denied, 'Seller identity must not access admin analytics');
    console.log('Analytics integration passed: real DB admin/seller GMV, monthly charts, order counts, refund/chargeback states, active stores and admin authorization.');
  } finally {
    await db.order.update({ where: { id: order.id }, data: { paymentStatus: order.paymentStatus } });
    await db.orderGroup.update({ where: { id: group.id }, data: { createdAt: group.createdAt } });
    await db.store.update({ where: { id: store.id }, data: { status: store.status } });
  }
} finally {
  await db.$disconnect();
}

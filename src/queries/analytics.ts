"use server";

import { db } from "@/lib/db";
import { normalizeCommerceReference } from "@/lib/orders/references";
import { primaryShipmentFromAssignments } from "@/lib/shipments/compat";
import { auth } from "@clerk/nextjs/server";
import { PaymentStatus, Prisma } from "@prisma/client";

export type MonthlyRevenueData = {
  month: string;
  revenue: number;
  orders: number;
};

export type RevenueGranularity = "day" | "week" | "month";

export type RevenueTrendData = {
  label: string;
  revenue: number;
  orders: number;
};

export type PeriodComparison = {
  revenue: number;
  orders: number;
  revenueChangePercent: number | null;
  orderChangePercent: number | null;
};

export type StockRiskItem = {
  id: string;
  productName: string;
  variantName: string;
  sku: string;
  size: string;
  quantity: number;
};

export type StockRiskSummary = {
  totalUnits: number;
  lowStockCount: number;
  outOfStockCount: number;
  items: StockRiskItem[];
};

export type CategoryRevenueData = {
  name: string;
  value: number;
};

export type OrderStatusDistributionData = {
  status: string;
  count: number;
};

export type RecentOrderSummary = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerImage?: string;
  storeName: string;
  total: number;
  status: string;
  createdAt: Date;
};

export type AdminAnalyticsData = {
  totalRevenue: number;
  platformRevenue: number;
  totalOrders: number;
  totalStores: number;
  activeStores: number;
  totalUsers: number;
  monthlyRevenue: MonthlyRevenueData[];
  monthlyPerformance: AdminMonthlyPerformanceData[];
  topStores: AdminTopStoreSummary[];
  riskSignals: AdminRiskSignals;
  operationalHealth: AdminOperationalHealth;
  categoryBreakdown: CategoryRevenueData[];
  recentOrders: RecentOrderSummary[];
};

export type AdminMonthlyPerformanceData = {
  month: string;
  gmv: number;
  platformRevenue: number;
  paidOrders: number;
};

export type AdminTopStoreSummary = {
  storeId: string;
  name: string;
  url: string;
  gmv: number;
  platformRevenue: number;
  paidOrders: number;
  refundedOrders: number;
  completedReturns: number;
  chargebacks: number;
  settlementRiskCents: number;
  settlementRiskCount: number;
};

export type AdminRiskSignals = {
  refundedOrders: number;
  completedReturns: number;
  chargebacks: number;
  blockedSettlements: number;
  failedSettlements: number;
  settlementRiskCents: number;
  failedOrPartialPayoutBatches: number;
};

export type AdminOperationalHealth = {
  pendingEmails: number;
  failedEmails: number;
  oldestPendingEmailAt: Date | null;
  paymentWebhookEventsLast24Hours: number;
  latestAutomationRunAt: Date | null;
  latestAutomationRunStatus: string | null;
  failedAutomationRuns: number;
  searchableProducts: number;
  latestCatalogUpdateAt: Date | null;
};

export type TopSellingProductSummary = {
  id: string;
  name: string;
  slug: string;
  sales: number;
  unitsSold: number;
  grossRevenue: number;
  netRevenue: number;
  price: number;
  image: string;
};

export type TopSellingVariantSummary = {
  id: string;
  productId: string;
  productName: string;
  variantSlug: string;
  sku: string;
  unitsSold: number;
  grossRevenue: number;
  netRevenue: number;
};

export type SellerAnalyticsData = {
  storeId: string;
  storeName: string;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  activeProducts: number;
  totalCustomers: number;
  commissionRevenue: number;
  netSellerRevenue: number;
  refundRate: number;
  returnRate: number;
  repeatCustomerRate: number;
  reviewCount: number;
  averageRating: number;
  monthlyRevenue: MonthlyRevenueData[];
  revenueTrend: RevenueTrendData[];
  revenueGranularity: RevenueGranularity;
  periodComparison: PeriodComparison;
  statusDistribution: OrderStatusDistributionData[];
  recentOrders: RecentOrderSummary[];
  topProducts: TopSellingProductSummary[];
  topVariants: TopSellingVariantSummary[];
  stockRisk: StockRiskSummary;
};

const REVENUE_PAYMENT_STATUSES = [
  PaymentStatus.Paid,
  PaymentStatus.PartiallyRefunded,
] as const;
const REFUND_PAYMENT_STATUSES = [
  PaymentStatus.PartiallyRefunded,
  PaymentStatus.Refunded,
] as const;

const INVALID_CUSTOMER_NAMES = new Set([
  "",
  "null",
  "null null",
  "undefined",
  "undefined undefined",
]);

function getCustomerDisplayName({
  name,
  email,
  firstName,
  lastName,
}: {
  name?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}) {
  const savedName = name?.trim() ?? "";
  if (!INVALID_CUSTOMER_NAMES.has(savedName.toLowerCase())) return savedName;

  const shippingName = [firstName, lastName]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" ")
    .trim();

  return shippingName || email?.split("@")[0]?.trim() || "Customer";
}

async function getCurrentDatabaseUser() {
  const { userId } = await auth();
  if (!userId) return null;
  return db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
}

async function requireAdminDatabaseUser() {
  const user = await getCurrentDatabaseUser();
  if (user?.role !== "ADMIN") {
    throw new Error("Unauthorized Access: Admin privileges required.");
  }
  return user;
}

/**
 * Retrieves platform-wide analytics for Admin Dashboard
 */
export const getAdminAnalyticsData = async (): Promise<AdminAnalyticsData> => {
  await requireAdminDatabaseUser();

  const paidOrderGroupWhere: Prisma.OrderGroupWhereInput = {
    order: { paymentStatus: { in: [...REVENUE_PAYMENT_STATUSES] } },
  };
  const now = new Date();
  const chartStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));

  const [
    totalStores,
    activeStores,
    totalUsers,
    totalOrders,
    paidSales,
    monthlyRows,
    topStoreRows,
    platformSettlementTotals,
    refundedOrders,
    completedReturns,
    chargebacks,
    settlementRiskRows,
    failedOrPartialPayoutBatches,
    emailOutboxRows,
    oldestPendingEmail,
    paymentWebhookEventsLast24Hours,
    latestAutomationRun,
    failedAutomationRuns,
    searchableProducts,
    latestCatalogUpdate,
    recentOrderGroups,
    categories,
  ] = await Promise.all([
    db.store.count(),
    db.store.count({ where: { status: "ACTIVE" } }),
    db.user.count(),
    db.orderGroup.count({ where: paidOrderGroupWhere }),
    db.orderGroup.aggregate({ where: paidOrderGroupWhere, _sum: { total: true } }),
    db.$queryRaw<AdminMonthlyPerformanceRow[]>(Prisma.sql`
      SELECT date_trunc('month', og."createdAt" AT TIME ZONE 'UTC') AS month,
             COALESCE(SUM(og."total"), 0)::float8 AS gmv,
             COALESCE(SUM(ss."commissionCents"), 0)::float8 / 100 AS "platformRevenue",
             COUNT(*)::int AS "paidOrders"
      FROM "OrderGroup" og
      JOIN "Order" o ON o.id = og."orderId"
      LEFT JOIN "SellerSettlement" ss ON ss."orderGroupId" = og.id
      WHERE o."paymentStatus" IN ('Paid', 'PartiallyRefunded')
        AND og."createdAt" >= ${chartStart}
      GROUP BY 1
      ORDER BY 1 ASC
    `),
    db.$queryRaw<AdminTopStoreRow[]>(Prisma.sql`
      WITH paid AS (
        SELECT og."storeId",
               COALESCE(SUM(og."total") FILTER (WHERE o."paymentStatus" IN ('Paid', 'PartiallyRefunded')), 0)::float8 AS gmv,
               COUNT(*) FILTER (WHERE o."paymentStatus" IN ('Paid', 'PartiallyRefunded'))::int AS "paidOrders",
               COUNT(*) FILTER (WHERE o."paymentStatus" IN ('PartiallyRefunded', 'Refunded'))::int AS "refundedOrders",
               COUNT(*) FILTER (WHERE o."paymentStatus" = 'Chargeback')::int AS chargebacks
        FROM "OrderGroup" og
        JOIN "Order" o ON o.id = og."orderId"
        GROUP BY og."storeId"
      ), returns AS (
        SELECT og."storeId", COUNT(rr.id)::int AS "completedReturns"
        FROM "OrderGroup" og
        JOIN "ReturnRequest" rr ON rr."orderGroupId" = og.id
        WHERE rr.status IN ('REFUNDED', 'EXCHANGED')
        GROUP BY og."storeId"
      ), settlement_risk AS (
        SELECT og."storeId",
               COALESCE(SUM(ss."commissionCents"), 0)::float8 / 100 AS "platformRevenue",
               COALESCE(SUM(GREATEST(ss."remainingPayableCents", 0)) FILTER (WHERE ss.status IN ('BLOCKED', 'FAILED')), 0)::bigint AS "settlementRiskCents",
               COUNT(*) FILTER (WHERE ss.status IN ('BLOCKED', 'FAILED'))::int AS "settlementRiskCount"
        FROM "SellerSettlement" ss
        JOIN "OrderGroup" og ON og.id = ss."orderGroupId"
        JOIN "Order" o ON o.id = og."orderId"
        WHERE o."paymentStatus" IN ('Paid', 'PartiallyRefunded')
        GROUP BY og."storeId"
      )
      SELECT s.id AS "storeId", s.name, s.url,
             COALESCE(paid.gmv, 0)::float8 AS gmv,
             COALESCE(settlement_risk."platformRevenue", 0)::float8 AS "platformRevenue",
             COALESCE(paid."paidOrders", 0)::int AS "paidOrders",
             COALESCE(paid."refundedOrders", 0)::int AS "refundedOrders",
             COALESCE(returns."completedReturns", 0)::int AS "completedReturns",
             COALESCE(paid.chargebacks, 0)::int AS chargebacks,
             COALESCE(settlement_risk."settlementRiskCents", 0)::bigint AS "settlementRiskCents",
             COALESCE(settlement_risk."settlementRiskCount", 0)::int AS "settlementRiskCount"
      FROM "Store" s
      LEFT JOIN paid ON paid."storeId" = s.id
      LEFT JOIN returns ON returns."storeId" = s.id
      LEFT JOIN settlement_risk ON settlement_risk."storeId" = s.id
      ORDER BY gmv DESC, s.id ASC
      LIMIT 5
    `),
    db.sellerSettlement.aggregate({ _sum: { commissionCents: true } }),
    db.orderGroup.count({
      where: { order: { paymentStatus: { in: [...REFUND_PAYMENT_STATUSES] } } },
    }),
    db.returnRequest.count({
      where: { status: { in: ["REFUNDED", "EXCHANGED"] } },
    }),
    db.orderGroup.count({ where: { order: { paymentStatus: PaymentStatus.Chargeback } } }),
    db.sellerSettlement.groupBy({
      by: ["status"],
      where: { status: { in: ["BLOCKED", "FAILED"] } },
      _count: { _all: true },
      _sum: { remainingPayableCents: true },
    }),
    db.payoutBatch.count({ where: { status: { in: ["FAILED", "PARTIAL"] } } }),
    db.emailOutbox.groupBy({
      by: ["status"],
      where: { status: { in: ["PENDING", "FAILED"] } },
      _count: { _all: true },
    }),
    db.emailOutbox.findFirst({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    db.paymentEvent.count({
      where: { processedAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
    }),
    db.automationRun.findFirst({
      orderBy: { startedAt: "desc" },
      select: { startedAt: true, status: true },
    }),
    db.automationRun.count({ where: { status: "FAILED" } }),
    db.product.count(),
    db.product.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    db.orderGroup.findMany({
      where: paidOrderGroupWhere,
      take: 6,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        total: true,
        status: true,
        createdAt: true,
        store: { select: { name: true } },
        order: {
          select: {
            user: {
              select: {
                name: true,
                email: true,
                picture: true,
              },
            },
            shippingAddress: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    }),
    db.category.findMany({
      take: 5,
      select: {
        name: true,
        _count: { select: { products: true } },
      },
    }),
  ]);

  const totalRevenue = Math.round((paidSales._sum.total ?? 0) * 100) / 100;
  const monthlyRevenue = buildMonthlyRevenue(
    monthlyRows.map((row) => ({
      month: row.month,
      revenue: row.gmv,
      orders: row.paidOrders,
    })),
    now,
  );
  const monthlyPerformance = monthlyRows.map((row) => ({
    month: row.month.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }),
    gmv: Math.round(Number(row.gmv ?? 0) * 100) / 100,
    platformRevenue: Math.round(Number(row.platformRevenue ?? 0) * 100) / 100,
    paidOrders: Number(row.paidOrders),
  }));
  const settlementRiskByStatus = new Map(
    settlementRiskRows.map((row) => [
      row.status,
      {
        count: row._count._all,
        remainingPayableCents: Math.max(0, row._sum.remainingPayableCents ?? 0),
      },
    ]),
  );
  const emailCounts = new Map(emailOutboxRows.map((row) => [row.status, row._count._all]));

  const categoryBreakdown: CategoryRevenueData[] = categories.map((c) => ({
    name: c.name,
    value: c._count.products,
  }));

  const recentOrders: RecentOrderSummary[] = recentOrderGroups.map((g) => ({
    id: g.id,
    customerName: getCustomerDisplayName({
      name: g.order?.user?.name,
      email: g.order?.user?.email,
      firstName: g.order?.shippingAddress?.firstName,
      lastName: g.order?.shippingAddress?.lastName,
    }),
    customerEmail: g.order?.user?.email || "",
    customerImage: g.order?.user?.picture || undefined,
    storeName: g.store?.name || "Store",
    total: g.total || 0,
    status: g.status,
    createdAt: g.createdAt,
  }));

  return {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    platformRevenue: Math.round((platformSettlementTotals._sum.commissionCents ?? 0)) / 100,
    totalOrders,
    totalStores,
    activeStores,
    totalUsers,
    monthlyRevenue,
    monthlyPerformance,
    topStores: topStoreRows.map((row) => ({
      storeId: row.storeId,
      name: row.name,
      url: row.url,
      gmv: Math.round(Number(row.gmv ?? 0) * 100) / 100,
      platformRevenue: Math.round(Number(row.platformRevenue ?? 0) * 100) / 100,
      paidOrders: Number(row.paidOrders),
      refundedOrders: Number(row.refundedOrders),
      completedReturns: Number(row.completedReturns),
      chargebacks: Number(row.chargebacks),
      settlementRiskCents: Number(row.settlementRiskCents),
      settlementRiskCount: Number(row.settlementRiskCount),
    })),
    riskSignals: {
      refundedOrders,
      completedReturns,
      chargebacks,
      blockedSettlements: settlementRiskByStatus.get("BLOCKED")?.count ?? 0,
      failedSettlements: settlementRiskByStatus.get("FAILED")?.count ?? 0,
      settlementRiskCents: [...settlementRiskByStatus.values()].reduce(
        (total, row) => total + row.remainingPayableCents,
        0,
      ),
      failedOrPartialPayoutBatches,
    },
    operationalHealth: {
      pendingEmails: emailCounts.get("PENDING") ?? 0,
      failedEmails: emailCounts.get("FAILED") ?? 0,
      oldestPendingEmailAt: oldestPendingEmail?.createdAt ?? null,
      paymentWebhookEventsLast24Hours,
      latestAutomationRunAt: latestAutomationRun?.startedAt ?? null,
      latestAutomationRunStatus: latestAutomationRun?.status ?? null,
      failedAutomationRuns,
      searchableProducts,
      latestCatalogUpdateAt: latestCatalogUpdate?.updatedAt ?? null,
    },
    categoryBreakdown,
    recentOrders,
  };
};

const getFallbackSellerAnalytics = (storeUrl: string): SellerAnalyticsData => ({
  storeId: "",
  storeName: storeUrl
    ? storeUrl.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    : "Store",
  totalRevenue: 0,
  totalOrders: 0,
  averageOrderValue: 0,
  activeProducts: 0,
  totalCustomers: 0,
  commissionRevenue: 0,
  netSellerRevenue: 0,
  refundRate: 0,
  returnRate: 0,
  repeatCustomerRate: 0,
  reviewCount: 0,
  averageRating: 0,
  monthlyRevenue: [],
  revenueTrend: [],
  revenueGranularity: "month",
  periodComparison: {
    revenue: 0,
    orders: 0,
    revenueChangePercent: null,
    orderChangePercent: null,
  },
  statusDistribution: [],
  recentOrders: [],
  topProducts: [],
  topVariants: [],
  stockRisk: {
    totalUnits: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    items: [],
  },
});

type MonthlyRevenueRow = {
  month: Date;
  revenue: number | null;
  orders: bigint | number;
};

type AdminMonthlyPerformanceRow = {
  month: Date;
  gmv: number | null;
  platformRevenue: number | null;
  paidOrders: bigint | number;
};

type AdminTopStoreRow = {
  storeId: string;
  name: string;
  url: string;
  gmv: number | null;
  platformRevenue: number | null;
  paidOrders: bigint | number;
  refundedOrders: bigint | number;
  completedReturns: bigint | number;
  chargebacks: bigint | number;
  settlementRiskCents: bigint | number;
  settlementRiskCount: bigint | number;
};

type RevenueTrendRow = {
  period: Date;
  revenue: number | null;
  orders: bigint | number;
};

type TopProductRow = {
  productId: string;
  name: string;
  productSlug: string;
  image: string;
  price: number;
  unitsSold: bigint | number;
  grossRevenue: number | null;
  netRevenue: number | null;
};

type TopVariantRow = {
  variantId: string;
  productId: string;
  productName: string;
  variantSlug: string;
  sku: string;
  unitsSold: bigint | number;
  grossRevenue: number | null;
  netRevenue: number | null;
};

const STOCK_LOW_THRESHOLD = 5;

function timeframeStart(timeframe: string, now: Date) {
  if (timeframe === "7d") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (timeframe === "30d") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (timeframe === "this_month") {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }
  return undefined;
}

function timeframeDuration(timeframe: string, now: Date, start?: Date) {
  if (!start) return undefined;
  if (timeframe === "this_month") return now.getTime() - start.getTime();
  return timeframe === "7d" ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
}

function trendStart(granularity: RevenueGranularity, now: Date, periodStart?: Date) {
  if (periodStart) return periodStart;
  if (granularity === "day") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (granularity === "week") return new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
}

function periodExpression(granularity: RevenueGranularity) {
  if (granularity === "day") return Prisma.sql`date_trunc('day', og."createdAt" AT TIME ZONE 'UTC')`;
  if (granularity === "week") return Prisma.sql`date_trunc('week', og."createdAt" AT TIME ZONE 'UTC')`;
  return Prisma.sql`date_trunc('month', og."createdAt" AT TIME ZONE 'UTC')`;
}

function formatTrendLabel(date: Date, granularity: RevenueGranularity) {
  if (granularity === "day") return date.toISOString().slice(5, 10);
  if (granularity === "week") return `Week of ${date.toISOString().slice(5, 10)}`;
  return `${date.toLocaleString("en-US", { month: "short", timeZone: "UTC" })} ${date.getUTCFullYear()}`;
}

function buildRevenueTrend(rows: RevenueTrendRow[], granularity: RevenueGranularity): RevenueTrendData[] {
  return rows.map((row) => ({
    label: formatTrendLabel(new Date(row.period), granularity),
    revenue: Math.round(Number(row.revenue ?? 0) * 100) / 100,
    orders: Number(row.orders),
  }));
}

function changePercent(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 10_000) / 100;
}

function buildMonthlyRevenue(rows: MonthlyRevenueRow[], now: Date): MonthlyRevenueData[] {
  const monthLabels = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const values = new Map<string, { revenue: number; orders: number }>();
  for (let offset = 5; offset >= 0; offset -= 1) {
    const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    values.set(`${month.getUTCFullYear()}-${month.getUTCMonth()}`, { revenue: 0, orders: 0 });
  }
  for (const row of rows) {
    const month = new Date(row.month);
    const key = `${month.getUTCFullYear()}-${month.getUTCMonth()}`;
    if (!values.has(key)) continue;
    values.set(key, {
      revenue: Number(row.revenue ?? 0),
      orders: Number(row.orders),
    });
  }
  return [...values.entries()].map(([key, value]) => {
    const [year, month] = key.split("-").map(Number);
    return {
      month: `${monthLabels[month]} ${year}`,
      revenue: Math.round(value.revenue * 100) / 100,
      orders: value.orders,
    };
  });
}

/**
 * Retrieves store-specific analytics for Seller Dashboard
 */
export const getSellerStoreAnalyticsData = async (
  storeUrl: string,
  timeframe: string = "all",
  granularity: RevenueGranularity = "month",
): Promise<SellerAnalyticsData> => {
  const user = await getCurrentDatabaseUser();
  if (user?.role !== "SELLER") return getFallbackSellerAnalytics(storeUrl);

  const store = await db.store.findFirst({
    where: { url: storeUrl, userId: user.id },
    select: { id: true, name: true },
  });
  if (!store) return getFallbackSellerAnalytics(storeUrl);

  const now = new Date();
  const periodStart = timeframeStart(timeframe, now);
  const dateFilter = periodStart ? { createdAt: { gte: periodStart } } : undefined;
  const paidOrderGroupWhere: Prisma.OrderGroupWhereInput = {
    storeId: store.id,
    ...(dateFilter ?? {}),
    order: { paymentStatus: { in: [...REVENUE_PAYMENT_STATUSES] } },
  };
  const allPaidOrRefundedWhere: Prisma.OrderGroupWhereInput = {
    storeId: store.id,
    ...(dateFilter ?? {}),
    order: {
      paymentStatus: {
        in: [
          PaymentStatus.Paid,
          PaymentStatus.PartiallyRefunded,
          PaymentStatus.Refunded,
        ],
      },
    },
  };
  const chartStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
  const rangeDateClause = periodStart
    ? Prisma.sql`AND og."createdAt" >= ${periodStart}`
    : Prisma.empty;
  const trendSince = trendStart(granularity, now, periodStart);
  const previousDuration = timeframeDuration(timeframe, now, periodStart);
  const previousPeriodStart = previousDuration && periodStart
    ? new Date(periodStart.getTime() - previousDuration)
    : undefined;
  const previousPaidOrderGroupWhere: Prisma.OrderGroupWhereInput | undefined = previousPeriodStart
    ? {
        storeId: store.id,
        createdAt: { gte: previousPeriodStart, lt: periodStart },
        order: { paymentStatus: { in: [...REVENUE_PAYMENT_STATUSES] } },
      }
    : undefined;
  const trendExpression = periodExpression(granularity);

  const [
    catalogProducts,
    paidOrderCount,
    paidSales,
    uniqueCustomerRows,
    repeatCustomerRows,
    monthlyRows,
    trendRows,
    previousPaidSales,
    previousPaidOrderCount,
    statusRows,
    recentOrderGroups,
    topProducts,
    topVariants,
    totalStock,
    lowStockCount,
    outOfStockCount,
    stockRiskRows,
    settlementTotals,
    refundedOrderCount,
    returnedOrderCount,
    reviewStats,
  ] = await Promise.all([
    db.product.count({ where: { storeId: store.id } }),
    db.orderGroup.count({ where: paidOrderGroupWhere }),
    db.orderGroup.aggregate({ where: paidOrderGroupWhere, _sum: { total: true } }),
    db.$queryRaw<{ count: bigint | number }[]>(Prisma.sql`
      SELECT COUNT(DISTINCT o."userId")::int AS count
      FROM "OrderGroup" og
      JOIN "Order" o ON o.id = og."orderId"
      WHERE og."storeId" = ${store.id}
        AND o."paymentStatus" IN ('Paid', 'PartiallyRefunded')
        ${rangeDateClause}
    `),
    db.$queryRaw<{ rate: number | null }[]>(Prisma.sql`
      WITH customer_orders AS (
        SELECT o."userId", COUNT(*)::int AS order_count
        FROM "OrderGroup" og
        JOIN "Order" o ON o.id = og."orderId"
          WHERE og."storeId" = ${store.id}
          AND o."paymentStatus" IN ('Paid', 'PartiallyRefunded')
          ${rangeDateClause}
        GROUP BY o."userId"
      )
      SELECT COALESCE(
        COUNT(*) FILTER (WHERE order_count > 1)::float / NULLIF(COUNT(*), 0),
        0
      )::float8 AS rate
      FROM customer_orders
    `),
    db.$queryRaw<MonthlyRevenueRow[]>(Prisma.sql`
      SELECT date_trunc('month', og."createdAt" AT TIME ZONE 'UTC') AS month,
             COALESCE(SUM(og."total"), 0)::float8 AS revenue,
             COUNT(*)::int AS orders
      FROM "OrderGroup" og
      JOIN "Order" o ON o.id = og."orderId"
      WHERE og."storeId" = ${store.id}
        AND o."paymentStatus" IN ('Paid', 'PartiallyRefunded')
        AND og."createdAt" >= ${chartStart}
         ${rangeDateClause}
      GROUP BY 1
      ORDER BY 1 ASC
    `),
    db.$queryRaw<RevenueTrendRow[]>(Prisma.sql`
      SELECT ${trendExpression} AS period,
             COALESCE(SUM(og."total"), 0)::float8 AS revenue,
             COUNT(*)::int AS orders
      FROM "OrderGroup" og
      JOIN "Order" o ON o.id = og."orderId"
      WHERE og."storeId" = ${store.id}
        AND o."paymentStatus" IN ('Paid', 'PartiallyRefunded')
        AND og."createdAt" >= ${trendSince}
        ${rangeDateClause}
      GROUP BY 1
      ORDER BY 1 ASC
    `),
    previousPaidOrderGroupWhere
      ? db.orderGroup.aggregate({
          where: previousPaidOrderGroupWhere,
          _sum: { total: true },
        })
      : Promise.resolve({ _sum: { total: null } }),
    previousPaidOrderGroupWhere
      ? db.orderGroup.count({ where: previousPaidOrderGroupWhere })
      : Promise.resolve(0),
    db.orderGroup.groupBy({
      by: ["status"],
      where: paidOrderGroupWhere,
      _count: { _all: true },
    }),
    db.orderGroup.findMany({
      where: paidOrderGroupWhere,
      take: 6,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        total: true,
        status: true,
        createdAt: true,
        order: {
          select: {
            user: { select: { name: true, email: true, picture: true } },
            shippingAddress: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
    db.$queryRaw<TopProductRow[]>(Prisma.sql`
      SELECT oi."productId" AS "productId",
             oi."name" AS name,
             oi."productSlug" AS "productSlug",
             oi."image" AS image,
             MAX(oi."price")::float8 AS price,
             SUM(oi."quantity")::int AS "unitsSold",
             SUM(oi."totalPrice")::float8 AS "grossRevenue",
             SUM(
               CASE
                 WHEN og."total" > 0 THEN oi."totalPrice" * (
                   1 - COALESCE(ss."commissionCents", 0)::float8 / 100 / og."total"
                 )
                 ELSE oi."totalPrice"
               END
             )::float8 AS "netRevenue"
      FROM "OrderItem" oi
      JOIN "OrderGroup" og ON og.id = oi."orderGroupId"
      JOIN "Order" o ON o.id = og."orderId"
      LEFT JOIN "SellerSettlement" ss ON ss."orderGroupId" = og.id
      WHERE og."storeId" = ${store.id}
        AND o."paymentStatus" IN ('Paid', 'PartiallyRefunded')
        ${rangeDateClause}
      GROUP BY oi."productId", oi."name", oi."productSlug", oi."image"
      ORDER BY "netRevenue" DESC, oi."productId" ASC
      LIMIT 5
    `),
    db.$queryRaw<TopVariantRow[]>(Prisma.sql`
      SELECT oi."variantId" AS "variantId",
             oi."productId" AS "productId",
             oi."name" AS "productName",
             oi."variantSlug" AS "variantSlug",
             oi."sku" AS sku,
             SUM(oi."quantity")::int AS "unitsSold",
             SUM(oi."totalPrice")::float8 AS "grossRevenue",
             SUM(
               CASE
                 WHEN og."total" > 0 THEN oi."totalPrice" * (
                   1 - COALESCE(ss."commissionCents", 0)::float8 / 100 / og."total"
                 )
                 ELSE oi."totalPrice"
               END
             )::float8 AS "netRevenue"
      FROM "OrderItem" oi
      JOIN "OrderGroup" og ON og.id = oi."orderGroupId"
      JOIN "Order" o ON o.id = og."orderId"
      LEFT JOIN "SellerSettlement" ss ON ss."orderGroupId" = og.id
      WHERE og."storeId" = ${store.id}
        AND o."paymentStatus" IN ('Paid', 'PartiallyRefunded')
        ${rangeDateClause}
      GROUP BY oi."variantId", oi."productId", oi."name", oi."variantSlug", oi."sku"
      ORDER BY "netRevenue" DESC, oi."variantId" ASC
      LIMIT 5
    `),
    db.size.aggregate({
      where: { productVariant: { product: { storeId: store.id } } },
      _sum: { quantity: true },
    }),
    db.size.count({
      where: {
        quantity: { gt: 0, lt: STOCK_LOW_THRESHOLD },
        productVariant: { product: { storeId: store.id } },
      },
    }),
    db.size.count({
      where: {
        quantity: 0,
        productVariant: { product: { storeId: store.id } },
      },
    }),
    db.size.findMany({
      where: {
        quantity: { lt: STOCK_LOW_THRESHOLD },
        productVariant: { product: { storeId: store.id } },
      },
      take: 5,
      orderBy: [{ quantity: "asc" }, { id: "asc" }],
      select: {
        id: true,
        size: true,
        quantity: true,
        productVariant: {
          select: {
            variantName: true,
            sku: true,
            product: { select: { name: true } },
          },
        },
      },
    }),
    db.sellerSettlement.aggregate({
      where: { orderGroup: paidOrderGroupWhere },
      _sum: { commissionCents: true, sellerPayableCents: true },
    }),
    db.orderGroup.count({
      where: {
        ...allPaidOrRefundedWhere,
        order: {
          paymentStatus: { in: [...REFUND_PAYMENT_STATUSES] },
        },
      },
    }),
    db.orderGroup.count({
      where: {
        ...allPaidOrRefundedWhere,
        returnRequests: { some: { status: { in: ["REFUNDED", "EXCHANGED"] } } },
      },
    }),
    db.review.aggregate({
      where: { product: { storeId: store.id }, ...dateFilter },
      _count: { _all: true },
      _avg: { rating: true },
    }),
  ]);

  const totalRevenue = Math.round((paidSales._sum.total ?? 0) * 100) / 100;
  const totalOrders = paidOrderCount;
  const uniqueCustomers = Number(uniqueCustomerRows[0]?.count ?? 0);
  const denominator = Math.max(1, await db.orderGroup.count({ where: allPaidOrRefundedWhere }));
  const averageOrderValue = totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0;
  const previousRevenue = Math.round(Number(previousPaidSales._sum.total ?? 0) * 100) / 100;
  const previousOrders = Number(previousPaidOrderCount);
  const periodComparison: PeriodComparison = {
    revenue: previousRevenue,
    orders: previousOrders,
    revenueChangePercent: previousPeriodStart ? changePercent(totalRevenue, previousRevenue) : null,
    orderChangePercent: previousPeriodStart ? changePercent(totalOrders, previousOrders) : null,
  };
  const stockRisk: StockRiskSummary = {
    totalUnits: Number(totalStock._sum.quantity ?? 0),
    lowStockCount,
    outOfStockCount,
    items: stockRiskRows.map((row) => ({
      id: row.id,
      productName: row.productVariant.product.name,
      variantName: row.productVariant.variantName,
      sku: row.productVariant.sku,
      size: row.size,
      quantity: row.quantity,
    })),
  };

  return {
    storeId: store.id,
    storeName: store.name,
    totalRevenue,
    totalOrders,
    averageOrderValue,
    activeProducts: catalogProducts,
    totalCustomers: uniqueCustomers,
    commissionRevenue: Math.round((settlementTotals._sum.commissionCents ?? 0)) / 100,
    netSellerRevenue: Math.round((settlementTotals._sum.sellerPayableCents ?? 0)) / 100,
    refundRate: Math.round((refundedOrderCount / denominator) * 10_000) / 100,
    returnRate: Math.round((returnedOrderCount / denominator) * 10_000) / 100,
    repeatCustomerRate: Math.round(Number(repeatCustomerRows[0]?.rate ?? 0) * 10_000) / 100,
    monthlyRevenue: buildMonthlyRevenue(monthlyRows, now),
    revenueTrend: buildRevenueTrend(trendRows, granularity),
    revenueGranularity: granularity,
    periodComparison,
    statusDistribution: statusRows
      .map((row) => ({ status: row.status, count: row._count._all }))
      .sort((left, right) => left.status.localeCompare(right.status)),
    recentOrders: recentOrderGroups.map((group) => ({
      id: group.id,
      customerName: getCustomerDisplayName({
        name: group.order.user?.name,
        email: group.order.user?.email,
        firstName: group.order.shippingAddress?.firstName,
        lastName: group.order.shippingAddress?.lastName,
      }),
      customerEmail: group.order.user?.email ?? "",
      customerImage: group.order.user?.picture ?? undefined,
      storeName: store.name,
      total: group.total,
      status: group.status,
      createdAt: group.createdAt,
    })),
    topProducts: topProducts.map((product) => ({
      id: product.productId,
      name: product.name,
      slug: product.productSlug,
      sales: Number(product.unitsSold),
      unitsSold: Number(product.unitsSold),
      grossRevenue: Math.round(Number(product.grossRevenue ?? 0) * 100) / 100,
      netRevenue: Math.round(Number(product.netRevenue ?? 0) * 100) / 100,
      price: product.price,
      image: product.image,
    })),
    topVariants: topVariants.map((variant) => ({
      id: variant.variantId,
      productId: variant.productId,
      productName: variant.productName,
      variantSlug: variant.variantSlug,
      sku: variant.sku,
      unitsSold: Number(variant.unitsSold),
      grossRevenue: Math.round(Number(variant.grossRevenue ?? 0) * 100) / 100,
      netRevenue: Math.round(Number(variant.netRevenue ?? 0) * 100) / 100,
    })),
    stockRisk,
    reviewCount: reviewStats._count._all,
    averageRating: reviewStats._avg.rating ?? 0,
  };
};

/**
 * Retrieves all global orders across stores for platform Admin
 */
export const getAllAdminOrders = async ({
  page = 1,
  limit = 10,
  search = "",
}: {
  page?: number;
  limit?: number;
  search?: string;
} = {}) => {
  await requireAdminDatabaseUser();

  const skip = Math.max(0, (page - 1) * limit);
  const textSearch = search.trim();
  const referenceSearch = normalizeCommerceReference(textSearch);

  const where = textSearch
    ? {
        OR: [
          {
            id: {
              contains: referenceSearch,
              mode: "insensitive" as const,
            },
          },
          {
            order: {
              id: {
                contains: referenceSearch,
                mode: "insensitive" as const,
              },
            },
          },
          {
            store: {
              name: {
                contains: textSearch,
                mode: "insensitive" as const,
              },
            },
          },
          {
            store: {
              user: {
                OR: [
                  {
                    name: {
                      contains: textSearch,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    email: {
                      contains: textSearch,
                      mode: "insensitive" as const,
                    },
                  },
                ],
              },
            },
          },
          {
            order: {
              user: {
                OR: [
                  {
                    name: {
                      contains: textSearch,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    email: {
                      contains: textSearch,
                      mode: "insensitive" as const,
                    },
                  },
                ],
              },
            },
          },
          {
            items: {
              some: {
                OR: [
                  {
                    name: {
                      contains: textSearch,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    sku: {
                      contains: textSearch,
                      mode: "insensitive" as const,
                    },
                  },
                ],
              },
            },
          },
        ],
      }
    : {};

  const [orders, totalCount] = await Promise.all([
    db.orderGroup.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        store: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        coupon: true,
        items: true,
        shipmentAssignments: {
          include: { shipment: true },
          orderBy: { createdAt: "asc" },
        },
        cancellationRequests: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        fulfillmentEvents: {
          orderBy: { createdAt: "asc" },
        },
        order: {
          include: {
            user: true,
            shippingAddress: {
              include: {
                country: true,
              },
            },
          },
        },
      },
    }),
    db.orderGroup.count({ where }),
  ]);

  return {
    orders: orders.map(primaryShipmentFromAssignments),
    totalCount,
    totalPages: Math.ceil(totalCount / limit) || 1,
    page,
    limit,
  };
};

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
  totalOrders: number;
  totalStores: number;
  activeStores: number;
  totalUsers: number;
  monthlyRevenue: MonthlyRevenueData[];
  categoryBreakdown: CategoryRevenueData[];
  recentOrders: RecentOrderSummary[];
};

export type TopSellingProductSummary = {
  id: string;
  name: string;
  slug: string;
  sales: number;
  price: number;
  image: string;
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
  statusDistribution: OrderStatusDistributionData[];
  recentOrders: RecentOrderSummary[];
  topProducts: TopSellingProductSummary[];
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
    recentOrderGroups,
    categories,
  ] = await Promise.all([
    db.store.count(),
    db.store.count({ where: { status: "ACTIVE" } }),
    db.user.count(),
    db.orderGroup.count({ where: paidOrderGroupWhere }),
    db.orderGroup.aggregate({ where: paidOrderGroupWhere, _sum: { total: true } }),
    db.$queryRaw<MonthlyRevenueRow[]>(Prisma.sql`
      SELECT date_trunc('month', og."createdAt" AT TIME ZONE 'UTC') AS month,
             COALESCE(SUM(og."total"), 0)::float8 AS revenue,
             COUNT(*)::int AS orders
      FROM "OrderGroup" og
      JOIN "Order" o ON o.id = og."orderId"
      WHERE o."paymentStatus" IN ('Paid', 'PartiallyRefunded')
        AND og."createdAt" >= ${chartStart}
      GROUP BY 1
      ORDER BY 1 ASC
    `),
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
  const monthlyRevenue = buildMonthlyRevenue(monthlyRows, now);

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
    totalOrders,
    totalStores,
    activeStores,
    totalUsers,
    monthlyRevenue,
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
  statusDistribution: [],
  recentOrders: [],
  topProducts: [],
});

type MonthlyRevenueRow = {
  month: Date;
  revenue: number | null;
  orders: bigint | number;
};

function timeframeStart(timeframe: string, now: Date) {
  if (timeframe === "7d") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (timeframe === "30d") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (timeframe === "this_month") {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }
  return undefined;
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
  const dateFilter = periodStart ? { createdAt: { gte: periodStart } } : {};
  const paidOrderGroupWhere: Prisma.OrderGroupWhereInput = {
    storeId: store.id,
    order: { paymentStatus: { in: [...REVENUE_PAYMENT_STATUSES] }, ...dateFilter },
  };
  const allPaidOrRefundedWhere: Prisma.OrderGroupWhereInput = {
    storeId: store.id,
    order: {
      paymentStatus: {
        in: [
          PaymentStatus.Paid,
          PaymentStatus.PartiallyRefunded,
          PaymentStatus.Refunded,
        ],
      },
      ...dateFilter,
    },
  };
  const chartStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
  const chartDateClause = periodStart
    ? Prisma.sql`AND og."createdAt" >= ${periodStart}`
    : Prisma.empty;

  const [
    catalogProducts,
    paidOrderCount,
    paidSales,
    uniqueCustomerRows,
    repeatCustomerRows,
    monthlyRows,
    statusRows,
    recentOrderGroups,
    topProducts,
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
        ${chartDateClause}
    `),
    db.$queryRaw<{ rate: number | null }[]>(Prisma.sql`
      WITH customer_orders AS (
        SELECT o."userId", COUNT(*)::int AS order_count
        FROM "OrderGroup" og
        JOIN "Order" o ON o.id = og."orderId"
        WHERE og."storeId" = ${store.id}
          AND o."paymentStatus" IN ('Paid', 'PartiallyRefunded')
          ${chartDateClause}
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
        ${chartDateClause}
      GROUP BY 1
      ORDER BY 1 ASC
    `),
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
    db.orderItem.groupBy({
      by: ["productId", "name", "productSlug", "image", "price"],
      where: { orderGroup: paidOrderGroupWhere },
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { totalPrice: "desc" } },
      take: 5,
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
          ...dateFilter,
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
      sales: product._sum.quantity ?? 0,
      price: product.price,
      image: product.image,
    })),
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

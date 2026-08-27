import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, dbMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  dbMock: {
    user: { findUnique: vi.fn(), count: vi.fn() },
    store: { findFirst: vi.fn(), count: vi.fn() },
    category: { findMany: vi.fn() },
    product: { count: vi.fn(), findFirst: vi.fn() },
    orderGroup: {
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    orderItem: { aggregate: vi.fn(), groupBy: vi.fn() },
    size: { aggregate: vi.fn(), count: vi.fn(), findMany: vi.fn() },
    sellerSettlement: { aggregate: vi.fn(), groupBy: vi.fn() },
    returnRequest: { count: vi.fn() },
    payoutBatch: { count: vi.fn() },
    emailOutbox: { groupBy: vi.fn(), findFirst: vi.fn() },
    paymentEvent: { count: vi.fn() },
    automationRun: { count: vi.fn(), findFirst: vi.fn() },
    review: { aggregate: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("@/lib/db", () => ({ db: dbMock }));

import { getAdminAnalyticsData, getSellerStoreAnalyticsData } from "./analytics";

describe("seller analytics authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.$queryRaw.mockResolvedValue([]);
    dbMock.sellerSettlement.aggregate.mockResolvedValue({ _sum: { commissionCents: 0, sellerPayableCents: 0 } });
    dbMock.sellerSettlement.groupBy.mockResolvedValue([]);
    dbMock.returnRequest.count.mockResolvedValue(0);
    dbMock.payoutBatch.count.mockResolvedValue(0);
    dbMock.emailOutbox.groupBy.mockResolvedValue([]);
    dbMock.emailOutbox.findFirst.mockResolvedValue(null);
    dbMock.paymentEvent.count.mockResolvedValue(0);
    dbMock.automationRun.count.mockResolvedValue(0);
    dbMock.automationRun.findFirst.mockResolvedValue(null);
    dbMock.product.findFirst.mockResolvedValue(null);
    authMock.mockResolvedValue({ userId: "seller_owner" });
    dbMock.user.findUnique.mockResolvedValue({
      id: "seller_owner",
      role: "SELLER",
    });
    dbMock.store.findFirst.mockResolvedValue(null);
  });

  it("scopes the store lookup to the authenticated seller before reading analytics", async () => {
    const result = await getSellerStoreAnalyticsData("another-sellers-store");

    expect(dbMock.store.findFirst).toHaveBeenCalledWith({
      where: { url: "another-sellers-store", userId: "seller_owner" },
      select: { id: true, name: true },
    });
    expect(result).toMatchObject({
      storeId: "",
      storeName: "Another Sellers Store",
      totalRevenue: 0,
      recentOrders: [],
    });
  });

  it("does not query a store when the authenticated user is not a seller", async () => {
    dbMock.user.findUnique.mockResolvedValue({ id: "customer", role: "USER" });

    const result = await getSellerStoreAnalyticsData("seller-store");

    expect(dbMock.store.findFirst).not.toHaveBeenCalled();
    expect(result.totalRevenue).toBe(0);
  });

  it.each(["SELLER", "USER"])("rejects platform analytics before querying data for a %s", async (role) => {
    dbMock.user.findUnique.mockResolvedValue({ id: "non_admin", role });

    await expect(getAdminAnalyticsData()).rejects.toThrow("Admin privileges required");
    expect(dbMock.orderGroup.count).not.toHaveBeenCalled();
    expect(dbMock.emailOutbox.groupBy).not.toHaveBeenCalled();
  });

  it("uses database aggregates for paid seller metrics and bounded recent rows", async () => {
    dbMock.store.findFirst.mockResolvedValue({ id: "store-1", name: "Owned Store" });
    dbMock.product.count.mockResolvedValue(3);
    dbMock.orderGroup.count.mockImplementation(({ where }: { where: Record<string, unknown> }) => {
      if (where.returnRequests) return Promise.resolve(1);
      const paymentStatus = (where.order as { paymentStatus?: { in?: string[] } } | undefined)?.paymentStatus?.in ?? [];
      if (paymentStatus.length === 3) return Promise.resolve(2);
      if (paymentStatus.includes("Refunded")) return Promise.resolve(1);
      return Promise.resolve(2);
    });
    dbMock.orderGroup.aggregate.mockResolvedValue({ _sum: { total: 42.5 } });
    dbMock.orderItem.aggregate.mockResolvedValue({ _sum: { quantity: 4 } });
    dbMock.orderGroup.groupBy.mockResolvedValue([
      { status: "Delivered", _count: { _all: 2 } },
    ]);
    dbMock.orderGroup.findMany.mockResolvedValue([
      {
        id: "group-1",
        total: 42.5,
        status: "Delivered",
        createdAt: new Date("2026-08-20T00:00:00.000Z"),
        order: {
          user: { name: "Buyer", email: "buyer@example.com", picture: null },
          shippingAddress: { firstName: "Buyer", lastName: "One" },
        },
      },
    ]);
    dbMock.orderItem.groupBy.mockResolvedValue([
      {
        productId: "product-1",
        name: "Chair",
        productSlug: "chair",
        image: "chair.jpg",
        price: 42.5,
        _sum: { quantity: 4, totalPrice: 170 },
      },
    ]);
    dbMock.size.aggregate.mockResolvedValue({ _sum: { quantity: 27 } });
    dbMock.size.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    dbMock.size.findMany.mockResolvedValue([
      {
        id: "size-1",
        size: "M",
        quantity: 2,
        productVariant: {
          variantName: "Natural",
          sku: "CHAIR-M",
          product: { name: "Chair" },
        },
      },
    ]);
    dbMock.sellerSettlement.aggregate.mockResolvedValue({
      _sum: { commissionCents: 250, sellerPayableCents: 4000 },
    });
    dbMock.review.aggregate.mockResolvedValue({
      _count: { _all: 2 },
      _avg: { rating: 4.5 },
    });
    dbMock.$queryRaw
      .mockResolvedValueOnce([{ count: 2 }])
      .mockResolvedValueOnce([{ rate: 0.5 }])
      .mockResolvedValueOnce([
        { month: new Date("2026-08-01T00:00:00.000Z"), revenue: 42.5, orders: 2 },
      ])
      .mockResolvedValueOnce([
        { period: new Date("2026-08-01T00:00:00.000Z"), revenue: 42.5, orders: 2 },
      ])
      .mockResolvedValueOnce([
        {
          productId: "product-1",
          name: "Chair",
          productSlug: "chair",
          image: "chair.jpg",
          price: 42.5,
          unitsSold: 4,
          grossRevenue: 170,
          netRevenue: 165.75,
        },
      ])
      .mockResolvedValueOnce([
        {
          variantId: "variant-1",
          productId: "product-1",
          productName: "Chair",
          variantSlug: "chair-natural",
          sku: "CHAIR-M",
          unitsSold: 4,
          grossRevenue: 170,
          netRevenue: 165.75,
        },
      ]);

    const result = await getSellerStoreAnalyticsData("owned-store", "all");

    expect(result).toMatchObject({
      storeId: "store-1",
      totalRevenue: 42.5,
      totalOrders: 2,
      totalCustomers: 2,
      commissionRevenue: 2.5,
      netSellerRevenue: 40,
      refundRate: 50,
      returnRate: 50,
      repeatCustomerRate: 50,
      reviewCount: 2,
      averageRating: 4.5,
    });
    expect(result.topProducts[0]).toMatchObject({
      id: "product-1",
      sales: 4,
      grossRevenue: 170,
      netRevenue: 165.75,
    });
    expect(result.topVariants[0]).toMatchObject({ id: "variant-1", unitsSold: 4 });
    expect(result.revenueTrend[0]).toMatchObject({ label: "Aug 2026", revenue: 42.5, orders: 2 });
    expect(result.stockRisk).toMatchObject({ totalUnits: 27, lowStockCount: 1, outOfStockCount: 0 });
    expect(dbMock.orderGroup.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 6,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
    );
    expect(dbMock.orderGroup.findMany).not.toHaveBeenCalledWith(
      expect.objectContaining({ include: expect.anything() }),
    );
    expect(dbMock.orderGroup.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          order: { paymentStatus: { in: ["Paid", "PartiallyRefunded"] } },
        }),
      }),
    );
  });

  it("uses database aggregates and bounded rows for admin analytics", async () => {
    dbMock.user.findUnique.mockResolvedValue({ id: "admin", role: "ADMIN" });
    dbMock.store.count
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(3);
    dbMock.user.count.mockResolvedValue(8);
    dbMock.orderGroup.count.mockResolvedValue(12);
    dbMock.orderGroup.aggregate.mockResolvedValue({ _sum: { total: 1250 } });
    dbMock.$queryRaw.mockResolvedValueOnce([
      { month: new Date("2026-08-01T00:00:00.000Z"), gmv: 1250, platformRevenue: 250, paidOrders: 12 },
    ]).mockResolvedValueOnce([
      { storeId: "store-1", name: "Owned Store", url: "owned-store", gmv: 1250, platformRevenue: 250, paidOrders: 12, refundedOrders: 2, completedReturns: 1, chargebacks: 1, settlementRiskCents: 3000, settlementRiskCount: 1 },
    ]);
    dbMock.sellerSettlement.aggregate.mockResolvedValue({ _sum: { commissionCents: 25000 } });
    dbMock.sellerSettlement.groupBy.mockResolvedValue([
      { status: "BLOCKED", _count: { _all: 1 }, _sum: { remainingPayableCents: 3000 } },
    ]);
    dbMock.returnRequest.count.mockResolvedValue(2);
    dbMock.payoutBatch.count.mockResolvedValue(1);
    dbMock.emailOutbox.groupBy.mockResolvedValue([
      { status: "PENDING", _count: { _all: 3 } },
      { status: "FAILED", _count: { _all: 1 } },
    ]);
    dbMock.emailOutbox.findFirst.mockResolvedValue({ createdAt: new Date("2026-08-20T00:00:00.000Z") });
    dbMock.paymentEvent.count.mockResolvedValue(9);
    dbMock.automationRun.findFirst.mockResolvedValue({ startedAt: new Date("2026-08-20T00:00:00.000Z"), status: "SUCCEEDED" });
    dbMock.automationRun.count.mockResolvedValue(1);
    dbMock.product.count.mockResolvedValue(14);
    dbMock.product.findFirst.mockResolvedValue({ updatedAt: new Date("2026-08-20T00:00:00.000Z") });
    dbMock.orderGroup.findMany.mockResolvedValue([
      {
        id: "recent-group",
        total: 125,
        status: "Delivered",
        createdAt: new Date("2026-08-20T00:00:00.000Z"),
        store: { name: "Owned Store" },
        order: {
          user: { name: "Buyer", email: "buyer@example.com", picture: null },
          shippingAddress: { firstName: "Buyer", lastName: "One" },
        },
      },
    ]);
    dbMock.category.findMany.mockResolvedValue([
      { name: "Home", _count: { products: 7 } },
    ]);

    const result = await getAdminAnalyticsData();

    expect(result).toMatchObject({
      totalRevenue: 1250,
      totalOrders: 12,
      totalStores: 4,
      activeStores: 3,
      totalUsers: 8,
      platformRevenue: 250,
      riskSignals: { completedReturns: 2, blockedSettlements: 1, settlementRiskCents: 3000 },
      operationalHealth: { pendingEmails: 3, failedEmails: 1, paymentWebhookEventsLast24Hours: 9, searchableProducts: 14 },
      categoryBreakdown: [{ name: "Home", value: 7 }],
    });
    expect(result.topStores).toEqual([expect.objectContaining({ name: "Owned Store", gmv: 1250, settlementRiskCents: 3000 })]);
    expect(dbMock.orderGroup.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 6,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
    );
    expect(dbMock.orderGroup.findMany).not.toHaveBeenCalledWith(
      expect.objectContaining({ include: expect.anything() }),
    );
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, dbMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  dbMock: {
    user: { findUnique: vi.fn(), count: vi.fn() },
    store: { findFirst: vi.fn(), count: vi.fn() },
    category: { findMany: vi.fn() },
    product: { count: vi.fn() },
    orderGroup: {
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    orderItem: { aggregate: vi.fn(), groupBy: vi.fn() },
    sellerSettlement: { aggregate: vi.fn() },
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
    expect(result.topProducts[0]).toMatchObject({ id: "product-1", sales: 4 });
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
      { month: new Date("2026-08-01T00:00:00.000Z"), revenue: 1250, orders: 12 },
    ]);
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
      categoryBreakdown: [{ name: "Home", value: 7 }],
    });
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

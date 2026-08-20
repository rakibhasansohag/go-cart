import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, dbMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  dbMock: {
    user: { findUnique: vi.fn() },
    store: { findFirst: vi.fn(), count: vi.fn() },
  },
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("@/lib/db", () => ({ db: dbMock }));

import { getSellerStoreAnalyticsData } from "./analytics";

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
});

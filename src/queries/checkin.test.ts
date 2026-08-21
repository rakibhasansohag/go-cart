import { beforeEach, describe, expect, it, vi } from "vitest";
import { CHECKIN_REWARDS } from "@/lib/checkin-constants";

const { authMock, findUniqueMock, findManyMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  findUniqueMock: vi.fn(),
  findManyMock: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: findUniqueMock },
    dailyCheckIn: { findMany: findManyMock },
  },
}));
vi.mock("@/lib/security/request-guards", () => ({
  requireAuthenticatedUser: vi.fn(),
}));

import { getDailyCheckInStatus } from "./checkin";

describe("Daily Check-In Reward Schedule & Anti-Abuse Logic", () => {
  beforeEach(() => {
    authMock.mockReset();
    findUniqueMock.mockReset();
    findManyMock.mockReset();
  });

  it("does not query or offer rewards for a signed-in user missing from the local database", async () => {
    authMock.mockResolvedValue({ userId: "not-provisioned" });
    findUniqueMock.mockResolvedValue(null);

    await expect(getDailyCheckInStatus()).resolves.toMatchObject({
      isAuthenticated: true,
      isEligible: false,
      hasClaimedToday: false,
      checkIns: [],
    });
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("does not offer rewards to a suspended account", async () => {
    authMock.mockResolvedValue({ userId: "suspended-user" });
    findUniqueMock.mockResolvedValue({ accountStatus: "SUSPENDED" });

    await expect(getDailyCheckInStatus()).resolves.toMatchObject({
      isAuthenticated: true,
      isEligible: false,
    });
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("defines 31 days in reward schedule", () => {
    expect(Object.keys(CHECKIN_REWARDS).length).toBe(31);
  });

  it("grants milestone coupons on Days 7, 14, 21, and 28", () => {
    expect(CHECKIN_REWARDS[7].couponDiscount).toBe(10);
    expect(CHECKIN_REWARDS[14].couponDiscount).toBe(12);
    expect(CHECKIN_REWARDS[21].couponDiscount).toBe(15);
    expect(CHECKIN_REWARDS[28].couponDiscount).toBe(20);
  });

  it("ensures non-milestone days only grant GoCoins", () => {
    expect(CHECKIN_REWARDS[1].couponDiscount).toBeUndefined();
    expect(CHECKIN_REWARDS[5].couponDiscount).toBeUndefined();
    expect(CHECKIN_REWARDS[30].couponDiscount).toBeUndefined();
  });

  it("generates unique personal coupon code prefixes for milestone days", () => {
    expect(CHECKIN_REWARDS[7].couponCodePrefix).toBe("STREAK7");
    expect(CHECKIN_REWARDS[14].couponCodePrefix).toBe("STREAK14");
    expect(CHECKIN_REWARDS[21].couponCodePrefix).toBe("STREAK21");
    expect(CHECKIN_REWARDS[28].couponCodePrefix).toBe("STREAK28");
  });
});

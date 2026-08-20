import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { guardMock, getUserLoyaltyAccountMock } = vi.hoisted(() => ({
  guardMock: vi.fn(),
  getUserLoyaltyAccountMock: vi.fn(),
}));

vi.mock("@/lib/security/request-guards", () => ({
  RequestGuardError: class RequestGuardError extends Error {
    constructor(public readonly status: 401 | 403, message: string) {
      super(message);
    }
  },
  requireAuthenticatedUser: guardMock,
}));
vi.mock("@/queries/loyalty", () => ({
  getUserLoyaltyAccount: getUserLoyaltyAccountMock,
}));

import { GET } from "./route";

describe("profile loyalty API route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("checks account access before reading loyalty activity", async () => {
    guardMock.mockResolvedValue({ id: "customer-1" });
    getUserLoyaltyAccountMock.mockResolvedValue({ balance: 25 });

    const response = await GET(
      new NextRequest("http://localhost/api/profile/loyalty?page=2&pageSize=25"),
    );

    expect(response.status).toBe(200);
    expect(getUserLoyaltyAccountMock).toHaveBeenCalledWith(2, 25);
  });
});

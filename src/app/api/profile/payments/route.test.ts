import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { guardMock, getUserPaymentsMock } = vi.hoisted(() => ({
  guardMock: vi.fn(),
  getUserPaymentsMock: vi.fn(),
}));

vi.mock("@/lib/security/request-guards", () => ({
  RequestGuardError: class RequestGuardError extends Error {
    constructor(public readonly status: 401 | 403, message: string) {
      super(message);
    }
  },
  requireAuthenticatedUser: guardMock,
}));
vi.mock("@/queries/profile", () => ({ getUserPayments: getUserPaymentsMock }));

import { GET } from "./route";

describe("profile payments API route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 for a suspended account before querying payments", async () => {
    const { RequestGuardError } = await import("@/lib/security/request-guards");
    guardMock.mockRejectedValue(new RequestGuardError(403, "This account is suspended."));

    const response = await GET(new NextRequest("http://localhost/api/profile/payments"));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "This account is suspended." });
    expect(getUserPaymentsMock).not.toHaveBeenCalled();
  });

  it("redacts unexpected payment query failures", async () => {
    guardMock.mockResolvedValue({ id: "customer-1" });
    getUserPaymentsMock.mockRejectedValue(new Error("connection password=secret"));

    const response = await GET(new NextRequest("http://localhost/api/profile/payments"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Unable to load payments." });
  });
});

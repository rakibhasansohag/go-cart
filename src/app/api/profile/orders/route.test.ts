import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { guardMock, getUserOrdersMock } = vi.hoisted(() => ({
  guardMock: vi.fn(),
  getUserOrdersMock: vi.fn(),
}));

vi.mock("@/lib/security/request-guards", () => ({
  RequestGuardError: class RequestGuardError extends Error {
    constructor(public readonly status: 401 | 403, message: string) {
      super(message);
    }
  },
  requireAuthenticatedUser: guardMock,
}));
vi.mock("@/queries/profile", () => ({ getUserOrders: getUserOrdersMock }));

import { GET } from "./route";

describe("profile orders API route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 before querying orders for an unauthenticated request", async () => {
    const { RequestGuardError } = await import("@/lib/security/request-guards");
    guardMock.mockRejectedValue(new RequestGuardError(401, "Authentication is required."));

    const response = await GET(new NextRequest("http://localhost/api/profile/orders"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentication is required." });
    expect(getUserOrdersMock).not.toHaveBeenCalled();
  });

  it("does not expose internal query errors", async () => {
    guardMock.mockResolvedValue({ id: "customer-1" });
    getUserOrdersMock.mockRejectedValue(new Error("database connection password=secret"));

    const response = await GET(new NextRequest("http://localhost/api/profile/orders"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Unable to load orders." });
  });
});

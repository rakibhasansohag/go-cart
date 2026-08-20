import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { guardMock, getUserReviewsMock } = vi.hoisted(() => ({
  guardMock: vi.fn(),
  getUserReviewsMock: vi.fn(),
}));

vi.mock("@/lib/security/request-guards", () => ({
  RequestGuardError: class RequestGuardError extends Error {
    constructor(public readonly status: 401 | 403, message: string) {
      super(message);
    }
  },
  requireAuthenticatedUser: guardMock,
}));
vi.mock("@/queries/profile", () => ({ getUserReviews: getUserReviewsMock }));

import { GET } from "./route";

describe("profile reviews API route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 before querying reviews for an unauthenticated request", async () => {
    const { RequestGuardError } = await import("@/lib/security/request-guards");
    guardMock.mockRejectedValue(new RequestGuardError(401, "Authentication is required."));

    const response = await GET(new NextRequest("http://localhost/api/profile/reviews"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentication is required." });
    expect(getUserReviewsMock).not.toHaveBeenCalled();
  });
});

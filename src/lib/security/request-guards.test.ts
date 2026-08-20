import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, findUniqueMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  findUniqueMock: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("@/lib/db", () => ({
  db: { user: { findUnique: findUniqueMock } },
}));

import {
  RequestGuardError,
  requireAuthenticatedRole,
  requireSameOriginMutation,
} from "./request-guards";

describe("request guards", () => {
  beforeEach(() => {
    authMock.mockReset();
    findUniqueMock.mockReset();
  });

  it("rejects missing and cross-origin browser mutations", () => {
    expect(() =>
      requireSameOriginMutation(
        new Request("https://gocart.example/api/test", { method: "POST" }),
      ),
    ).toThrow(RequestGuardError);
    expect(() =>
      requireSameOriginMutation(
        new Request("https://gocart.example/api/test", {
          method: "POST",
          headers: { origin: "https://attacker.example" },
        }),
      ),
    ).toThrow("Cross-origin mutations are not allowed.");
  });

  it("accepts a same-origin mutation", () => {
    expect(() =>
      requireSameOriginMutation(
        new Request("https://gocart.example/api/test", {
          method: "POST",
          headers: { origin: "https://gocart.example" },
        }),
      ),
    ).not.toThrow();
  });

  it("requires an authenticated database seller", async () => {
    authMock.mockResolvedValue({ userId: "seller-1" });
    findUniqueMock.mockResolvedValue({ id: "seller-1", role: "SELLER" });

    await expect(requireAuthenticatedRole(["SELLER"])).resolves.toEqual({
      id: "seller-1",
      role: "SELLER",
    });
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: "seller-1" },
      select: { id: true, role: true },
    });
  });

  it("rejects unauthenticated and non-seller callers", async () => {
    authMock.mockResolvedValue({ userId: null });
    await expect(requireAuthenticatedRole(["SELLER"])).rejects.toMatchObject({
      status: 401,
    });

    authMock.mockResolvedValue({ userId: "customer-1" });
    findUniqueMock.mockResolvedValue({ id: "customer-1", role: "USER" });
    await expect(requireAuthenticatedRole(["SELLER"])).rejects.toMatchObject({
      status: 403,
    });
  });
});

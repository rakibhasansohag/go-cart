import { beforeEach, describe, expect, it } from "vitest";

import {
  consumeRateLimit,
  consumeSharedRateLimit,
  enforceRateLimit,
  RateLimitError,
  RateLimitStoreError,
  resetRateLimitsForTests,
} from "./rate-limit";

describe("consumeRateLimit", () => {
  beforeEach(resetRateLimitsForTests);

  it("allows only the configured number of requests in a window", () => {
    expect(
      consumeRateLimit({
        key: "seller-1",
        limit: 2,
        windowMs: 10_000,
        now: 1_000,
      }),
    ).toMatchObject({
      allowed: true,
      remaining: 1,
    });
    expect(
      consumeRateLimit({
        key: "seller-1",
        limit: 2,
        windowMs: 10_000,
        now: 1_001,
      }),
    ).toMatchObject({
      allowed: true,
      remaining: 0,
    });
    expect(
      consumeRateLimit({
        key: "seller-1",
        limit: 2,
        windowMs: 10_000,
        now: 1_002,
      }),
    ).toMatchObject({
      allowed: false,
      retryAfterSeconds: 10,
    });
  });

  it("opens a new window after expiration", () => {
    consumeRateLimit({
      key: "seller-1",
      limit: 1,
      windowMs: 1_000,
      now: 1_000,
    });
    expect(
      consumeRateLimit({
        key: "seller-1",
        limit: 1,
        windowMs: 1_000,
        now: 2_000,
      }),
    ).toMatchObject({
      allowed: true,
      remaining: 0,
    });
  });

  it("turns a rejected request into a retryable action error", () => {
    enforceRateLimit({
      key: "seller-1",
      limit: 1,
      windowMs: 1_000,
      now: 1_000,
    });

    expect(() =>
      enforceRateLimit({
        key: "seller-1",
        limit: 1,
        windowMs: 1_000,
        now: 1_001,
      }),
    ).toThrow(RateLimitError);
  });
});

describe("consumeSharedRateLimit", () => {
  it("maps the atomically returned bucket count to a remaining quota", async () => {
    const result = await consumeSharedRateLimit(
      { key: "search:visitor", limit: 3, windowMs: 60_000, now: 1_000 },
      {
        $queryRaw: async () => [
          { count: 2, resetAt: new Date(61_000) },
        ],
      } as never,
    );

    expect(result).toEqual({
      allowed: true,
      remaining: 1,
      retryAfterSeconds: 0,
    });
  });

  it("rejects after the shared quota and reports the reset interval", async () => {
    const result = await consumeSharedRateLimit(
      { key: "search:visitor", limit: 3, windowMs: 60_000, now: 1_000 },
      {
        $queryRaw: async () => [
          { count: 4, resetAt: new Date(61_000) },
        ],
      } as never,
    );

    expect(result).toEqual({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 60,
    });
  });

  it("fails closed when the shared store cannot be reached", async () => {
    await expect(
      consumeSharedRateLimit(
        { key: "search:visitor", limit: 3, windowMs: 60_000 },
        { $queryRaw: async () => Promise.reject(new Error("offline")) } as never,
      ),
    ).rejects.toBeInstanceOf(RateLimitStoreError);
  });
});

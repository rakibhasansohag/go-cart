import { beforeEach, describe, expect, it } from "vitest";

import {
  consumeRateLimit,
  enforceRateLimit,
  RateLimitError,
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

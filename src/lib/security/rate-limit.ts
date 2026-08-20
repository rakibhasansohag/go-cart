import { db } from "@/lib/db";

export type RateLimitInput = {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
};

type RateLimitResult =
  | { allowed: true; remaining: number; retryAfterSeconds: 0 }
  | { allowed: false; remaining: 0; retryAfterSeconds: number };

type Bucket = { count: number; resetAt: number };

const MAX_BUCKETS = 10_000;
const buckets = new Map<string, Bucket>();

export class RateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("Too many requests. Please try again shortly.");
    this.name = "RateLimitError";
  }
}

export class RateLimitStoreError extends Error {
  constructor() {
    super("Rate limiting is temporarily unavailable. Please try again shortly.");
    this.name = "RateLimitStoreError";
  }
}

function trimBuckets(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }

  while (buckets.size >= MAX_BUCKETS) {
    const oldestKey = buckets.keys().next().value;
    if (!oldestKey) break;
    buckets.delete(oldestKey);
  }
}

/** A bounded process-local limiter used only by deterministic unit tests. */
export function consumeRateLimit({
  key,
  limit,
  windowMs,
  now = Date.now(),
}: RateLimitInput): RateLimitResult {
  if (!key || !Number.isInteger(limit) || limit < 1 || windowMs < 1) {
    throw new Error("Invalid rate-limit configuration.");
  }

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    trimBuckets(now);
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((existing.resetAt - now) / 1000),
      ),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: limit - existing.count,
    retryAfterSeconds: 0,
  };
}

export function enforceRateLimit(input: RateLimitInput) {
  const result = consumeRateLimit(input);
  if (!result.allowed) throw new RateLimitError(result.retryAfterSeconds);
  return result;
}

type SharedRateLimitClient = Pick<typeof db, "$queryRaw">;

type SharedRateLimitRow = {
  count: number;
  resetAt: Date;
};

/**
 * Atomically consumes a fixed-window quota in PostgreSQL. `INSERT .. ON
 * CONFLICT .. DO UPDATE .. RETURNING` serializes contenders for the same
 * bucket, so horizontally scaled application instances share one limit.
 */
export async function consumeSharedRateLimit(
  {
    key,
    limit,
    windowMs,
    now = Date.now(),
  }: RateLimitInput,
  client: SharedRateLimitClient = db,
): Promise<RateLimitResult> {
  if (!key || !Number.isInteger(limit) || limit < 1 || windowMs < 1) {
    throw new Error("Invalid rate-limit configuration.");
  }

  const currentAt = new Date(now);
  const resetAt = new Date(now + windowMs);

  let rows: SharedRateLimitRow[];
  try {
    rows = await client.$queryRaw<SharedRateLimitRow[]>`
      INSERT INTO "RateLimitBucket" ("key", "count", "resetAt", "createdAt", "updatedAt")
      VALUES (${key}, 1, ${resetAt}, ${currentAt}, ${currentAt})
      ON CONFLICT ("key") DO UPDATE
      SET
        "count" = CASE
          WHEN "RateLimitBucket"."resetAt" <= ${currentAt} THEN 1
          ELSE "RateLimitBucket"."count" + 1
        END,
        "resetAt" = CASE
          WHEN "RateLimitBucket"."resetAt" <= ${currentAt} THEN ${resetAt}
          ELSE "RateLimitBucket"."resetAt"
        END,
        "updatedAt" = ${currentAt}
      RETURNING "count", "resetAt"
    `;
  } catch {
    // These sensitive/expensive paths depend on PostgreSQL anyway. Failing
    // closed avoids silently disabling abuse controls during an outage.
    throw new RateLimitStoreError();
  }

  const bucket = rows[0];
  if (!bucket) throw new RateLimitStoreError();

  if (bucket.count <= limit) {
    return {
      allowed: true,
      remaining: Math.max(0, limit - bucket.count),
      retryAfterSeconds: 0,
    };
  }

  return {
    allowed: false,
    remaining: 0,
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((bucket.resetAt.getTime() - now) / 1_000),
    ),
  };
}

export async function enforceSharedRateLimit(input: RateLimitInput) {
  const result = await consumeSharedRateLimit(input);
  if (!result.allowed) throw new RateLimitError(result.retryAfterSeconds);
  return result;
}

export function resetRateLimitsForTests() {
  buckets.clear();
}

type RateLimitInput = {
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

/**
 * A bounded, process-local limiter for expensive route handlers. It provides
 * immediate protection in every deployment, while a shared store can replace
 * it later when traffic spans several server instances.
 */
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

export function resetRateLimitsForTests() {
  buckets.clear();
}

import { randomUUID } from "crypto";

import { db } from "../src/lib/db";
import { consumeSharedRateLimit } from "../src/lib/security/rate-limit";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const key = `e2e-rate-limit:${randomUUID()}`;
const now = Date.now();

try {
  const results = await Promise.all(
    Array.from({ length: 12 }, () =>
      consumeSharedRateLimit({ key, limit: 5, windowMs: 60_000, now }),
    ),
  );

  const allowed = results.filter((result) => result.allowed).length;
  const blocked = results.filter((result) => !result.allowed).length;
  assert(allowed === 5, `Expected 5 allowed requests, received ${allowed}.`);
  assert(blocked === 7, `Expected 7 limited requests, received ${blocked}.`);

  const reset = await consumeSharedRateLimit({
    key,
    limit: 1,
    windowMs: 60_000,
    now: now + 60_000,
  });
  assert(reset.allowed, "The shared quota did not reset at its window boundary.");

  console.log(
    "Shared PostgreSQL rate-limit check passed: 5 allowed, 7 limited, and deterministic reset verified.",
  );
} finally {
  await db.rateLimitBucket.deleteMany({ where: { key } });
  await db.$disconnect();
}

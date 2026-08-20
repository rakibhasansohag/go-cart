import { timingSafeEqual } from "node:crypto";

/**
 * Verifies the private bearer credential used by scheduled-job providers.
 * Keep this separate from browser authentication: cron calls have no session
 * and must fail closed when the deployment has no configured secret.
 */
export function isAuthorizedCronRequest(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!expected || !authorization?.startsWith("Bearer ")) return false;

  const suppliedBuffer = Buffer.from(authorization.slice("Bearer ".length));
  const expectedBuffer = Buffer.from(expected);
  return (
    suppliedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(suppliedBuffer, expectedBuffer)
  );
}

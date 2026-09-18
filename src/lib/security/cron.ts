import { timingSafeEqual } from "node:crypto";

/**
 * Verifies the private bearer credential used by scheduled-job providers.
 * Keep this separate from browser authentication: cron calls have no session
 * and must fail closed when the deployment has no configured secret.
 */
export function isAuthorizedCronRequest(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  let suppliedToken: string | null = null;

  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    suppliedToken = authorization.slice("Bearer ".length);
  } else {
    try {
      const url = new URL(request.url);
      suppliedToken = url.searchParams.get("key") || url.searchParams.get("token");
    } catch {
      suppliedToken = null;
    }
  }

  if (!suppliedToken) return false;

  const suppliedBuffer = Buffer.from(suppliedToken);
  const expectedBuffer = Buffer.from(expected);
  return (
    suppliedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(suppliedBuffer, expectedBuffer)
  );
}

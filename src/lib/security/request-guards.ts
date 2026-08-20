import { auth } from "@clerk/nextjs/server";

import { db } from "@/lib/db";

type ApplicationRole = "ADMIN" | "SELLER";

export class RequestGuardError extends Error {
  constructor(
    public readonly status: 401 | 403,
    message: string,
  ) {
    super(message);
    this.name = "RequestGuardError";
  }
}

/**
 * Reject browser mutations that do not originate from this deployment.
 * Route handlers receive the public request URL, so this remains portable
 * between localhost, preview deployments, and the production domain.
 */
export function requireSameOriginMutation(request: Request): void {
  const origin = request.headers.get("origin");
  const expectedOrigin = new URL(request.url).origin;

  if (!origin || origin !== expectedOrigin) {
    throw new RequestGuardError(403, "Cross-origin mutations are not allowed.");
  }
}

export async function requireAuthenticatedUser() {
  const { userId } = await auth();

  if (!userId) {
    throw new RequestGuardError(401, "Authentication is required.");
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, accountStatus: true },
  });

  if (!user) {
    throw new RequestGuardError(401, "Authentication is required.");
  }

  if (user.accountStatus === "SUSPENDED") {
    throw new RequestGuardError(403, "This account is suspended.");
  }

  return user;
}

export async function requireAuthenticatedRole(
  allowedRoles: readonly ApplicationRole[],
) {
  const user = await requireAuthenticatedUser();

  if (!allowedRoles.includes(user.role as ApplicationRole)) {
    throw new RequestGuardError(
      403,
      "You are not allowed to perform this action.",
    );
  }

  return user;
}

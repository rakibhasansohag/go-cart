import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { logEvent } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

/**
 * Deliberately small public probe for an external uptime monitor. It confirms
 * that this deployment can reach PostgreSQL but never exposes connection or
 * provider details to callers.
 */
export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: "ok" },
      { headers: { "x-request-id": requestId } },
    );
  } catch {
    logEvent("error", "health.database_unavailable", { requestId });
    return NextResponse.json(
      { status: "unavailable" },
      { status: 503, headers: { "x-request-id": requestId } },
    );
  }
}

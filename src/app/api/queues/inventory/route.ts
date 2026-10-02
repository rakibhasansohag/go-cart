import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Phase 26 is not active: the durable DB outbox and signed provider webhooks
// handle delivery today. Never acknowledge an unimplemented queue consumer.
export async function POST() {
  return NextResponse.json(
    { ok: false, error: "Queue consumer is not enabled. Use the existing outbox workflow." },
    { status: 503 },
  );
}

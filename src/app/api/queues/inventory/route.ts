import { NextResponse } from "next/server";
import { queueMessageEnvelopeSchema } from "@/lib/queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Inventory events queue consumer.
 *
 * Processes low-stock and restocked alerts asynchronously, decoupled
 * from the inventory adjustment transaction.
 *
 * Phase 26.6: Will send seller alerts and restock reminders.
 */
export async function POST(request: Request) {
	try {
		const raw = await request.json();
		const envelope = queueMessageEnvelopeSchema.parse(raw);

		// TODO (Phase 26.6): Process inventory alerts
		// await processInventoryAlert(envelope);

		console.log(
			`[queue:inventory] Processed ${envelope.eventType} — key=${envelope.eventKey}`,
		);

		return NextResponse.json({ ok: true, eventKey: envelope.eventKey });
	} catch (error) {
		console.error("[queue:inventory] Consumer error:", error);
		return NextResponse.json(
			{ ok: false, error: error instanceof Error ? error.message : "Unknown error" },
			{ status: 500 },
		);
	}
}

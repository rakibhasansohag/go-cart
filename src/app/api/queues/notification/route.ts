import { NextResponse } from "next/server";
import { queueMessageEnvelopeSchema } from "@/lib/queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Notification fan-out queue consumer.
 *
 * Processes in-app notifications asynchronously, decoupled from the
 * business transaction that produced the domain event.
 *
 * Phase 26.4: Will write to the `Notification` table and create
 * delivery audit records.
 */
export async function POST(request: Request) {
	try {
		const raw = await request.json();
		const envelope = queueMessageEnvelopeSchema.parse(raw);

		// TODO (Phase 26.4): Write notification + delivery audit to DB
		// await createNotification(envelope);

		console.log(
			`[queue:notification] Processed ${envelope.eventType} — key=${envelope.eventKey}`,
		);

		return NextResponse.json({ ok: true, eventKey: envelope.eventKey });
	} catch (error) {
		console.error("[queue:notification] Consumer error:", error);
		return NextResponse.json(
			{ ok: false, error: error instanceof Error ? error.message : "Unknown error" },
			{ status: 500 },
		);
	}
}

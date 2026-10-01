import { NextResponse } from "next/server";
import { queueMessageEnvelopeSchema } from "@/lib/queue";
import { dispatchEmailOutboxBatch } from "@/lib/email/outbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Email outbox queue consumer.
 *
 * Vercel Queues invokes this route automatically when messages are published
 * to the `email.outbox` topic. The route is private — only Vercel queue
 * infrastructure can call it (configured via `experimentalTriggers` in vercel.json).
 *
 * Phase 26.3: Dispatches emails associated with the source event immediately
 * via `dispatchEmailOutboxBatch({ sourceEventIds: [sourceEventId] })`.
 */
export async function POST(request: Request) {
	try {
		const raw: unknown = await request.json();
		const envelope = queueMessageEnvelopeSchema.parse(raw);

		const sourceEventId =
			typeof envelope.payload.sourceEventId === "string"
				? envelope.payload.sourceEventId
				: envelope.aggregateId;

		const result = await dispatchEmailOutboxBatch({
			sourceEventIds: [sourceEventId],
		});

		console.log(
			`[queue:email] Processed ${envelope.eventType} (${envelope.eventKey}): ` +
				`sent=${result.sent}, failed=${result.failed}, skipped=${result.skipped}`,
		);

		return NextResponse.json({
			ok: true,
			eventKey: envelope.eventKey,
			dispatched: result,
		});
	} catch (error: unknown) {
		console.error("[queue:email] Consumer error:", error);
		return NextResponse.json(
			{
				ok: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

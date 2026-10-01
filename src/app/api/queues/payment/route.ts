import { NextResponse } from "next/server";
import { queueMessageEnvelopeSchema } from "@/lib/queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Payment events queue consumer.
 *
 * Processes Stripe/PayPal webhook payloads asynchronously. The webhook
 * handler validates the signature and publishes the raw event here,
 * then returns 200 immediately to the payment provider.
 *
 * Phase 26.5: Will run payment reconciliation logic.
 */
export async function POST(request: Request) {
	try {
		const raw = await request.json();
		const envelope = queueMessageEnvelopeSchema.parse(raw);

		// TODO (Phase 26.5): Run payment reconciliation
		// await reconcilePaymentEvent(envelope);

		console.log(
			`[queue:payment] Processed ${envelope.eventType} — key=${envelope.eventKey}`,
		);

		return NextResponse.json({ ok: true, eventKey: envelope.eventKey });
	} catch (error) {
		console.error("[queue:payment] Consumer error:", error);
		return NextResponse.json(
			{ ok: false, error: error instanceof Error ? error.message : "Unknown error" },
			{ status: 500 },
		);
	}
}

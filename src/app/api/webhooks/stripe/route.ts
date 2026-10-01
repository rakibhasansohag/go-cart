import { NextResponse, after } from "next/server";
import { getStripeClient } from "@/lib/payments/stripe-client";
import { handleStripeEvent } from "@/lib/payments/stripe-events";
import { publishToQueue, QUEUE_TOPICS } from "@/lib/queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook is not configured." },
      { status: 500 },
    );
  }

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature." },
      { status: 400 },
    );
  }

  try {
    const rawBody = await request.text();
    const event = await getStripeClient().webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
    );
    const result = await handleStripeEvent(event);

    const afterTask = async () => {
      void publishToQueue({
        topic: QUEUE_TOPICS.PAYMENT_EVENTS,
        eventKey: `stripe:${event.id}`,
        eventType: `stripe.${event.type}`,
        aggregateType: "PAYMENT",
        aggregateId: event.id,
        payload: {
          eventId: event.id,
          type: event.type,
          created: event.created,
          livemode: event.livemode,
        },
      }).catch((queueError: unknown) => {
        console.warn("[queue] Stripe event publishing skipped:", queueError);
      });
      console.log(`[stripe:webhook] Event ${event.id} (${event.type}) processed successfully.`);
    };

    try {
      after(afterTask);
    } catch {
      void afterTask();
    }

    return NextResponse.json({
      received: true,
      duplicate: "duplicate" in result ? result.duplicate : false,
      ignored: "ignored" in result ? result.ignored : false,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Stripe webhook failed.";
    console.error("Stripe webhook processing failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/payments/stripe-client";
import { handleStripeEvent } from "@/lib/payments/stripe-events";

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

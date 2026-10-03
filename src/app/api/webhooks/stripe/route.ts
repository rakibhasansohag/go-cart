import { NextResponse, after } from "next/server";
import { getStripeClient } from "@/lib/payments/stripe-client";
import { handleStripeEvent } from "@/lib/payments/stripe-events";
import { queuesEnabled } from '@/lib/queue/config';
import { persistVerifiedPayment } from '@/lib/queue/payment-inbox';

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

  let verified = false;
  try {
    const rawBody = await request.text();
    const event = await getStripeClient().webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
    );
    verified = true;
    if (queuesEnabled()) {
      const job = await persistVerifiedPayment('Stripe', event);
      return NextResponse.json({ received: true, accepted: true, jobId: job.id });
    }
    const result = await handleStripeEvent(event);

    const afterTask = async () => {
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
    console.error("Stripe webhook processing failed:", error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ error: verified ? 'Webhook processing temporarily unavailable.' : message }, { status: verified ? 503 : 400 });
  }
}

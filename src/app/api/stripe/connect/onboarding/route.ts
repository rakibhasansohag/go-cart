import { NextResponse } from "next/server";

import {
  ConnectRequestError,
  getOrCreateStripeOnboardingLink,
} from "@/lib/payments/connect";
import {
  requireSameOriginMutation,
  RequestGuardError,
} from "@/lib/security/request-guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    requireSameOriginMutation(request);
    const body = (await request.json()) as { storeUrl?: unknown };
    const storeUrl = typeof body.storeUrl === "string" ? body.storeUrl : "";
    return NextResponse.json(
      await getOrCreateStripeOnboardingLink(request, storeUrl),
    );
  } catch (error) {
    const status =
      error instanceof ConnectRequestError
        ? error.status
        : error instanceof RequestGuardError
          ? error.status
          : 500;
    const message =
      error instanceof Error
        ? error.message
        : "Unable to start Stripe onboarding.";
    if (status === 500)
      console.error("Stripe Connect onboarding failed:", message);
    return NextResponse.json({ error: message }, { status });
  }
}

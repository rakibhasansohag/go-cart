import { createHash, createHmac, randomUUID } from "node:crypto";
import {
  PaymentAccountStatus,
  SettlementLedgerEntryType,
  SettlementStatus,
} from "@prisma/client";
import type Stripe from "stripe";

import { db } from "../src/lib/db";
import { getStripeClient } from "../src/lib/payments/stripe-client";
import {
  createSettlementForOrderGroup,
  refreshEligibleSettlements,
  updatePlatformSettings,
} from "../src/lib/settlement/service";

function fixtureId(kind: string, index: number) {
  const hex = createHash("sha256")
    .update(`gocart-demo:${kind}:${index}`)
    .digest("hex")
    .slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function currentPayoutBatchKey() {
  const weekEnd = new Date();
  weekEnd.setUTCHours(23, 59, 59, 999);
  const weekStart = new Date(weekEnd);
  weekStart.setUTCDate(weekStart.getUTCDate() - 6);
  weekStart.setUTCHours(0, 0, 0, 0);
  return `payout-batch:Asia/Dhaka:${weekStart.toISOString().slice(0, 10)}`;
}

async function resolveConnectedAccountId(stripe: Stripe) {
  const configured = process.env.E2E_STRIPE_CONNECTED_ACCOUNT_ID?.trim();
  if (configured) return configured;
  const accounts = await stripe.accounts.list({ limit: 100 });
  const account = accounts.data.find(
    (candidate) =>
      !candidate.deleted &&
      candidate.country === "US" &&
      candidate.capabilities?.transfers === "active",
  );
  assert(
    account,
    "No active US Stripe test connected account was found. Set E2E_STRIPE_CONNECTED_ACCOUNT_ID for this isolated test.",
  );
  return account.id;
}

async function getFixture() {
  const group = await db.orderGroup.findUnique({
    where: { id: fixtureId("group", 5) },
    include: {
      store: { select: { userId: true } },
      order: { include: { paymentDetails: true } },
    },
  });
  assert(
    group?.order.paymentDetails,
    "The deterministic delivered payout fixture is missing payment details.",
  );
  return { group, paymentDetails: group.order.paymentDetails };
}

async function createSourceCharge(stripe: Stripe, groupId: string) {
  const { group, paymentDetails } = await getFixture();
  assert(group.id === groupId, "Unexpected payout fixture group.");
  const intent = await stripe.paymentIntents.create(
    {
      amount: Math.round(group.order.total * 100),
      currency: "usd",
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      payment_method: "pm_card_visa",
      confirm: true,
      metadata: {
        orderId: group.order.id,
        e2ePurpose: "browser-seller-payout",
      },
      description: "GoCart isolated browser seller payout source payment",
    },
    {
      idempotencyKey: `gocart-e2e-browser-payout-source:${group.id}:${randomUUID()}`,
    },
  );
  assert(
    intent.status === "succeeded",
    `Stripe test source payment did not succeed: ${intent.status}.`,
  );
  const expanded = await stripe.paymentIntents.retrieve(intent.id, {
    expand: ["latest_charge"],
  });
  const chargeId =
    typeof expanded.latest_charge === "string"
      ? expanded.latest_charge
      : expanded.latest_charge?.id;
  assert(chargeId, "Stripe test source payment did not expose a charge.");
  await db.paymentDetails.update({
    where: { id: paymentDetails.id },
    data: {
      paymentInetntId: intent.id,
      providerCaptureId: chargeId,
      paymentMethod: "Stripe",
      status: intent.status,
    },
  });
  return chargeId;
}

function webhookEvent(id: string, transfer: Stripe.Transfer): Stripe.Event {
  return {
    id,
    object: "event",
    api_version: "2026-07-29.dahlia",
    created: Math.floor(Date.now() / 1000),
    data: { object: transfer },
    livemode: false,
    pending_webhooks: 0,
    request: null,
    type: "transfer.created",
  } as unknown as Stripe.Event;
}

async function deliverSignedEventOverHttp(event: Stripe.Event) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  assert(
    webhookSecret,
    "STRIPE_WEBHOOK_SECRET is required for the signed webhook HTTP check.",
  );
  const baseUrl =
    process.env.PLAYWRIGHT_BASE_URL ??
    `http://127.0.0.1:${process.env.E2E_PORT ?? "3100"}`;
  const url = new URL("/api/webhooks/stripe", baseUrl);
  assert(
    ["127.0.0.1", "localhost"].includes(url.hostname),
    "The browser payout webhook test only permits the isolated local server.",
  );
  const payload = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1_000);
  const signature = createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": `t=${timestamp},v1=${signature}`,
    },
    body: payload,
  });
  const body = (await response.json()) as {
    error?: string;
    duplicate?: boolean;
    ignored?: boolean;
  };
  assert(
    response.ok,
    `Signed Stripe webhook HTTP delivery returned ${response.status}: ${body.error ?? "unknown error"}.`,
  );
  return body;
}

async function setup() {
  if (process.env.E2E_BROWSER_PAYOUT !== "true")
    throw new Error(
      "Set E2E_BROWSER_PAYOUT=true to run the browser seller payout test.",
    );
  if (process.env.E2E_PROVIDER_MODE !== "sandbox")
    throw new Error(
      "The browser seller payout test requires E2E_PROVIDER_MODE=sandbox.",
    );

  const sellerEmail = process.env.E2E_SELLER_EMAIL;
  const adminEmail = process.env.E2E_ADMIN_EMAIL;
  assert(
    sellerEmail && adminEmail,
    "E2E seller and admin emails are required.",
  );
  const [seller, admin] = await Promise.all([
    db.user.findUnique({
      where: { email: sellerEmail },
      select: { id: true, role: true },
    }),
    db.user.findUnique({
      where: { email: adminEmail },
      select: { id: true, role: true },
    }),
  ]);
  assert(
    seller?.role === "SELLER" && admin?.role === "ADMIN",
    "Seeded E2E seller and admin accounts are required.",
  );

  const stripe = getStripeClient();
  const connectedAccountId = await resolveConnectedAccountId(stripe);
  const { group } = await getFixture();
  assert(
    group.store.userId === seller.id,
    "The payout fixture does not belong to the seeded seller.",
  );

  await db.sellerSettlement.deleteMany({ where: { orderGroupId: group.id } });
  await db.payoutBatch.deleteMany({
    where: { idempotencyKey: currentPayoutBatchKey() },
  });
  await updatePlatformSettings(
    { commissionPercent: 2, payoutHoldDays: 0 },
    admin.id,
  );
  await db.sellerPaymentAccount.upsert({
    where: { userId: seller.id },
    create: {
      userId: seller.id,
      providerAccountId: connectedAccountId,
      status: PaymentAccountStatus.ACTIVE,
      country: "US",
      transfersCapability: "active",
      detailsSubmitted: true,
    },
    update: {
      providerAccountId: connectedAccountId,
      status: PaymentAccountStatus.ACTIVE,
      country: "US",
      transfersCapability: "active",
      detailsSubmitted: true,
    },
  });

  await createSourceCharge(stripe, group.id);
  const settlement = await createSettlementForOrderGroup(group.id);
  assert(
    settlement.status === SettlementStatus.HELD,
    "The delivered seller settlement was not held before eligibility refresh.",
  );
  await refreshEligibleSettlements();
  const eligible = await db.sellerSettlement.findUniqueOrThrow({
    where: { id: settlement.id },
    select: { status: true },
  });
  assert(
    eligible.status === SettlementStatus.ELIGIBLE,
    "The browser payout fixture did not become eligible in the isolated zero-day window.",
  );
  console.log(
    `Prepared browser seller payout fixture for order group ${group.id.slice(0, 8)}.`,
  );
}

async function verify() {
  const stripe = getStripeClient();
  const { group, paymentDetails } = await getFixture();
  const settlement = await db.sellerSettlement.findUnique({
    where: { orderGroupId: group.id },
    include: { payoutBatch: true },
  });
  assert(
    settlement?.status === SettlementStatus.RELEASED &&
      settlement.providerTransferId &&
      settlement.payoutBatch?.status === "PAID",
    "The browser did not create a paid Stripe payout batch and release the seller settlement.",
  );
  assert(
    settlement.remainingPayableCents === 0 && settlement.releasedAt,
    "The browser payout did not clear the seller balance.",
  );
  const transfer = await stripe.transfers.retrieve(
    settlement.providerTransferId,
  );
  assert(
    transfer.destination ===
      (
        await db.sellerPaymentAccount.findUniqueOrThrow({
          where: { userId: settlement.sellerId },
          select: { providerAccountId: true },
        })
      ).providerAccountId,
    "The Stripe transfer destination does not match the prepared seller account.",
  );
  assert(
    transfer.amount === settlement.sellerPayableCents,
    "The Stripe transfer amount does not match seller payable.",
  );
  const intent = await stripe.paymentIntents.retrieve(
    paymentDetails.paymentInetntId,
    { expand: ["latest_charge"] },
  );
  const sourceCharge =
    typeof intent.latest_charge === "string"
      ? intent.latest_charge
      : intent.latest_charge?.id;
  assert(
    sourceCharge && transfer.source_transaction === sourceCharge,
    "The Stripe transfer is not tied to the seller order source charge.",
  );

  const eventId = `gocart-e2e-browser-transfer-created:${randomUUID()}`;
  const first = await deliverSignedEventOverHttp(
    webhookEvent(eventId, transfer),
  );
  const replay = await deliverSignedEventOverHttp(
    webhookEvent(eventId, transfer),
  );
  assert(
    first.ignored !== true && first.duplicate === false,
    "The signed Stripe transfer event was not reconciled over HTTP.",
  );
  assert(
    replay.ignored !== true,
    "The signed Stripe transfer replay was not accepted over HTTP.",
  );
  assert(
    (await db.settlementLedgerEntry.count({
      where: {
        settlementId: settlement.id,
        entryType: SettlementLedgerEntryType.PAYOUT,
      },
    })) === 1,
    "The signed transfer-event replay created a duplicate payout ledger entry.",
  );
  console.log(
    `Browser payout verified: ${transfer.id}, signed HTTP webhook delivery, seller ledger release, and replay-safe payout accounting.`,
  );
}

async function cleanup() {
  const stripe = getStripeClient();
  const groupId = fixtureId("group", 5);
  const settlement = await db.sellerSettlement.findUnique({
    where: { orderGroupId: groupId },
    select: { providerTransferId: true },
  });
  if (settlement?.providerTransferId) {
    try {
      await stripe.transfers.createReversal(
        settlement.providerTransferId,
        {},
        {
          idempotencyKey: `gocart-e2e-browser-payout-reversal:${settlement.providerTransferId}`,
        },
      );
    } catch (error) {
      console.error(
        "Stripe browser payout cleanup reversal failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }
  await db.sellerPaymentAccountEvent.deleteMany({
    where: {
      providerEventId: { startsWith: "gocart-e2e-browser-transfer-created:" },
    },
  });
  await db.sellerSettlement.deleteMany({ where: { orderGroupId: groupId } });
  await db.payoutBatch.deleteMany({
    where: { idempotencyKey: currentPayoutBatchKey() },
  });
}

const action = process.argv[2];
const task =
  action === "setup"
    ? setup
    : action === "verify"
      ? verify
      : action === "cleanup"
        ? cleanup
        : null;
if (!task) throw new Error("Use setup, verify, or cleanup.");

task()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

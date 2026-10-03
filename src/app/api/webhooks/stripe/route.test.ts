import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { constructEventAsyncMock, getStripeClientMock, handleStripeEventMock } =
  vi.hoisted(() => ({
    constructEventAsyncMock: vi.fn(),
    getStripeClientMock: vi.fn(),
    handleStripeEventMock: vi.fn(),
  }));

vi.mock("@/lib/payments/stripe-client", () => ({
  getStripeClient: getStripeClientMock,
}));

vi.mock("@/lib/payments/stripe-events", () => ({
  handleStripeEvent: handleStripeEventMock,
}));
const { persist } = vi.hoisted(() => ({ persist: vi.fn() }));
vi.mock('@/lib/queue/payment-inbox', () => ({ persistVerifiedPayment: persist }));
afterEach(() => vi.unstubAllEnvs());

import { POST } from "./route";

describe("Stripe webhook route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('PHASE26_ENABLED', 'false');
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    getStripeClientMock.mockReturnValue({
      webhooks: { constructEventAsync: constructEventAsyncMock },
    });
  });

  it('acknowledges verified queued events only after durable storage', async () => {
    vi.stubEnv('PHASE26_ENABLED', 'true');
    const event = { id: 'evt_queue', type: 'payment_intent.succeeded' };
    constructEventAsyncMock.mockResolvedValue(event);
    persist.mockResolvedValue({ id: 'job-id' });
    const response = await POST(new Request('http://localhost/api/webhooks/stripe', { method: 'POST', headers: { 'stripe-signature': 'valid' }, body: '{}' }));
    expect(response.status).toBe(200);
    expect(persist).toHaveBeenCalledWith('Stripe', event);
    expect(handleStripeEventMock).not.toHaveBeenCalled();
    expect(await response.json()).toMatchObject({ accepted: true, jobId: 'job-id' });
  });

  it('asks the provider to retry when verified event storage fails', async () => {
    vi.stubEnv('PHASE26_ENABLED', 'true');
    constructEventAsyncMock.mockResolvedValue({ id: 'evt_queue' });
    persist.mockRejectedValue(new Error('private database connection'));
    const response = await POST(new Request('http://localhost/api/webhooks/stripe', { method: 'POST', headers: { 'stripe-signature': 'valid' }, body: '{}' }));
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain('private database');
  });

  it("rejects an unconfigured webhook", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const response = await POST(
      new Request("http://localhost/api/webhooks/stripe", { method: "POST" }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Stripe webhook is not configured.",
    });
  });

  it("rejects a request without a Stripe signature", async () => {
    const response = await POST(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: "{}",
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Missing Stripe signature.",
    });
    expect(constructEventAsyncMock).not.toHaveBeenCalled();
  });

  it("returns a client error when Stripe signature verification fails", async () => {
    constructEventAsyncMock.mockImplementation(() => {
      throw new Error(
        "No signatures found matching the expected signature for payload",
      );
    });

    const response = await POST(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "invalid" },
        body: '{"id":"evt_test"}',
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "No signatures found matching the expected signature for payload",
    });
    expect(handleStripeEventMock).not.toHaveBeenCalled();
  });

  it("passes the raw body to Stripe and reports duplicate events", async () => {
    const event = { id: "evt_test", type: "payment_intent.succeeded" };
    const rawBody = '{"id":"evt_test"}';
    constructEventAsyncMock.mockResolvedValue(event);
    handleStripeEventMock.mockResolvedValue({ duplicate: true });

    const response = await POST(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "valid" },
        body: rawBody,
      }),
    );

    expect(constructEventAsyncMock).toHaveBeenCalledWith(
      rawBody,
      "valid",
      "whsec_test",
    );
    expect(handleStripeEventMock).toHaveBeenCalledWith(event);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      received: true,
      duplicate: true,
      ignored: false,
    });
  });
});

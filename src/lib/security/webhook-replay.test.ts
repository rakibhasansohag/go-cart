import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'node:crypto';

const harness = vi.hoisted(() => ({
	recordShipmentTrackingEvent: vi.fn(),
	handleStripeEvent: vi.fn(),
	constructEventAsync: vi.fn(),
	handlePayPalEvent: vi.fn(),
	verifyPayPalWebhook: vi.fn(),
	db: {
		$transaction: vi.fn((cb: (tx: unknown) => unknown) =>
			cb({
				shipment: {
					findFirst: vi.fn().mockResolvedValue({ id: 'ship-123' }),
				},
			}),
		),
	},
}));

vi.mock('@/lib/shipments/operations', () => ({
	recordShipmentTrackingEvent: harness.recordShipmentTrackingEvent,
}));

vi.mock('@/lib/payments/stripe-client', () => ({
	getStripeClient: () => ({
		webhooks: {
			constructEventAsync: harness.constructEventAsync,
		},
	}),
}));

vi.mock('@/lib/payments/stripe-events', () => ({
	handleStripeEvent: harness.handleStripeEvent,
}));

vi.mock('@/lib/payments/paypal-events', () => ({
	handlePayPalEvent: harness.handlePayPalEvent,
	verifyPayPalWebhook: harness.verifyPayPalWebhook,
}));

vi.mock('@/lib/db', () => ({
	db: harness.db,
}));

import { POST as handleCarrierWebhook } from '@/app/api/webhooks/carrier/route';
import { POST as handleStripeWebhook } from '@/app/api/webhooks/stripe/route';
import { POST as handlePayPalWebhook } from '@/app/api/webhooks/paypal/route';

describe('Webhook Signature Verification & Idempotency Replay Protection', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		vi.clearAllMocks();
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	describe('Carrier Webhook Security', () => {
		const secret = 'carrier-secret-key-123';

		beforeEach(() => {
			process.env.CARRIER_WEBHOOK_SECRET = secret;
		});

		it('rejects requests with status 503 when secret is not configured', async () => {
			delete process.env.CARRIER_WEBHOOK_SECRET;

			const req = new Request('http://localhost:3000/api/webhooks/carrier', {
				method: 'POST',
				body: JSON.stringify({ eventId: 'evt-123' }),
			});

			const res = await handleCarrierWebhook(req);
			expect(res.status).toBe(503);
			const data = (await res.json()) as { error: string };
			expect(data.error).toContain('not configured');
		});

		it('rejects requests with missing or invalid signature with status 401', async () => {
			const body = JSON.stringify({
				shipmentId: 'ship-123',
				eventId: 'evt-valid-length-1',
				status: 'IN_TRANSIT',
			});

			const reqNoSig = new Request('http://localhost:3000/api/webhooks/carrier', {
				method: 'POST',
				body,
			});
			const resNoSig = await handleCarrierWebhook(reqNoSig);
			expect(resNoSig.status).toBe(401);

			const reqBadSig = new Request('http://localhost:3000/api/webhooks/carrier', {
				method: 'POST',
				headers: { 'x-carrier-signature': 'sha256=invalidhexsignature00000000000000000000000000000000000000000000' },
				body,
			});
			const resBadSig = await handleCarrierWebhook(reqBadSig);
			expect(resBadSig.status).toBe(401);
		});

		it('verifies valid HMAC signature and processes tracking event', async () => {
			const payload = {
				shipmentId: 'ship-123',
				eventId: 'evt-valid-id-1',
				status: 'IN_TRANSIT',
			};
			const rawBody = JSON.stringify(payload);
			const signature = createHmac('sha256', secret).update(rawBody).digest('hex');

			harness.recordShipmentTrackingEvent.mockResolvedValueOnce({
				duplicate: false,
				trackingEventId: 'track-evt-1',
			});

			const req = new Request('http://localhost:3000/api/webhooks/carrier', {
				method: 'POST',
				headers: { 'x-carrier-signature': `sha256=${signature}` },
				body: rawBody,
			});

			const res = await handleCarrierWebhook(req);
			expect(res.status).toBe(200);
			const data = (await res.json()) as { ok: boolean; duplicate: boolean };
			expect(data.ok).toBe(true);
			expect(data.duplicate).toBe(false);
		});

		it('safely handles duplicate replayed carrier event idempotently', async () => {
			const payload = {
				shipmentId: 'ship-123',
				eventId: 'evt-valid-id-1',
				status: 'IN_TRANSIT',
			};
			const rawBody = JSON.stringify(payload);
			const signature = createHmac('sha256', secret).update(rawBody).digest('hex');

			harness.recordShipmentTrackingEvent.mockResolvedValueOnce({
				duplicate: true,
				trackingEventId: 'track-evt-1',
			});

			const req = new Request('http://localhost:3000/api/webhooks/carrier', {
				method: 'POST',
				headers: { 'x-carrier-signature': `sha256=${signature}` },
				body: rawBody,
			});

			const res = await handleCarrierWebhook(req);
			expect(res.status).toBe(200);
			const data = (await res.json()) as { ok: boolean; duplicate: boolean };
			expect(data.ok).toBe(true);
			expect(data.duplicate).toBe(true);
		});
	});

	describe('Stripe Webhook Security & Idempotency', () => {
		beforeEach(() => {
			process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
		});

		it('rejects requests with missing stripe-signature header', async () => {
			const req = new Request('http://localhost:3000/api/webhooks/stripe', {
				method: 'POST',
				body: JSON.stringify({ id: 'evt_stripe_1' }),
			});

			const res = await handleStripeWebhook(req);
			expect(res.status).toBe(400);
			const data = (await res.json()) as { error: string };
			expect(data.error).toContain('Missing Stripe signature');
		});

		it('rejects invalid signature payload when Stripe SDK verification throws', async () => {
			harness.constructEventAsync.mockRejectedValueOnce(
				new Error('No signatures found matching the expected signature for payload'),
			);

			const req = new Request('http://localhost:3000/api/webhooks/stripe', {
				method: 'POST',
				headers: { 'stripe-signature': 't=123,v1=bad_sig' },
				body: JSON.stringify({ id: 'evt_bad_sig' }),
			});

			const res = await handleStripeWebhook(req);
			expect(res.status).toBe(400);
			const data = (await res.json()) as { error: string };
			expect(data.error).toContain('No signatures found');
		});

		it('suppresses and acknowledges duplicate Stripe events idempotently', async () => {
			harness.constructEventAsync.mockResolvedValueOnce({
				id: 'evt_duplicate_1',
				type: 'payment_intent.succeeded',
			});
			harness.handleStripeEvent.mockResolvedValueOnce({
				received: true,
				duplicate: true,
			});

			const req = new Request('http://localhost:3000/api/webhooks/stripe', {
				method: 'POST',
				headers: { 'stripe-signature': 't=123,v1=valid_sig' },
				body: JSON.stringify({ id: 'evt_duplicate_1' }),
			});

			const res = await handleStripeWebhook(req);
			expect(res.status).toBe(200);
			const data = (await res.json()) as { received: boolean; duplicate: boolean };
			expect(data.received).toBe(true);
			expect(data.duplicate).toBe(true);
		});
	});

	describe('PayPal Webhook Security & Idempotency', () => {
		it('rejects payload when PayPal signature verification fails', async () => {
			harness.verifyPayPalWebhook.mockRejectedValueOnce(
				new Error('PayPal webhook signature is invalid.'),
			);

			const req = new Request('http://localhost:3000/api/webhooks/paypal', {
				method: 'POST',
				body: JSON.stringify({ id: 'WH-INVALID-1', event_type: 'PAYMENT.CAPTURE.COMPLETED' }),
			});

			const res = await handlePayPalWebhook(req);
			expect(res.status).toBe(400);
			const data = (await res.json()) as { error: string };
			expect(data.error).toContain('signature is invalid');
		});

		it('acknowledges duplicate PayPal events without re-executing side effects', async () => {
			harness.verifyPayPalWebhook.mockResolvedValueOnce(undefined);
			harness.handlePayPalEvent.mockResolvedValueOnce({
				received: true,
				duplicate: true,
			});

			const req = new Request('http://localhost:3000/api/webhooks/paypal', {
				method: 'POST',
				body: JSON.stringify({ id: 'WH-DUPLICATE-1', event_type: 'PAYMENT.CAPTURE.COMPLETED' }),
			});

			const res = await handlePayPalWebhook(req);
			expect(res.status).toBe(200);
			const data = (await res.json()) as { received: boolean; duplicate: boolean };
			expect(data.received).toBe(true);
			expect(data.duplicate).toBe(true);
		});
	});
});

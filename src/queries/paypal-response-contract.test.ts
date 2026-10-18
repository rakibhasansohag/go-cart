import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ ownedOrder: vi.fn(), reconcile: vi.fn() }));
vi.mock('@/lib/payments/security', () => ({ requireOwnedOrder: h.ownedOrder, assertPaymentAmount: vi.fn() }));
vi.mock('@/lib/payments/reconcile', () => ({ reconcilePaymentEvent: h.reconcile }));
vi.mock('@/lib/security/rate-limit', () => ({ enforceSharedRateLimit: vi.fn() }));
import { createPayPalPayment, capturePayPalPayment } from './paypal';

const unit = { custom_id: 'local-order', invoice_id: 'local-order', amount: { value: '25.00', currency_code: 'USD' } };
const local = { id: 'local-order', userId: 'customer', total: 25, updatedAt: new Date('2026-10-18T00:00:00Z'), paymentDetails: null };

beforeEach(() => {
	vi.stubEnv('PAYPAL_CLIENT_ID', 'sandbox-client');
	vi.stubEnv('PAYPAL_SECRET', 'sandbox-secret');
	vi.stubEnv('PAYPAL_API_BASE_URL', 'https://api-m.sandbox.paypal.com');
	h.ownedOrder.mockResolvedValue(local);
	h.reconcile.mockResolvedValue({ order: { id: local.id, paymentStatus: 'Paid' } });
	vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
		const url = String(input);
		if (url.endsWith('/oauth2/token')) return Response.json({ access_token: 'test-access' });
		const captured = url.endsWith('/capture');
		const minimal = { id: 'provider-order', status: captured ? 'COMPLETED' : 'CREATED' };
		// Model PayPal's default minimal writes; GET always returns the resource.
		const full = !init?.method || new Headers(init.headers).get('Prefer') === 'return=representation';
		return Response.json(full ? { ...minimal, purchase_units: [{ ...unit, ...(captured ? { payments: { captures: [{ id: 'capture-id', status: 'COMPLETED', amount: unit.amount }] } } : {}) }] } : minimal);
	}));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.clearAllMocks(); });

it('creates and verifies an order against the provider representation instead of its minimal response', async () => {
	await expect(createPayPalPayment(local.id)).resolves.toEqual({ id: 'provider-order', status: 'CREATED' });
	expect(h.reconcile).toHaveBeenCalledWith(expect.objectContaining({ providerPaymentId: 'provider-order', amount: 25, verifyOrderAmount: true }));
});

it('captures and verifies the complete amount and capture reference', async () => {
	h.ownedOrder.mockResolvedValue({ ...local, paymentDetails: { paymentMethod: 'Paypal', paymentInetntId: 'provider-order' } });
	await expect(capturePayPalPayment(local.id, 'provider-order')).resolves.toEqual({ id: local.id, paymentStatus: 'Paid' });
	expect(h.reconcile).toHaveBeenCalledWith(expect.objectContaining({ providerCaptureId: 'capture-id', paymentStatus: 'Paid', amount: 25 }));
});

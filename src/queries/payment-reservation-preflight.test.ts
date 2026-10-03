import { afterEach, expect, it, vi } from 'vitest';
const h = vi.hoisted(() => ({ ownedOrder: vi.fn() }));
vi.mock('@/lib/payments/security', () => ({ requireOwnedOrder: h.ownedOrder, assertPaymentAmount: vi.fn() }));
vi.mock('@/lib/payments/reconcile', () => ({ reconcilePaymentEvent: vi.fn() }));
vi.mock('@/lib/security/rate-limit', () => ({ enforceSharedRateLimit: vi.fn() }));
import { createPayPalPayment, capturePayPalPayment } from './paypal';

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
it('rejects missing PayPal configuration before reserving a coupon or contacting the provider', async () => {
  vi.stubEnv('PAYPAL_SECRET', '');
  await expect(createPayPalPayment('order')).rejects.toThrow('credentials are not configured');
  await expect(capturePayPalPayment('order', 'provider-order')).rejects.toThrow('credentials are not configured');
  expect(h.ownedOrder).not.toHaveBeenCalled();
});

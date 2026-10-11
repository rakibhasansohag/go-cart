import { beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { product: { findUnique: harness.findUnique } } }));
vi.mock('@clerk/nextjs/server', () => ({ currentUser: vi.fn(), auth: vi.fn() }));
import { retrieveProductDetailsOptimized } from './product-optimized';

describe('missing product handling', () => {
	beforeEach(() => { harness.findUnique.mockReset(); });
	it('uses the Next.js 404 boundary for missing products', async () => {
		harness.findUnique.mockResolvedValue(null);
		await expect(retrieveProductDetailsOptimized('missing-product')).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
	});
	it('does not conceal a database outage as a missing product', async () => {
		harness.findUnique.mockRejectedValue(new Error('Database unavailable'));
		await expect(retrieveProductDetailsOptimized('existing-product')).rejects.toThrow('Database unavailable');
	});
});

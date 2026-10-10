import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ products: vi.fn(), stores: vi.fn(), categories: vi.fn(), subCategories: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: {
	product: { findMany: mocks.products }, store: { findMany: mocks.stores },
	category: { findMany: mocks.categories }, subCategory: { findMany: mocks.subCategories },
} }));
import sitemap from './sitemap';

describe('public sitemap', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.products.mockResolvedValue([{ slug: 'demo product', updatedAt: new Date('2026-10-01') }]);
		mocks.stores.mockResolvedValue([]);
		mocks.categories.mockResolvedValue([{ url: 'home & living', updatedAt: new Date('2026-10-01') }]);
		mocks.subCategories.mockResolvedValue([]);
	});
	it('excludes account pages, redirects, and fabricated modification timestamps', async () => {
		const entries = await sitemap();
		expect(entries.some(e => /\/(cart|sign-in|sign-up|track-order)$/.test(e.url))).toBe(false);
		expect(entries.some(e => e.url.endsWith('/documentation'))).toBe(false);
		expect(entries.find(e => e.url.endsWith('/about'))?.lastModified).toBeUndefined();
		expect(entries.filter(e => e.url.endsWith('/documentation/introduction'))).toHaveLength(1);
	});
	it('includes only active-store products with encoded URLs', async () => {
		const entries = await sitemap();
		expect(mocks.products).toHaveBeenCalledWith(expect.objectContaining({ where: { store: { status: 'ACTIVE' } } }));
		expect(entries.some(e => e.url.endsWith('/product/demo%20product'))).toBe(true);
		expect(entries.some(e => e.url.endsWith('/browse?category=home%20%26%20living'))).toBe(true);
	});
});

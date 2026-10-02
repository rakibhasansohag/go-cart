import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProductWithVariantType } from '@/lib/types';
const h = vi.hoisted(() => ({
	currentUser: vi.fn(),
	db: {
		store: { findUnique: vi.fn() },
		product: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn(), delete: vi.fn() },
		productVariant: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
		freeShipping: { findUnique: vi.fn() },
	},
}));
vi.mock('@clerk/nextjs/server', () => ({ currentUser: h.currentUser }));
vi.mock('@/lib/db', () => ({ db: h.db }));
vi.mock('@/lib/search', () => ({ getRankedProductCandidates: vi.fn() }));
vi.mock('@/lib/utils', () => ({ generateUniqueSlug: vi.fn().mockResolvedValue('new-slug') }));
import { deleteProduct, upsertProduct } from './product';
const product: ProductWithVariantType = {
	productId: 'product', variantId: 'variant', name: 'Product', description: '<table><tr><td>Content</td></tr></table>', variantName: 'Variant', variantDescription: '<strong>Variant</strong>',
	images: [{ url: 'https://res.cloudinary.com/shop/image/upload/pic.jpg' }], variantImage: 'data:image/png;base64,aGVsbG8=', categoryId: 'category', subCategoryId: 'subcategory', isSale: false, brand: 'Brand', sku: 'sku', weight: 1,
	colors: [], sizes: [{ size: 'M', price: 10, quantity: 5, discount: 0 }], product_specs: [], variant_specs: [], keywords: [], questions: [], freeShippingForAllCountries: true, freeShippingCountriesIds: [], shippingFeeMethod: 'FIXED', createdAt: new Date(), updatedAt: new Date(),
};
describe('seller catalog isolation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		h.currentUser.mockResolvedValue({ id: 'seller', privateMetadata: { role: 'SELLER' } });
		h.db.store.findUnique.mockResolvedValue({ id: 'store', userId: 'seller' });
		h.db.product.findUnique.mockResolvedValue({ id: 'product', storeId: 'store' });
		h.db.productVariant.findUnique.mockResolvedValue({ id: 'variant', productId: 'product' });
		h.db.freeShipping.findUnique.mockResolvedValue(null);
	});
	it('blocks foreign product edits and creation of variants under foreign products', async () => {
		h.db.product.findUnique.mockResolvedValue({ id: 'product', storeId: 'victim-store' });
		await expect(upsertProduct(product, 'shop')).rejects.toThrow('another store');
		h.db.productVariant.findUnique.mockResolvedValue(null);
		await expect(upsertProduct(product, 'shop')).rejects.toThrow('another store');
		expect(h.db.product.update).not.toHaveBeenCalled();
		expect(h.db.productVariant.create).not.toHaveBeenCalled();
	});
	it.each([{ id: 'variant', productId: 'other-product' }, { id: 'variant', productId: 'product' }])('blocks cross-product and orphan variant identifiers', async (variant) => {
		h.db.productVariant.findUnique.mockResolvedValue(variant);
		if (variant.productId === 'product') h.db.product.findUnique.mockResolvedValue(null);
		await expect(upsertProduct(product, 'shop')).rejects.toThrow('another product');
		expect(h.db.productVariant.update).not.toHaveBeenCalled();
		expect(h.db.product.create).not.toHaveBeenCalled();
	});
	it('preserves owned product/variant editing and rich descriptions', async () => {
		await upsertProduct(product, 'shop');
		expect(h.db.product.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ description: product.description }) }));
		expect(h.db.productVariant.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ variantImage: product.variantImage }) }));
	});
	it('preserves adding a variant to an owned product', async () => {
		h.db.productVariant.findUnique.mockResolvedValue(null);
		await upsertProduct(product, 'shop');
		expect(h.db.productVariant.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ productId: 'product' }) }));
	});
	it('preserves creation of a new product and variant', async () => {
		h.db.product.findUnique.mockResolvedValue(null);
		h.db.productVariant.findUnique.mockResolvedValue(null);
		await upsertProduct(product, 'shop');
		expect(h.db.product.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ store: { connect: { id: 'store' } } }) }));
	});
	it('scopes deletion to seller-owned products at the database mutation', async () => {
		await deleteProduct('product');
		expect(h.db.product.delete).toHaveBeenCalledWith({ where: { id: 'product', store: { userId: 'seller' } } });
	});
});

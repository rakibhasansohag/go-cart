import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CartItem, ShippingAddress } from '@prisma/client';
import type { CartProductType, ShippingAddressPayload } from '@/lib/types';

const h = vi.hoisted(() => ({
	currentUser: vi.fn(), auth: vi.fn(),
	db: {
		shippingAddress: { findUnique: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn(), upsert: vi.fn() },
		cart: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), create: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
		cartItem: { update: vi.fn() }, product: { findUnique: vi.fn() }, orderGroup: { count: vi.fn(), create: vi.fn() },
		order: { create: vi.fn(), update: vi.fn() }, country: { findUnique: vi.fn() }, shipment: { create: vi.fn() }, orderItem: { create: vi.fn() }, shipmentItem: { create: vi.fn() }, fulfillmentTransition: { createMany: vi.fn() },
		$transaction: vi.fn(),
		size: { updateMany: vi.fn() },
	},
	getCookie: vi.fn(),
}));
vi.mock('@clerk/nextjs/server', () => ({ currentUser: h.currentUser, auth: h.auth }));
vi.mock('@/lib/db', () => ({ db: h.db }));
vi.mock('cookies-next', () => ({ getCookie: h.getCookie }));
vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('./product', () => ({ getProductShippingFee: vi.fn().mockResolvedValue(0), getShippingDetails: vi.fn().mockResolvedValue(false), getDeliveryDetailsForStoreByCountry: vi.fn() }));
vi.mock('@/lib/loyalty/coins', () => ({ coinsToDiscount: vi.fn(), redeemCoins: vi.fn(), validateRedemption: vi.fn() }));
import { placeOrder, saveUserCart, updateCheckoutProductstWithLatest, upsertShippingAddress } from './user';

const address: ShippingAddressPayload = { id: 'address', firstName: 'Test', lastName: 'Buyer', phone: '123456789', address1: '123 Main Road', address2: '', city: 'Dhaka', state: 'Dhaka', zip_code: '1234', countryId: 'country', default: true };
const item: CartItem = { id: 'item', cartId: 'cart', productId: 'product', variantId: 'variant', sizeId: 'size', storeId: 'store', sku: 'sku', productSlug: 'product', variantSlug: 'variant', name: 'Product', image: 'image', quantity: 2, size: 'M', price: 10, shippingFee: 0, totalPrice: 20, createdAt: new Date(), updatedAt: new Date() };
const cart = { id: 'cart', userId: 'buyer', cartItems: [item], coupon: null, total: 20 };
const product = { id: 'product', slug: 'product', name: 'Product', storeId: 'store', store: {}, shippingFeeMethod: 'FIXED', freeShipping: null, variants: [{ id: 'variant', variantName: 'Variant', slug: 'variant', sku: 'sku', weight: 1, images: [{ url: 'image' }], sizes: [{ id: 'size', size: 'M', price: 10, discount: 0, quantity: 5 }] }] };

describe('customer action boundaries', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		h.currentUser.mockResolvedValue({ id: 'buyer' });
		h.auth.mockResolvedValue({ userId: 'buyer' });
		h.db.$transaction.mockImplementation((callback: (tx: typeof h.db) => Promise<unknown>) => callback(h.db));
		h.db.size.updateMany.mockResolvedValue({ count: 1 });
		h.db.shippingAddress.findUnique.mockResolvedValue(null);
		h.db.shippingAddress.findFirst.mockResolvedValue({ ...address, userId: 'buyer' });
		h.db.shippingAddress.upsert.mockResolvedValue({ ...address, userId: 'buyer' });
		h.db.product.findUnique.mockResolvedValue(product);
		h.db.cart.findFirst.mockResolvedValue(cart);
		h.db.cart.findUnique.mockResolvedValue(cart);
		h.db.cart.update.mockResolvedValue(cart);
		h.db.cart.create.mockResolvedValue(cart);
		h.db.country.findUnique.mockResolvedValue({ id: 'country', name: 'Bangladesh', code: 'BD' });
		h.db.order.create.mockResolvedValue({ id: 'order' });
		h.db.orderGroup.create.mockResolvedValue({ id: 'group', packageStatus: 'CREATED' });
		h.db.shipment.create.mockResolvedValue({ id: 'shipment', status: 'CREATED' });
		h.db.orderItem.create.mockImplementation(async ({ data }: { data: { quantity: number } }) => ({ id: 'order-item', quantity: data.quantity }));
		h.db.cartItem.update.mockImplementation(async ({ data }: { data: Partial<CartItem> }) => ({ ...item, ...data }));
		h.getCookie.mockResolvedValue(undefined);
	});
	it('blocks foreign addresses before resetting defaults', async () => {
		h.db.shippingAddress.findUnique.mockResolvedValue({ id: 'address', userId: 'victim' });
		await expect(upsertShippingAddress(address)).rejects.toThrow('another user');
		expect(h.db.shippingAddress.updateMany).not.toHaveBeenCalled();
		expect(h.db.shippingAddress.upsert).not.toHaveBeenCalled();
	});
	it.each([null, { id: 'address', userId: 'buyer' }])('preserves own address create/edit and default selection', async (existing) => {
		h.db.shippingAddress.findUnique.mockResolvedValue(existing);
		await expect(upsertShippingAddress(address)).resolves.toMatchObject({ userId: 'buyer' });
		expect(h.db.shippingAddress.upsert).toHaveBeenCalledWith({ where: { id: 'address', userId: 'buyer' }, update: expect.not.objectContaining({ userId: expect.anything() }), create: expect.objectContaining({ id: 'address', userId: 'buyer' }) });
		expect(h.db.shippingAddress.updateMany).toHaveBeenCalledWith({ where: { userId: 'buyer', default: true }, data: { default: false } });
	});
	it('rejects runtime relation fields on addresses', async () => {
		await expect(upsertShippingAddress({ ...address, orders: { connect: { id: 'victim-order' } } } as ShippingAddressPayload)).rejects.toThrow('Unsupported fields');
		expect(h.db.$transaction).not.toHaveBeenCalled();
	});
	it('requires sign-in before checkout cart access', async () => {
		h.currentUser.mockResolvedValue(null);
		await expect(updateCheckoutProductstWithLatest([item], undefined)).rejects.toThrow('Unauthenticated');
		expect(h.db.cart.findUnique).not.toHaveBeenCalled();
	});
	it('blocks foreign cart before writing any items', async () => {
		h.db.cart.findUnique.mockResolvedValue(null);
		await expect(updateCheckoutProductstWithLatest([item], undefined)).rejects.toThrow('access');
		expect(h.db.cartItem.update).not.toHaveBeenCalled();
	});
	it('rejects a foreign item mixed into an owned cart', async () => {
		await expect(updateCheckoutProductstWithLatest([{ ...item, id: 'foreign-item' }], undefined)).rejects.toThrow('access');
		expect(h.db.cartItem.update).not.toHaveBeenCalled();
	});
	it('refreshes all persisted items and ignores caller price/product/quantity tampering', async () => {
		h.getCookie.mockResolvedValue(JSON.stringify({ id: 'country', name: 'Bangladesh' }));
		await updateCheckoutProductstWithLatest([{ ...item, productId: 'victim-product', price: -100, quantity: -1 }], undefined);
		expect(h.db.product.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'product' } }));
		expect(h.db.cartItem.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'item', cart: { userId: 'buyer' } }, data: expect.objectContaining({ quantity: 2, price: 10, totalPrice: 20 }) }));
	});
	it.each([-1, 0, 1.5, NaN, Infinity])('rejects cart quantity %s before persistence', async (quantity) => {
		await expect(saveUserCart([{ ...item, quantity } as unknown as CartProductType])).rejects.toThrow('positive integer');
		expect(h.db.cart.delete).not.toHaveBeenCalled();
		expect(h.db.cart.create).not.toHaveBeenCalled();
	});
	it('persists a legitimate positive cart quantity using server prices', async () => {
		await expect(saveUserCart([{ ...item, price: -10 } as unknown as CartProductType])).resolves.toBe(true);
		expect(h.db.cart.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ cartItems: { create: [expect.objectContaining({ quantity: 2, price: 10 })] } }) }));
	});
	it('places a legitimate order with positive quantities and server prices', async () => {
		const { getShippingDetails } = await import('./product');
		vi.mocked(getShippingDetails).mockResolvedValue(false);
		await expect(placeOrder({ ...address, userId: 'buyer', createdAt: new Date(), updatedAt: new Date() } as ShippingAddress, 'cart')).resolves.toEqual({ orderId: 'order' });
		expect(h.db.orderItem.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ quantity: 2, price: 10, totalPrice: 20 }) }));
		expect(h.db.size.updateMany).toHaveBeenCalledWith({ where: { id: 'size', quantity: { gte: 2 } }, data: { quantity: { decrement: 2 } } });
		expect(h.db.orderItem.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ inventoryReserved: true }) }));
	});
	it('rejects a competing checkout stock loss before creating any order or clearing its cart', async () => {
		const { getShippingDetails } = await import('./product');
		vi.mocked(getShippingDetails).mockResolvedValue(false);
		h.db.size.updateMany.mockResolvedValue({ count: 0 });
		await expect(placeOrder({ ...address, userId: 'buyer', createdAt: new Date(), updatedAt: new Date() } as ShippingAddress, 'cart')).rejects.toThrow('requested quantity');
		expect(h.db.order.create).not.toHaveBeenCalled();
		expect(h.db.cart.deleteMany).not.toHaveBeenCalled();
	});
	it('rejects a negative quantity already persisted in a cart before order creation', async () => {
		h.db.cart.findFirst.mockResolvedValue({ ...cart, cartItems: [{ ...item, quantity: -1 }] });
		await expect(placeOrder({ ...address, userId: 'buyer', createdAt: new Date(), updatedAt: new Date() } as ShippingAddress, 'cart')).rejects.toThrow('positive integer');
		expect(h.db.$transaction).not.toHaveBeenCalled();
	});
});

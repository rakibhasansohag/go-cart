import { beforeEach, describe, expect, it, vi } from 'vitest';
const h = vi.hoisted(() => ({
	currentUser: vi.fn(),
	db: { coupon: { findUnique: vi.fn(), findFirst: vi.fn() }, cart: { findUnique: vi.fn(), update: vi.fn() }, user: { findUnique: vi.fn() }, orderGroup: { findMany: vi.fn(), count: vi.fn() }, order: { findUnique: vi.fn() } },
}));
vi.mock('@clerk/nextjs/server', () => ({ currentUser: h.currentUser }));
vi.mock('@/lib/db', () => ({ db: h.db }));
vi.mock('@/lib/security/rate-limit', () => ({ enforceSharedRateLimit: vi.fn() }));
import { applyCoupon, applyCouponToOrder, getCouponRedemptions } from './coupon';
const coupon = { id: 'coupon', code: 'SAVE', discount: 10, startDate: new Date('2020-01-01'), endDate: new Date('2099-01-01'), maxUses: 100, maxUsesPerUser: 1, storeId: 'store', store: { userId: 'seller', name: 'Shop' } };
const cart = { id: 'cart', userId: 'buyer', couponId: null, total: 100, cartItems: [{ storeId: 'store', price: 100, quantity: 1, shippingFee: 0 }] };
describe('coupon authorization and eligibility', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		h.currentUser.mockResolvedValue({ id: 'buyer' });
		h.db.coupon.findFirst.mockResolvedValue(coupon);
		h.db.coupon.findUnique.mockResolvedValue(coupon);
		h.db.cart.findUnique.mockResolvedValue(cart);
		h.db.cart.update.mockResolvedValue({ ...cart, total: 90 });
		h.db.user.findUnique.mockResolvedValue({ role: 'USER' });
		h.db.orderGroup.findMany.mockResolvedValue([]);
		h.db.orderGroup.count.mockResolvedValue(0);
	});
	it('rejects unauthenticated coupon application before reads/writes', async () => {
		h.currentUser.mockResolvedValue(null);
		await expect(applyCoupon('SAVE', 'cart')).rejects.toThrow('Unauthenticated');
		expect(h.db.cart.update).not.toHaveBeenCalled();
	});
	it('does not return or mutate a foreign cart', async () => {
		h.db.cart.findUnique.mockResolvedValue(null);
		await expect(applyCoupon('SAVE', 'victim')).rejects.toThrow('Cart not found');
		expect(h.db.cart.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'victim', userId: 'buyer' } }));
		expect(h.db.cart.update).not.toHaveBeenCalled();
	});
	it('preserves valid coupon application on own cart', async () => {
		await expect(applyCoupon('SAVE', 'cart')).resolves.toMatchObject({ cart: { total: 90 } });
		expect(h.db.cart.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'cart', userId: 'buyer' } }));
	});
	it('blocks repeat per-user redemption through alternate cart action', async () => {
		h.db.orderGroup.count.mockImplementation(async ({ where }: { where: { order: { userId?: string } } }) => where.order.userId ? 1 : 0);
		await expect(applyCoupon('SAVE', 'cart')).rejects.toThrow('per-customer');
		expect(h.db.cart.update).not.toHaveBeenCalled();
	});
	it('blocks repeat per-user redemption through unpaid-order action', async () => {
		h.db.order.findUnique.mockResolvedValue({ id: 'order', paymentStatus: 'Pending', groups: [] });
		h.db.orderGroup.count.mockImplementation(async ({ where }: { where: { order: { userId?: string } } }) => where.order.userId ? 1 : 0);
		await expect(applyCouponToOrder('SAVE', 'order')).rejects.toThrow('per-customer');
	});
	it('blocks ordinary customers from buyer redemption history', async () => {
		await expect(getCouponRedemptions('coupon')).rejects.toThrow('restricted');
		expect(h.db.orderGroup.findMany).not.toHaveBeenCalled();
	});
	it.each(['seller', 'admin'])('allows the issuing seller or admin (%s)', async (id) => {
		h.currentUser.mockResolvedValue({ id });
		h.db.user.findUnique.mockResolvedValue({ role: id === 'admin' ? 'ADMIN' : 'SELLER' });
		await expect(getCouponRedemptions('coupon')).resolves.toEqual([]);
	});
	it('restricts global redemption history to admins', async () => {
		h.currentUser.mockResolvedValue({ id: 'seller' });
		h.db.coupon.findUnique.mockResolvedValue({ ...coupon, storeId: null, store: null });
		await expect(getCouponRedemptions('coupon')).rejects.toThrow('restricted');
	});
});

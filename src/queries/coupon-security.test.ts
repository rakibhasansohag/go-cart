import { beforeEach, describe, expect, it, vi } from 'vitest';
const h = vi.hoisted(() => ({
	currentUser: vi.fn(),
	db: { $transaction: vi.fn(), $queryRaw: vi.fn(), coupon: { findUnique: vi.fn(), findFirst: vi.fn() }, cart: { findUnique: vi.fn(), update: vi.fn() }, user: { findUnique: vi.fn() }, orderGroup: { findMany: vi.fn(), count: vi.fn(), update: vi.fn() }, order: { findUnique: vi.fn(), update: vi.fn() } },
}));
vi.mock('@clerk/nextjs/server', () => ({ currentUser: h.currentUser }));
vi.mock('@/lib/db', () => ({ db: h.db }));
vi.mock('@/lib/security/rate-limit', () => ({ enforceSharedRateLimit: vi.fn() }));
import { applyCoupon, applyCouponToOrder, getCouponRedemptions, upsertAdminCoupon } from './coupon';
const coupon = { id: 'coupon', code: 'SAVE', discount: 10, startDate: new Date('2020-01-01'), endDate: new Date('2099-01-01'), maxUses: 100, maxUsesPerUser: 1, storeId: 'store', store: { userId: 'seller', name: 'Shop' } };
const cart = { id: 'cart', userId: 'buyer', couponId: null, total: 100, cartItems: [{ storeId: 'store', price: 100, quantity: 1, shippingFee: 0 }] };
describe('coupon authorization and eligibility', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		h.db.$transaction.mockImplementation((callback: (tx: typeof h.db) => Promise<unknown>) => callback(h.db));
		h.db.$queryRaw.mockImplementation(async (sql: TemplateStringsArray) => sql.join('').includes('COUNT(*)') ? [{ totalUses: 0, userUses: 0 }] : []);
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
		h.db.$queryRaw.mockImplementation(async (sql: TemplateStringsArray) => sql.join('').includes('COUNT(*)') ? [{ totalUses: 1, userUses: 1 }] : []);
		await expect(applyCoupon('SAVE', 'cart')).rejects.toThrow('per-customer');
		expect(h.db.cart.update).not.toHaveBeenCalled();
	});
	it('blocks repeat per-user redemption through unpaid-order action', async () => {
		h.db.order.findUnique.mockResolvedValue({ id: 'order', paymentStatus: 'Pending', groups: [] });
		h.db.$queryRaw.mockImplementation(async (sql: TemplateStringsArray) => sql.join('').includes('COUNT(*)') ? [{ totalUses: 1, userUses: 1 }] : []);
		await expect(applyCouponToOrder('SAVE', 'order')).rejects.toThrow('per-customer');
	});
	it('freezes coupon edits once payment is reserved', async () => {
        h.db.order.findUnique.mockResolvedValue({ id: 'order', paymentStatus: 'Pending', groups: [] });
        h.db.$queryRaw.mockImplementation(async (sql: TemplateStringsArray) => sql.join('').includes('OrderPaymentReservation') ? [{ orderId: 'order' }] : []);
        await expect(applyCouponToOrder('SAVE', 'order')).rejects.toThrow('Payment has already started');
        expect(h.db.orderGroup.update).not.toHaveBeenCalled();
    });
    it('freezes legacy provider-initialized orders without a reservation', async () => {
        h.db.order.findUnique.mockResolvedValue({ id: 'order', paymentStatus: 'Failed', paymentDetails: { id: 'payment' }, groups: [] });
        await expect(applyCouponToOrder('SAVE', 'order')).rejects.toThrow('Payment has already started');
        expect(h.db.orderGroup.update).not.toHaveBeenCalled();
    });
    it('preserves coupon editing before payment and the existing coin discount', async () => {
        h.db.order.findUnique.mockResolvedValue({ id: 'order', paymentStatus: 'Pending', coinDiscount: 5, subTotal: 100, shippingFees: 0, groups: [{ id: 'group', storeId: 'store', subTotal: 100, shippingFees: 0 }] });
        h.db.orderGroup.findMany.mockResolvedValue([{ total: 90 }]);
        h.db.order.update.mockResolvedValue({ id: 'order', total: 85 });
        await expect(applyCouponToOrder('SAVE', 'order')).resolves.toMatchObject({ order: { total: 85 } });
        expect(h.db.order.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ total: 85 }) }));
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
	it('rejects timezone-free dates in the admin server action before any coupon lookup', async () => {
		h.currentUser.mockResolvedValue({ id: 'admin' });
		h.db.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
		await expect(upsertAdminCoupon({ code: 'TIMEZONE', discount: 15, startDate: '2026-10-03T12:00:00', endDate: '2026-10-04T12:00:00' })).rejects.toThrow('timezone');
		expect(h.db.coupon.findFirst).not.toHaveBeenCalled();
	});
});

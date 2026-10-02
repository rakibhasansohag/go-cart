import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StoreType } from '@/lib/types';

const h = vi.hoisted(() => ({
	currentUser: vi.fn(),
	db: {
		store: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
		shippingRate: { findUnique: vi.fn(), upsert: vi.fn() },
	},
}));
vi.mock('@clerk/nextjs/server', () => ({ currentUser: h.currentUser }));
vi.mock('@/lib/db', () => ({ db: h.db }));
vi.mock('./product', () => ({ checkIfUserFollowingStore: vi.fn() }));
import { applySeller, upsertShippingRate, upsertStore } from './store';

const store = { id: 'owned', userId: 'seller', status: 'BANNED', featured: false, averageRating: 0, numReviews: 0 };
const application: StoreType = {
	name: 'Shop', description: 'Description', email: 'seller@example.com', phone: '123456789', url: 'shop', logo: 'image', cover: 'image',
	defaultShippingService: 'Delivery', defaultShippingFeePerItem: 1, defaultShippingFeeForAdditionalItem: 1,
	defaultShippingFeePerKg: 1, defaultShippingFeeFixed: 1, defaultDeliveryTimeMin: 1, defaultDeliveryTimeMax: 7, returnPolicy: 'Return within 7 days.',
};
describe('store authorization boundaries', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		h.currentUser.mockResolvedValue({ id: 'seller', privateMetadata: { role: 'SELLER' } });
		h.db.store.findUnique.mockResolvedValue(store);
		h.db.store.findFirst.mockResolvedValue(null);
		h.db.store.create.mockResolvedValue({ id: 'new-store' });
	});
	it.each([{ status: 'ACTIVE' as const }, { featured: true }, { userId: 'other' }, { averageRating: 5 }, { numReviews: 99 }])('rejects protected seller field %j', async (fields) => {
		await expect(upsertStore({ id: 'owned', ...fields })).rejects.toThrow('Unauthorized');
		expect(h.db.store.update).not.toHaveBeenCalled();
	});
	it('keeps ordinary profile editing and already-featured stores working', async () => {
		h.db.store.findUnique.mockResolvedValue({ ...store, featured: true });
		await upsertStore({ id: 'owned', name: 'New name', featured: true, announcementText: 'Sale' });
		expect(h.db.store.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ name: 'New name', announcementText: 'Sale' }) }));
		expect(h.db.store.update.mock.calls[0][0].data).not.toHaveProperty('featured');
	});
	it('keeps admin approval and featured editing', async () => {
		h.currentUser.mockResolvedValue({ id: 'admin', privateMetadata: { role: 'ADMIN' } });
		await upsertStore({ id: 'owned', status: 'ACTIVE', featured: true });
		expect(h.db.store.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'ACTIVE', featured: true }) }));
	});
	it('rejects nested relation assignment', async () => {
		await expect(upsertStore({ id: 'owned', user: { connect: { id: 'other' } } } as Parameters<typeof upsertStore>[0])).rejects.toThrow('Unsupported fields');
		expect(h.db.store.update).not.toHaveBeenCalled();
	});
	it('rejects approval fields in an ordinary seller application', async () => {
		await expect(applySeller({ ...application, status: 'ACTIVE' } as StoreType)).rejects.toThrow('Unsupported fields');
		expect(h.db.store.create).not.toHaveBeenCalled();
	});
	it('creates legitimate applications pending approval', async () => {
		await applySeller(application);
		expect(h.db.store.create).toHaveBeenCalledWith({ data: expect.objectContaining({ name: 'Shop', status: 'PENDING', featured: false, userId: 'seller' }) });
	});
	it('rejects another store shipping rate before mutation', async () => {
		h.db.shippingRate.findUnique.mockResolvedValue({ id: 'rate', storeId: 'victim' });
		await expect(upsertShippingRate('shop', { id: 'rate', countryId: 'country' })).rejects.toThrow('another store');
		expect(h.db.shippingRate.upsert).not.toHaveBeenCalled();
	});
	it.each([null, { id: 'rate', storeId: 'owned' }])('preserves new and owned rate edits', async (existing) => {
		h.db.shippingRate.findUnique.mockResolvedValue(existing);
		await upsertShippingRate('shop', { id: 'rate', countryId: 'country', shippingFeeFixed: 5 });
		expect(h.db.shippingRate.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'rate', storeId: 'owned' }, create: expect.objectContaining({ storeId: 'owned' }) }));
	});
});

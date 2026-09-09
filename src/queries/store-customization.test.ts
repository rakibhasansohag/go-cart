import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Store } from '@prisma/client';

const harness = vi.hoisted(() => ({
	currentUser: vi.fn(),
	db: {
		store: {
			findUnique: vi.fn(),
			findFirst: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
		},
		user: {
			findUnique: vi.fn(),
		},
	},
	checkIfUserFollowingStore: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({
	currentUser: harness.currentUser,
}));

vi.mock('@/lib/db', () => ({
	db: harness.db,
}));

vi.mock('./user', () => ({
	checkIfUserFollowingStore: harness.checkIfUserFollowingStore,
}));

import { upsertStore, getStorePageDetails } from './store';

describe('Storefront Customization & Seller Branding Queries', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('upsertStore authorization & customization persistence', () => {
		it('rejects unauthenticated user', async () => {
			harness.currentUser.mockResolvedValue(null);

			await expect(
				upsertStore({
					name: 'Test Store',
					url: 'test-store',
				} as Partial<Store>)
			).rejects.toThrow('Unauthenticated.');
		});

		it('rejects user without SELLER or ADMIN role', async () => {
			harness.currentUser.mockResolvedValue({
				id: 'user_cust_1',
				privateMetadata: { role: 'USER' },
			});

			await expect(
				upsertStore({
					name: 'Test Store',
					url: 'test-store',
				} as Partial<Store>)
			).rejects.toThrow('Unauthorized Access: Seller Privileges Required for Entry.');
		});

		it('prevents cross-seller store tampering when modifying existing store', async () => {
			harness.currentUser.mockResolvedValue({
				id: 'seller_a',
				privateMetadata: { role: 'SELLER' },
			});

			harness.db.store.findUnique.mockResolvedValue({
				id: 'store_123',
				userId: 'seller_b', // Owned by a different seller
				name: 'Victim Store',
				url: 'victim-store',
			});

			await expect(
				upsertStore({
					id: 'store_123',
					name: 'Hacked Store',
					announcementText: 'Hacked promo',
				} as Partial<Store>)
			).rejects.toThrow('Unauthorized Access: You do not have permission to modify this store.');

			expect(harness.db.store.update).not.toHaveBeenCalled();
		});

		it('allows store owner to update announcement and social media links', async () => {
			harness.currentUser.mockResolvedValue({
				id: 'seller_owner',
				privateMetadata: { role: 'SELLER' },
			});

			harness.db.store.findUnique.mockResolvedValue({
				id: 'store_123',
				userId: 'seller_owner',
				name: 'My Store',
				url: 'my-store',
			});

			const updatedPayload: Partial<Store> = {
				id: 'store_123',
				name: 'My Store Updated',
				announcementText: 'Spring Sale 20% off with code SPRING20',
				announcementUrl: 'https://example.com/deals',
				announcementActive: true,
				instagram: 'https://instagram.com/mystore',
				facebook: 'https://facebook.com/mystore',
				twitter: 'https://x.com/mystore',
				youtube: 'https://youtube.com/@mystore',
				tiktok: 'https://tiktok.com/@mystore',
			};

			harness.db.store.update.mockResolvedValue({
				...updatedPayload,
				userId: 'seller_owner',
				url: 'my-store',
			});

			const result = await upsertStore(updatedPayload);

			expect(harness.db.store.update).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { id: 'store_123' },
					data: expect.objectContaining({
						name: 'My Store Updated',
						announcementText: 'Spring Sale 20% off with code SPRING20',
						announcementUrl: 'https://example.com/deals',
						announcementActive: true,
						instagram: 'https://instagram.com/mystore',
						facebook: 'https://facebook.com/mystore',
						twitter: 'https://x.com/mystore',
						youtube: 'https://youtube.com/@mystore',
						tiktok: 'https://tiktok.com/@mystore',
					}),
				})
			);

			expect(result).toMatchObject({
				announcementText: 'Spring Sale 20% off with code SPRING20',
				announcementActive: true,
				instagram: 'https://instagram.com/mystore',
			});
		});
	});

	describe('getStorePageDetails', () => {
		it('retrieves store details including announcement and social media profiles', async () => {
			harness.currentUser.mockResolvedValue(null);
			const mockStore = {
				id: 'store_123',
				name: 'Artisan Crafts',
				description: 'Handcrafted items with love',
				logo: 'https://res.cloudinary.com/demo/logo.jpg',
				cover: 'https://res.cloudinary.com/demo/cover.jpg',
				averageRating: 4.8,
				numReviews: 120,
				announcementText: 'Free worldwide delivery this week!',
				announcementUrl: 'https://example.com/promo',
				announcementActive: true,
				instagram: 'https://instagram.com/artisancrafts',
				facebook: 'https://facebook.com/artisancrafts',
				twitter: 'https://x.com/artisancrafts',
				youtube: 'https://youtube.com/@artisancrafts',
				tiktok: 'https://tiktok.com/@artisancrafts',
				_count: {
					followers: 350,
				},
			};

			harness.db.store.findUnique.mockResolvedValue(mockStore);

			const result = await getStorePageDetails('artisan-crafts');

			expect(harness.db.store.findUnique).toHaveBeenCalledWith({
				where: {
					url: 'artisan-crafts',
					status: 'ACTIVE',
				},
				select: expect.objectContaining({
					announcementText: true,
					announcementUrl: true,
					announcementActive: true,
					instagram: true,
					facebook: true,
					twitter: true,
					youtube: true,
					tiktok: true,
				}),
			});

			expect(result.announcementText).toBe('Free worldwide delivery this week!');
			expect(result.announcementActive).toBe(true);
			expect(result.instagram).toBe('https://instagram.com/artisancrafts');
			expect(result.isUserFollowingStore).toBe(false);
		});

		it('throws when store is not found or inactive', async () => {
			harness.currentUser.mockResolvedValue(null);
			harness.db.store.findUnique.mockResolvedValue(null);

			await expect(getStorePageDetails('non-existent-store')).rejects.toThrow(
				'Store with URL "non-existent-store" not found.'
			);
		});
	});
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
	currentUser: vi.fn(),
	db: {
		homepageSection: {
			findMany: vi.fn(),
			update: vi.fn(),
			upsert: vi.fn(),
			count: vi.fn(),
		},
		product: {
			findMany: vi.fn(),
			count: vi.fn(),
		},
		size: {
			aggregate: vi.fn(),
		},
		$transaction: vi.fn((actions: Promise<unknown>[]) => Promise.all(actions)),
	},
	revalidatePath: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({
	currentUser: harness.currentUser,
}));

vi.mock('@/lib/db', () => ({
	db: harness.db,
}));

vi.mock('next/cache', () => ({
	revalidatePath: harness.revalidatePath,
}));

import {
	getHomepageLayout,
	getAdminHomepageSections,
	updateHomepageSection,
	reorderHomepageSections,
	resetHomepageLayout,
	getHomepageStudioStats,
	getSuperDealsShowcaseProducts,
} from './homepage-config';
import { DEFAULT_HOMEPAGE_SECTIONS } from '@/lib/homepage-types';

describe('Homepage Configuration & Visual Customizer Queries', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getHomepageLayout', () => {
		it('returns active sections in ascending order from the database', async () => {
			const mockSections = [
				{
					id: 'sec_1',
					sectionKey: 'HERO_GRID',
					name: 'Hero Banner',
					title: 'Featured Highlights',
					subtitle: 'Deals of the day',
					isActive: true,
					order: 1,
					config: { showSideAd: true },
					updatedAt: new Date(),
				},
				{
					id: 'sec_2',
					sectionKey: 'SUPER_DEALS',
					name: 'Super Deals Hub',
					title: 'Super Deals',
					subtitle: 'Limited-time discounts',
					isActive: true,
					order: 2,
					config: { badge: 'Flash Sale' },
					updatedAt: new Date(),
				},
			];
			harness.db.homepageSection.findMany.mockResolvedValue(mockSections);

			const result = await getHomepageLayout();

			expect(harness.db.homepageSection.findMany).toHaveBeenCalledWith({
				where: { isActive: true },
				orderBy: { order: 'asc' },
			});
			expect(result).toHaveLength(2);
			expect(result[0].sectionKey).toBe('HERO_GRID');
			expect(result[1].sectionKey).toBe('SUPER_DEALS');
		});

		it('falls back to default sections when database query encounters an error', async () => {
			harness.db.homepageSection.findMany.mockRejectedValue(
				new Error('Database offline')
			);

			const result = await getHomepageLayout();

			expect(result).toHaveLength(DEFAULT_HOMEPAGE_SECTIONS.length);
			expect(result[0].sectionKey).toBe('HERO_GRID');
			expect(result[1].sectionKey).toBe('SUPER_DEALS');
			expect(result[2].sectionKey).toBe('FEATURED_CATEGORIES');
			expect(result[3].sectionKey).toBe('MORE_TO_LOVE');
		});
	});

	describe('getAdminHomepageSections', () => {
		it('rejects unauthenticated user', async () => {
			harness.currentUser.mockResolvedValue(null);

			await expect(getAdminHomepageSections()).rejects.toThrow('Unauthenticated.');
		});

		it('rejects non-admin user', async () => {
			harness.currentUser.mockResolvedValue({
				id: 'user_1',
				privateMetadata: { role: 'SELLER' },
			});

			await expect(getAdminHomepageSections()).rejects.toThrow(
				'Unauthorized Access: Admin Privileges Required.'
			);
		});

		it('returns all sections for admin caller', async () => {
			harness.currentUser.mockResolvedValue({
				id: 'admin_1',
				privateMetadata: { role: 'ADMIN' },
			});
			const mockSections = [
				{
					id: 'sec_1',
					sectionKey: 'HERO_GRID',
					name: 'Hero Banner',
					title: 'Featured',
					subtitle: null,
					isActive: true,
					order: 1,
					config: null,
					updatedAt: new Date(),
				},
				{
					id: 'sec_2',
					sectionKey: 'SUPER_DEALS',
					name: 'Super Deals Hub',
					title: 'Deals',
					subtitle: null,
					isActive: false, // Disabled
					order: 2,
					config: null,
					updatedAt: new Date(),
				},
			];
			harness.db.homepageSection.findMany.mockResolvedValue(mockSections);

			const result = await getAdminHomepageSections();

			expect(harness.db.homepageSection.findMany).toHaveBeenCalledWith({
				orderBy: { order: 'asc' },
			});
			expect(result).toHaveLength(2);
			expect(result[1].isActive).toBe(false);
		});
	});

	describe('updateHomepageSection', () => {
		it('rejects non-admin user', async () => {
			harness.currentUser.mockResolvedValue({
				id: 'user_1',
				privateMetadata: { role: 'USER' },
			});

			await expect(
				updateHomepageSection('sec_1', { isActive: false })
			).rejects.toThrow('Unauthorized Access: Admin Privileges Required.');
		});

		it('updates visibility and config and triggers path revalidation', async () => {
			harness.currentUser.mockResolvedValue({
				id: 'admin_1',
				privateMetadata: { role: 'ADMIN' },
			});
			const updatedRow = {
				id: 'sec_2',
				sectionKey: 'SUPER_DEALS',
				name: 'Super Deals Hub',
				title: 'Mega Flash Sale',
				subtitle: 'Up to 70% off',
				isActive: false,
				order: 2,
				config: { countdownEnd: '2026-10-15T00:00:00.000Z' },
				updatedAt: new Date(),
			};
			harness.db.homepageSection.update.mockResolvedValue(updatedRow);

			const result = await updateHomepageSection('sec_2', {
				isActive: false,
				title: 'Mega Flash Sale',
				subtitle: 'Up to 70% off',
				config: { countdownEnd: '2026-10-15T00:00:00.000Z' },
			});

			expect(harness.db.homepageSection.update).toHaveBeenCalledWith({
				where: { id: 'sec_2' },
				data: {
					isActive: false,
					title: 'Mega Flash Sale',
					subtitle: 'Up to 70% off',
					config: { countdownEnd: '2026-10-15T00:00:00.000Z' },
				},
			});
			expect(harness.revalidatePath).toHaveBeenCalledWith('/');
			expect(result.isActive).toBe(false);
			expect(result.title).toBe('Mega Flash Sale');
		});
	});

	describe('reorderHomepageSections', () => {
		it('rejects non-admin caller', async () => {
			harness.currentUser.mockResolvedValue({
				id: 'user_1',
				privateMetadata: { role: 'SELLER' },
			});

			await expect(
				reorderHomepageSections(['sec_2', 'sec_1'])
			).rejects.toThrow('Unauthorized Access: Admin Privileges Required.');
		});

		it('updates order of each section in transaction and revalidates path', async () => {
			harness.currentUser.mockResolvedValue({
				id: 'admin_1',
				privateMetadata: { role: 'ADMIN' },
			});
			harness.db.homepageSection.update.mockResolvedValue({});

			const result = await reorderHomepageSections(['sec_2', 'sec_1', 'sec_3']);

			expect(harness.db.$transaction).toHaveBeenCalled();
			expect(harness.revalidatePath).toHaveBeenCalledWith('/');
			expect(result).toEqual({ success: true });
		});
	});

	describe('resetHomepageLayout', () => {
		it('rejects non-admin user', async () => {
			harness.currentUser.mockResolvedValue(null);

			await expect(resetHomepageLayout()).rejects.toThrow('Unauthenticated.');
		});

		it('restores default sections via transaction and revalidates path', async () => {
			harness.currentUser.mockResolvedValue({
				id: 'admin_1',
				privateMetadata: { role: 'ADMIN' },
			});
			harness.db.homepageSection.upsert.mockResolvedValue({});

			const result = await resetHomepageLayout();

			expect(harness.db.$transaction).toHaveBeenCalled();
			expect(harness.revalidatePath).toHaveBeenCalledWith('/');
			expect(result).toEqual({ success: true });
		});
	});

	describe('getHomepageStudioStats', () => {
		it('calculates real database metrics for sections, catalog, and on-sale products', async () => {
			harness.db.product.count
				.mockResolvedValueOnce(38) // totalProducts
				.mockResolvedValueOnce(12) // onSaleProducts
				.mockResolvedValueOnce(12); // superDealsCount
			harness.db.size.aggregate.mockResolvedValueOnce({
				_avg: { discount: 10.4 },
				_max: { discount: 15.0 },
			});
			harness.db.homepageSection.count
				.mockResolvedValueOnce(4) // totalSections
				.mockResolvedValueOnce(4); // activeSections

			const stats = await getHomepageStudioStats();

			expect(stats.totalProducts).toBe(38);
			expect(stats.productsOnSale).toBe(12);
			expect(stats.avgDiscount).toBe(10);
			expect(stats.maxDiscount).toBe(15);
			expect(stats.totalSections).toBe(4);
			expect(stats.activeSections).toBe(4);
			expect(stats.hiddenSections).toBe(0);
		});

		it('gracefully handles database failure with reliable fallbacks', async () => {
			harness.db.product.count.mockRejectedValueOnce(new Error('Connection failure'));

			const stats = await getHomepageStudioStats();

			expect(stats.totalSections).toBe(4);
			expect(stats.activeSections).toBe(4);
			expect(stats.productsOnSale).toBe(12);
			expect(stats.totalProducts).toBe(38);
		});
	});

	describe('getSuperDealsShowcaseProducts', () => {
		it('queries discounted products and normalizes DealProductItem structure', async () => {
			const mockDealProducts = [
				{
					id: 'prod_1',
					name: 'Wireless Bluetooth Earbuds',
					slug: 'wireless-bluetooth-earbuds',
					rating: 4.8,
					sales: 120,
					numReviews: 45,
					offerTag: { name: 'Super Deals', url: 'super-deals' },
					variants: [
						{
							id: 'var_1',
							variantName: 'Midnight Black',
							variantImage: 'https://images.unsplash.com/earbuds.jpg',
							slug: 'wireless-bluetooth-earbuds-black',
							isSale: true,
							sales: 120,
							sizes: [{ price: 80, discount: 15, quantity: 40 }],
							images: [{ url: 'https://images.unsplash.com/earbuds.jpg' }],
						},
					],
				},
			];
			harness.db.product.findMany
				.mockResolvedValueOnce(mockDealProducts)
				.mockResolvedValueOnce([]);

			const deals = await getSuperDealsShowcaseProducts(6);

			expect(deals).toHaveLength(1);
			expect(deals[0].name).toBe('Wireless Bluetooth Earbuds');
			expect(deals[0].discount).toBe(15);
			expect(deals[0].price).toBe(68); // 80 * (1 - 0.15) = 68
			expect(deals[0].originalPrice).toBe(80);
			expect(deals[0].rating).toBe(4.8);
		});

		it('strictly filters out products with duplicate names', async () => {
			const mockWithDuplicates = [
				{
					id: 'prod_1',
					name: "Men's Italian Leather RFID Slim Wallet",
					slug: 'mens-wallet',
					rating: 4.8,
					sales: 100,
					numReviews: 20,
					offerTag: null,
					variants: [
						{
							id: 'var_1',
							slug: 'mens-wallet-black',
							variantImage: '/wallet.jpg',
							isSale: true,
							sizes: [{ price: 50, discount: 10, quantity: 20 }],
							images: [{ url: '/wallet.jpg' }],
						},
					],
				},
				{
					id: 'prod_2',
					name: "Men's Italian Leather RFID Slim Wallet", // Duplicate name
					slug: 'mens-wallet-1',
					rating: 4.7,
					sales: 80,
					numReviews: 15,
					offerTag: null,
					variants: [
						{
							id: 'var_2',
							slug: 'mens-wallet-1-black',
							variantImage: '/wallet.jpg',
							isSale: true,
							sizes: [{ price: 50, discount: 10, quantity: 20 }],
							images: [{ url: '/wallet.jpg' }],
						},
					],
				},
			];
			harness.db.product.findMany
				.mockResolvedValueOnce(mockWithDuplicates)
				.mockResolvedValueOnce([]);

			const deals = await getSuperDealsShowcaseProducts(6);

			// Should only include the first unique item, discarding the duplicate
			expect(deals).toHaveLength(1);
			expect(deals[0].id).toBe('prod_1');
		});
	});
});

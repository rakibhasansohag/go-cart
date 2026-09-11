import { beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
	currentUser: vi.fn(),
	db: {
		homepageSection: {
			findMany: vi.fn(),
			update: vi.fn(),
			upsert: vi.fn(),
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
});

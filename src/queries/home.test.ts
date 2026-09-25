import { beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
	db: {
		product: {
			findMany: vi.fn(),
		},
		category: {
			findMany: vi.fn(),
		},
	},
}));

vi.mock('@/lib/db', () => ({ db: harness.db }));

import { getHomeDataDynamic, getHomeFeaturedCategories } from './home';

describe('Home Queries', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getHomeDataDynamic', () => {
		it('throws an error if params is empty or not an array', async () => {
			await expect(getHomeDataDynamic([])).rejects.toThrow(
				'Invalid input: params must be a non-empty array.',
			);
		});

		it('throws an error if invalid property is passed', async () => {
			await expect(
				// @ts-expect-error testing invalid property input
				getHomeDataDynamic([{ property: 'invalid', value: 'test', type: 'simple' }]),
			).rejects.toThrow(
				'Invalid property: invalid. Must be one of: category, subCategory, offer.',
			);
		});

		it('fetches and formats simple product data correctly', async () => {
			const mockProducts = [
				{
					id: 'p1',
					slug: 'product-1',
					name: 'Product 1',
					rating: 4.5,
					sales: 10,
					numReviews: 5,
					variants: [
						{
							id: 'v1',
							variantName: 'Variant 1',
							variantImage: 'v1.jpg',
							slug: 'v1-slug',
							sizes: [
								{ size: 'M', price: 100, discount: 10 }, // discounted price = 90
								{ size: 'S', price: 80, discount: 0 },  // discounted price = 80 (cheapest)
							],
							images: [{ url: 'img1.jpg', order: 1 }],
						},
					],
				},
			];

			harness.db.product.findMany.mockResolvedValue(mockProducts);

			const result = await getHomeDataDynamic([
				{ property: 'offer', value: 'best-deals', type: 'simple' },
			]);

			expect(harness.db.product.findMany).toHaveBeenCalledWith({
				where: { offerTag: { url: 'best-deals' } },
				select: {
					id: true,
					slug: true,
					name: true,
					rating: true,
					sales: true,
					numReviews: true,
					variants: {
						select: {
							id: true,
							variantName: true,
							variantImage: true,
							slug: true,
							sizes: true,
							images: { orderBy: { order: 'asc' } },
						},
					},
				},
			});

			expect(result).toEqual({
				products_best_deals: [
					{
						name: 'Product 1',
						slug: 'product-1',
						variantName: 'Variant 1',
						variantSlug: 'v1-slug',
						price: 80,
						image: 'img1.jpg',
					},
				],
			});
		});

		it('fetches and formats full product data correctly', async () => {
			const mockProducts = [
				{
					id: 'p1',
					slug: 'product-1',
					name: 'Product 1',
					rating: 4.5,
					sales: 10,
					numReviews: 5,
					variants: [
						{
							id: 'v1',
							variantName: 'Variant 1',
							variantImage: 'v1.jpg',
							slug: 'v1-slug',
							sizes: [{ size: 'M', price: 100, discount: 0 }],
							images: [{ url: 'img1.jpg', order: 1 }],
						},
					],
				},
			];

			harness.db.product.findMany.mockResolvedValue(mockProducts);

			const result = await getHomeDataDynamic([
				{ property: 'category', value: 'electronics', type: 'full' },
			]);

			expect(result).toEqual({
				products_electronics: [
					{
						id: 'p1',
						slug: 'product-1',
						name: 'Product 1',
						rating: 4.5,
						sales: 10,
						numReviews: 5,
						variants: [
							{
								variantId: 'v1',
								variantSlug: 'v1-slug',
								variantName: 'Variant 1',
								variantImage: 'v1.jpg',
								images: [{ url: 'img1.jpg', order: 1 }],
								sizes: [{ size: 'M', price: 100, discount: 0 }],
							},
						],
						variantImages: [
							{
								url: '/product/product-1?variant=v1-slug',
								image: 'v1.jpg',
							},
						],
					},
				],
			});
		});

		it('handles multiple params and aggregates results into a single object', async () => {
			harness.db.product.findMany.mockResolvedValue([]);

			const result = await getHomeDataDynamic([
				{ property: 'offer', value: 'best-deals', type: 'simple' },
				{ property: 'category', value: 'fashion', type: 'simple' },
			]);

			expect(result).toEqual({
				products_best_deals: [],
				products_fashion: [],
			});
		});
	});

	describe('getHomeFeaturedCategories', () => {
		it('fetches and maps featured categories', async () => {
			const mockCategories = [
				{
					id: 'c1',
					name: 'Electronics',
					url: 'electronics',
					image: 'elec.jpg',
					_count: { products: 100 },
					subCategories: [
						{
							id: 'sc1',
							name: 'Phones',
							url: 'phones',
							image: 'phones.jpg',
							_count: { products: 40 },
						},
					],
				},
			];

			harness.db.category.findMany.mockResolvedValue(mockCategories);

			const result = await getHomeFeaturedCategories();

			expect(result).toEqual([
				{
					id: 'c1',
					name: 'Electronics',
					url: 'electronics',
					image: 'elec.jpg',
					productCount: 100,
					subCategories: [
						{
							id: 'sc1',
							name: 'Phones',
							url: 'phones',
							image: 'phones.jpg',
							productCount: 40,
						},
					],
				},
			]);
		});
	});
});

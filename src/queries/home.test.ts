import { describe, it, expect, vi } from 'vitest';
import { getHomeDataDynamic, getHomeFeaturedCategories } from './home';
import { db } from '@/lib/db';

vi.mock('@/lib/db', () => ({
	db: {
		product: {
			findMany: vi.fn(),
		},
		category: {
			findMany: vi.fn(),
		},
	},
}));

describe('home queries', () => {
	describe('getHomeDataDynamic', () => {
		it('throws on empty params', async () => {
			await expect(getHomeDataDynamic([])).rejects.toThrow('Invalid input: params must be a non-empty array.');
		});

		it('formats simple product data correctly finding cheapest size without full array sort', async () => {
			const mockProducts = [
				{
					id: 'p1',
					slug: 'product-1',
					name: 'Product 1',
					rating: 4.5,
					sales: 10,
					numReviews: 2,
					variants: [
						{
							id: 'v1',
							variantName: 'Red',
							variantImage: 'img1.jpg',
							slug: 'red',
							sizes: [
								{ size: 'M', price: 100, discount: 10 }, // 90
								{ size: 'S', price: 50, discount: 0 },   // 50 (cheapest)
								{ size: 'L', price: 120, discount: 50 }, // 60
							],
							images: [{ url: 'http://img1.jpg', order: 1 }],
						},
					],
				},
			];

			(db.product.findMany as any).mockResolvedValueOnce(mockProducts);

			const result = await getHomeDataDynamic([
				{ property: 'category', value: 'electronics', type: 'simple' },
			]);

			expect(result).toEqual({
				products_electronics: [
					{
						name: 'Product 1',
						slug: 'product-1',
						variantName: 'Red',
						variantSlug: 'red',
						price: 50,
						image: 'http://img1.jpg',
					},
				],
			});
		});

		it('formats full product data correctly', async () => {
			const mockProducts = [
				{
					id: 'p1',
					slug: 'product-1',
					name: 'Product 1',
					rating: 4.5,
					sales: 10,
					numReviews: 2,
					variants: [
						{
							id: 'v1',
							variantName: 'Red',
							variantImage: 'img1.jpg',
							slug: 'red',
							sizes: [{ size: 'M', price: 100, discount: 10 }],
							images: [{ url: 'http://img1.jpg', order: 1 }],
						},
					],
				},
			];

			(db.product.findMany as any).mockResolvedValueOnce(mockProducts);

			const result = await getHomeDataDynamic([
				{ property: 'offer', value: 'summer-sale', type: 'full' },
			]);

			expect(result).toEqual({
				products_summer_sale: [
					{
						id: 'p1',
						slug: 'product-1',
						name: 'Product 1',
						rating: 4.5,
						sales: 10,
						numReviews: 2,
						variants: [
							{
								variantId: 'v1',
								variantSlug: 'red',
								variantName: 'Red',
								variantImage: 'img1.jpg',
								images: [{ url: 'http://img1.jpg', order: 1 }],
								sizes: [{ size: 'M', price: 100, discount: 10 }],
							},
						],
						variantImages: [
							{
								url: '/product/product-1?variant=red',
								image: 'img1.jpg',
							},
						],
					},
				],
			});
		});
	});
});

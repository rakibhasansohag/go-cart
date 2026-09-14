import { beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
	db: {
		store: { findUnique: vi.fn() },
		category: { findUnique: vi.fn() },
		subCategory: { findUnique: vi.fn() },
		offerTag: { findUnique: vi.fn() },
		product: {
			groupBy: vi.fn(),
			count: vi.fn(),
		},
		size: {
			aggregate: vi.fn(),
			groupBy: vi.fn(),
		},
		color: {
			groupBy: vi.fn(),
		},
	},
}));

vi.mock('@/lib/db', () => ({ db: harness.db }));

import { getSearchFacets } from './search';

describe('getSearchFacets query engine', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns aggregated facet metrics for default criteria', async () => {
		harness.db.product.groupBy.mockResolvedValue([
			{ brand: 'Nike', _count: { id: 15 } },
			{ brand: 'Adidas', _count: { id: 10 } },
			{ brand: '', _count: { id: 2 } }, // Should be excluded
		]);

		harness.db.product.count
			.mockResolvedValueOnce(8) // 4+ stars
			.mockResolvedValueOnce(14) // 3+ stars
			.mockResolvedValueOnce(20) // 2+ stars
			.mockResolvedValueOnce(25) // 1+ stars
			.mockResolvedValueOnce(28); // Total count

		harness.db.size.aggregate.mockResolvedValue({
			_min: { price: 19.99 },
			_max: { price: 299.5 },
		});

		harness.db.color.groupBy.mockResolvedValue([
			{ name: 'Black', _count: { id: 12 } },
			{ name: 'White', _count: { id: 9 } },
		]);

		harness.db.size.groupBy.mockResolvedValue([
			{ size: 'M', _count: { id: 16 } },
			{ size: 'L', _count: { id: 14 } },
		]);

		const facets = await getSearchFacets({});

		expect(facets.brands).toEqual([
			{ name: 'Nike', count: 15 },
			{ name: 'Adidas', count: 10 },
		]);
		expect(facets.ratings).toEqual([
			{ rating: 4, count: 8 },
			{ rating: 3, count: 14 },
			{ rating: 2, count: 20 },
			{ rating: 1, count: 25 },
		]);
		expect(facets.priceRange).toEqual({ min: 19, max: 300 });
		expect(facets.colors).toEqual([
			{ name: 'Black', count: 12 },
			{ name: 'White', count: 9 },
		]);
		expect(facets.sizes).toEqual([
			{ size: 'M', count: 16 },
			{ size: 'L', count: 14 },
		]);
		expect(facets.totalCount).toBe(28);
	});

	it('scopes facets to matching category, subCategory, and store when provided', async () => {
		harness.db.store.findUnique.mockResolvedValue({ id: 'store-1' });
		harness.db.category.findUnique.mockResolvedValue({ id: 'cat-1' });
		harness.db.subCategory.findUnique.mockResolvedValue({ id: 'subcat-1' });
		harness.db.offerTag.findUnique.mockResolvedValue({ id: 'offer-1' });

		harness.db.product.groupBy.mockResolvedValue([
			{ brand: 'Puma', _count: { id: 5 } },
		]);
		harness.db.product.count
			.mockResolvedValueOnce(3)
			.mockResolvedValueOnce(5)
			.mockResolvedValueOnce(5)
			.mockResolvedValueOnce(5)
			.mockResolvedValueOnce(5);

		harness.db.size.aggregate.mockResolvedValue({
			_min: { price: null },
			_max: { price: null },
		});
		harness.db.color.groupBy.mockResolvedValue([]);
		harness.db.size.groupBy.mockResolvedValue([]);

		const facets = await getSearchFacets({
			store: 'my-store',
			category: 'clothing',
			subCategory: 'hoodies',
			offer: 'winter-sale',
			search: 'fleece',
		});

		expect(harness.db.store.findUnique).toHaveBeenCalledWith({
			where: { url: 'my-store' },
			select: { id: true },
		});
		expect(harness.db.category.findUnique).toHaveBeenCalledWith({
			where: { url: 'clothing' },
			select: { id: true },
		});
		expect(facets.brands).toEqual([{ name: 'Puma', count: 5 }]);
		expect(facets.priceRange).toEqual({ min: 0, max: 500 });
		expect(facets.totalCount).toBe(5);
	});
});

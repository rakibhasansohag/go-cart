import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryRawMock } = vi.hoisted(() => ({ queryRawMock: vi.fn() }));

vi.mock('@/lib/db', () => ({
	db: { $queryRaw: queryRawMock },
}));

import {
	clearSearchCache,
	getSearchMinSimilarity,
	searchProducts,
} from './search';

const row = {
	product_id: 'product-1',
	product_name: 'Café Atlas',
	product_slug: 'cafe-atlas',
	variant_name: 'Standard',
	variant_slug: 'cafe-atlas-standard',
	variant_image: 'https://example.test/atlas.png',
};

describe('PostgreSQL search service', () => {
	beforeEach(() => {
		queryRawMock.mockReset();
		clearSearchCache();
		delete process.env.SEARCH_MIN_SIMILARITY;
	});

	it('keeps the accent-normalized SQL pipeline and maximum result limit', async () => {
		queryRawMock.mockResolvedValue([row]);

		const results = await searchProducts('  Café  ', 200);
		const query = queryRawMock.mock.calls[0]?.[0] as { sql: string; values: unknown[] };

		expect(results).toEqual([
			{
				name: 'Café Atlas · Standard',
				link: '/product/cafe-atlas?variant=cafe-atlas-standard',
				image: 'https://example.test/atlas.png',
			},
		]);
		expect(query.sql).toContain('immutable_unaccent');
		expect(query.sql).toContain('plainto_tsquery');
		expect(query.values).toContain(20);
		expect(query.values).toContain('Café');
	});

	it('bounds the configurable trigram threshold', () => {
		process.env.SEARCH_MIN_SIMILARITY = '12';
		expect(getSearchMinSimilarity()).toBe(0.9);

		process.env.SEARCH_MIN_SIMILARITY = '-1';
		expect(getSearchMinSimilarity()).toBe(0.05);
	});

	it('deduplicates repeated variant rows and preserves typed result shape', async () => {
		queryRawMock.mockResolvedValue([row, { ...row }]);

		const results = await searchProducts('atlas');

		expect(results).toHaveLength(1);
		expect(results[0]).toEqual({
			name: 'Café Atlas · Standard',
			link: '/product/cafe-atlas?variant=cafe-atlas-standard',
			image: 'https://example.test/atlas.png',
		});
	});

	it('handles empty and overlong queries without touching PostgreSQL', async () => {
		expect(await searchProducts('   ')).toEqual([]);
		expect(await searchProducts('x'.repeat(101))).toEqual([]);
		expect(queryRawMock).not.toHaveBeenCalled();
	});

	it('returns an empty result on a database error', async () => {
		queryRawMock.mockRejectedValue(new Error('isolated database unavailable'));

		expect(await searchProducts('atlas')).toEqual([]);
	});
});

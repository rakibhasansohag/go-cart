import { db } from '@/lib/db';
import { SearchResult } from '@/lib/types';

export async function searchProducts(
	query: string,
	limit = 20,
): Promise<SearchResult[]> {
	const trimmed = query.trim();
	if (!trimmed) return [];

	try {
		const rawResults = await db.$queryRaw<
			{
				id: string;
				product_name: string;
				product_slug: string;
				variant_name: string;
				variant_slug: string;
				variant_image: string;
				rank: number;
			}[]
		>`
			SELECT 
				p.id,
				p.name AS product_name,
				p.slug AS product_slug,
				pv."variantName" AS variant_name,
				pv.slug AS variant_slug,
				pv."variantImage" AS variant_image,
				(
					ts_rank(p."searchVector", websearch_to_tsquery('english', immutable_unaccent(${trimmed}))) * 2.0 +
					similarity(p.name, ${trimmed}) * 1.5 +
					similarity(pv."variantName", ${trimmed}) * 1.0
				) AS rank
			FROM "Product" p
			JOIN "ProductVariant" pv ON pv."productId" = p.id
			WHERE 
				p."searchVector" @@ websearch_to_tsquery('english', immutable_unaccent(${trimmed}))
				OR similarity(p.name, ${trimmed}) > 0.15
				OR similarity(pv."variantName", ${trimmed}) > 0.15
				OR p.name ILIKE ${'%' + trimmed + '%'}
				OR pv."variantName" ILIKE ${'%' + trimmed + '%'}
			ORDER BY rank DESC
			LIMIT ${limit};
		`;

		const seen = new Set<string>();
		const results: SearchResult[] = [];

		for (const row of rawResults) {
			const key = `${row.product_slug}-${row.variant_slug}`;
			if (seen.has(key)) continue;
			seen.add(key);

			results.push({
				name: `${row.product_name} · ${row.variant_name}`,
				link: `/product/${row.product_slug}?variant=${row.variant_slug}`,
				image: row.variant_image || '',
			});
		}

		return results;
	} catch (error) {
		console.error('PostgreSQL search error:', error);
		return [];
	}
}

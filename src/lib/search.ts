import { db } from '@/lib/db';
import { SearchResult } from '@/lib/types';

// Simple fast in-memory cache for autocomplete search (TTL 60s)
const searchCache = new Map<string, { data: SearchResult[]; timestamp: number }>();
const CACHE_TTL_MS = 60_000;

export async function searchProducts(
	query: string,
	limit = 20,
): Promise<SearchResult[]> {
	const trimmed = query.trim().toLowerCase();
	if (!trimmed) return [];

	// Return cached result if fresh
	const cached = searchCache.get(trimmed);
	if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
		return cached.data;
	}

	try {
		// Clean query terms and format for prefix matching ('apex' -> 'apex:*')
		const sanitizeTerm = (t: string) => t.replace(/[^a-zA-Z0-9]/g, '');
		const terms = trimmed.split(/\s+/).map(sanitizeTerm).filter(Boolean);
		const prefixQuery = terms.length > 0 ? terms.map((t) => `${t}:*`).join(' & ') : '';

		let rawResults: {
			id: string;
			product_name: string;
			product_slug: string;
			variant_name: string;
			variant_slug: string;
			variant_image: string;
		}[] = [];

		if (prefixQuery) {
			// Fast path: GIN index scan via tsvector prefix match or prefix ILIKE
			rawResults = await db.$queryRaw`
				SELECT 
					p.id,
					p.name AS product_name,
					p.slug AS product_slug,
					pv."variantName" AS variant_name,
					pv.slug AS variant_slug,
					pv."variantImage" AS variant_image,
					ts_rank(p."searchVector", to_tsquery('english', ${prefixQuery})) AS rank
				FROM "Product" p
				JOIN "ProductVariant" pv ON pv."productId" = p.id
				WHERE 
					p."searchVector" @@ to_tsquery('english', ${prefixQuery})
					OR p.name ILIKE ${trimmed + '%'}
					OR pv."variantName" ILIKE ${trimmed + '%'}
					OR p.name ILIKE ${'%' + trimmed + '%'}
				ORDER BY rank DESC, p.name ASC
				LIMIT ${limit};
			`;
		}

		// Fallback path: If prefix match returned fewer results, use trigram similarity
		if (rawResults.length === 0) {
			rawResults = await db.$queryRaw`
				SELECT 
					p.id,
					p.name AS product_name,
					p.slug AS product_slug,
					pv."variantName" AS variant_name,
					pv.slug AS variant_slug,
					pv."variantImage" AS variant_image,
					similarity(p.name, ${trimmed}) AS rank
				FROM "Product" p
				JOIN "ProductVariant" pv ON pv."productId" = p.id
				WHERE 
					p.name % ${trimmed}
					OR pv."variantName" % ${trimmed}
				ORDER BY rank DESC
				LIMIT ${limit};
			`;
		}

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

		// Cache results
		if (searchCache.size > 500) searchCache.clear();
		searchCache.set(trimmed, { data: results, timestamp: Date.now() });

		return results;
	} catch (error) {
		console.error('PostgreSQL search error:', error);
		return [];
	}
}

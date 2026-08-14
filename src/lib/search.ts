import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { SearchResult } from '@/lib/types';

export const SEARCH_MAX_RESULTS = 20;
export const SEARCH_MAX_QUERY_LENGTH = 100;
export const SEARCH_DEFAULT_MIN_SIMILARITY = 0.25;
export const SEARCH_MIN_SIMILARITY_LOWER_BOUND = 0.05;
export const SEARCH_MIN_SIMILARITY_UPPER_BOUND = 0.9;

type SearchCacheEntry = { data: SearchResult[]; timestamp: number };

type SearchRow = {
	product_id: string;
	product_name: string;
	product_slug: string;
	variant_name: string;
	variant_slug: string;
	variant_image: string;
};

export type RankedProductCandidate = {
	productId: string;
	relevance: number;
};

type RankedProductRow = {
	product_id: string;
	relevance: number;
};

type SearchCursor = {
	relevance: number;
	productId: string;
};

const searchCache = new Map<string, SearchCacheEntry>();
const CACHE_TTL_MS = 60_000;

function boundedLimit(limit: number): number {
	if (!Number.isFinite(limit)) return SEARCH_MAX_RESULTS;
	return Math.min(Math.max(Math.trunc(limit), 1), SEARCH_MAX_RESULTS);
}

export function getSearchMinSimilarity(value = process.env.SEARCH_MIN_SIMILARITY): number {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return SEARCH_DEFAULT_MIN_SIMILARITY;
	return Math.min(
		Math.max(parsed, SEARCH_MIN_SIMILARITY_LOWER_BOUND),
		SEARCH_MIN_SIMILARITY_UPPER_BOUND,
	);
}

export function clearSearchCache(): void {
	searchCache.clear();
}

function encodeSearchCursor(cursor: SearchCursor): string {
	return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

function decodeSearchCursor(cursor: string | null | undefined): SearchCursor | null {
	if (!cursor) return null;
	try {
		const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as Partial<SearchCursor>;
		if (
			typeof parsed.productId !== 'string' ||
			typeof parsed.relevance !== 'number' ||
			!Number.isFinite(parsed.relevance)
		) {
			return null;
		}
		return { productId: parsed.productId, relevance: parsed.relevance };
	} catch {
		return null;
	}
}

function searchScoreExpression(): Prisma.Sql {
	return Prisma.sql`GREATEST(
		COALESCE(ts_rank(p."searchVector", si.ts_query), 0),
		similarity(immutable_unaccent(COALESCE(p."name", '')), si.query),
		similarity(immutable_unaccent(COALESCE(p."brand", '')), si.query),
		similarity(immutable_unaccent(COALESCE(p."description", '')), si.query),
		similarity(immutable_unaccent(COALESCE(pv."variantName", '')), si.query),
		similarity(immutable_unaccent(COALESCE(pv."variantDescription", '')), si.query),
		similarity(immutable_unaccent(COALESCE(pv."sku", '')), si.query),
		similarity(immutable_unaccent(COALESCE(pv."keywords", '')), si.query)
	)`;
}

function searchMatchExpression(minSimilarity: number): Prisma.Sql {
	const score = searchScoreExpression();
	return Prisma.sql`(
		p."searchVector" @@ si.ts_query
		OR LEFT(immutable_unaccent(p."name"), LENGTH(si.query)) = si.query
		OR LEFT(immutable_unaccent(pv."variantName"), LENGTH(si.query)) = si.query
		OR ${score} >= ${minSimilarity}
	)`;
}

function searchInput(query: string): Prisma.Sql {
	return Prisma.sql`CROSS JOIN LATERAL (
		SELECT
			immutable_unaccent(${query}) AS query,
			plainto_tsquery('english', immutable_unaccent(${query})) AS ts_query
	) si`;
}

/**
 * Return one deterministic relevance score per product for the browse page.
 * `filters` contains only parameterized SQL fragments assembled by the caller.
 */
export async function getRankedProductCandidates(
	query: string,
	filters: Prisma.Sql[] = [],
	cursor?: string | null,
	limit = 10,
): Promise<{
	candidates: RankedProductCandidate[];
	hasNextPage: boolean;
	nextCursor: string | null;
}> {
	const trimmed = query.trim();
	if (!trimmed || trimmed.length > SEARCH_MAX_QUERY_LENGTH) {
		return { candidates: [], hasNextPage: false, nextCursor: null };
	}

	const safeLimit = Math.max(Math.trunc(limit), 1);
	const minSimilarity = getSearchMinSimilarity();
	const filterSql = filters.length
		? Prisma.sql`AND ${Prisma.join(filters, ' AND ')}`
		: Prisma.empty;
	const decodedCursor = decodeSearchCursor(cursor);
	const cursorSql = decodedCursor
		? Prisma.sql`WHERE (
			rp.relevance < ${decodedCursor.relevance}
			OR (rp.relevance = ${decodedCursor.relevance} AND rp.product_id > ${decodedCursor.productId})
		)`
		: Prisma.empty;
	const score = searchScoreExpression();
	const match = searchMatchExpression(minSimilarity);

	const rows = await db.$queryRaw<RankedProductRow[]>(Prisma.sql`
		WITH ranked_products AS (
			SELECT
				p.id AS product_id,
				MAX(${score})::double precision AS relevance
			FROM "Product" p
			JOIN "ProductVariant" pv ON pv."productId" = p.id
			${searchInput(trimmed)}
			WHERE ${match}
				${filterSql}
			GROUP BY p.id
		)
		SELECT product_id, relevance
		FROM ranked_products rp
		${cursorSql}
		ORDER BY relevance DESC, product_id ASC
		LIMIT ${safeLimit + 1}
	`);

	const hasNextPage = rows.length > safeLimit;
	const pageRows = hasNextPage ? rows.slice(0, safeLimit) : rows;
	const candidates = pageRows.map((row) => ({
		productId: row.product_id,
		relevance: Number(row.relevance),
	}));
	const last = candidates[candidates.length - 1];

	return {
		candidates,
		hasNextPage,
		nextCursor: hasNextPage && last ? encodeSearchCursor(last) : null,
	};
}

export async function searchProducts(
	query: string,
	limit = SEARCH_MAX_RESULTS,
): Promise<SearchResult[]> {
	const trimmed = query.trim();
	if (!trimmed || trimmed.length > SEARCH_MAX_QUERY_LENGTH) return [];

	const cacheKey = trimmed.toLocaleLowerCase('en-US');
	const cached = searchCache.get(cacheKey);
	if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
		return cached.data;
	}

	try {
		const safeLimit = boundedLimit(limit);
		const minSimilarity = getSearchMinSimilarity();
		const score = searchScoreExpression();
		const match = searchMatchExpression(minSimilarity);
		const rawResults = await db.$queryRaw<SearchRow[]>(Prisma.sql`
			SELECT
				p.id AS product_id,
				p.name AS product_name,
				p.slug AS product_slug,
				pv."variantName" AS variant_name,
				pv.slug AS variant_slug,
				COALESCE(pv."variantImage", '') AS variant_image
			FROM "Product" p
			JOIN "ProductVariant" pv ON pv."productId" = p.id
			${searchInput(trimmed)}
			WHERE ${match}
			ORDER BY ${score} DESC,
				p.name ASC,
				p.id ASC,
				pv."variantName" ASC,
				pv.id ASC
			LIMIT ${safeLimit}
		`);

		const seen = new Set<string>();
		const results: SearchResult[] = [];
		for (const row of rawResults) {
			const key = `${row.product_slug}-${row.variant_slug}`;
			if (seen.has(key)) continue;
			seen.add(key);
			results.push({
				name: `${row.product_name} · ${row.variant_name}`,
				link: `/product/${row.product_slug}?variant=${row.variant_slug}`,
				image: row.variant_image,
			});
		}

		if (searchCache.size > 500) searchCache.clear();
		searchCache.set(cacheKey, { data: results, timestamp: Date.now() });
		return results;
	} catch (error) {
		console.error('PostgreSQL search error:', error);
		return [];
	}
}

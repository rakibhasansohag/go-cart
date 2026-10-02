import type { FiltersQueryType } from '@/lib/types';

function list(value: string | string[] | undefined) {
	return value === undefined ? undefined : (Array.isArray(value) ? value : [value])
		.flatMap((item) => item.split(',')).map((item) => item.trim()).filter(Boolean);
}

export function getStoreProductFilters(queries: FiltersQueryType, store: string) {
	const page = Number(queries.page);
	return {
		store,
		page: Number.isSafeInteger(page) && page > 0 && page <= 100_000 ? page : 1,
		search: queries.search,
		category: queries.category,
		subCategory: queries.subCategory,
		offer: queries.offer,
		minPrice: Number(queries.minPrice) || 0,
		maxPrice: Number(queries.maxPrice) || Number.MAX_SAFE_INTEGER,
		size: list(queries.size),
		color: list(queries.color),
		brand: list(queries.brand),
		rating: Number(queries.rating) || undefined,
	};
}

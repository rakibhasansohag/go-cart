import ProductFilters from '@/components/store/browse-page/filters';
import BrowseLayoutClient from '@/components/store/browse-page/browse-layout';
import Header from '@/components/store/layout/header/header';
import { FiltersQueryType } from '@/lib/types';
import { getProducts } from '@/queries/product';
import { getFilteredColors } from '@/queries/color';
import { getFilteredSizes } from '@/queries/size';
import { getSearchFacets } from '@/queries/search';
import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import { queryKeys } from '@/lib/query-keys';
import BrowseProductsList, { BrowseProductsSkeleton } from '@/components/store/browse-page/products-list';

export default async function BrowsePage({
	searchParams,
}: {
	searchParams: Promise<FiltersQueryType>;
}) {
	const resolvedParams = await searchParams;

	const {
		category,
		offer,
		search,
		size,
		sort,
		subCategory,
		maxPrice,
		minPrice,
		color,
		brand,
		rating,
	} = resolvedParams;

	const brandArray = Array.isArray(brand)
		? brand
		: typeof brand === 'string'
			? brand.split(',').map((b) => b.trim()).filter(Boolean)
			: undefined;

	const ratingNumber = Number(rating) || undefined;

	const queryClient = getQueryClient();

	const filterOptions = {
		search,
		minPrice: Number(minPrice) || 0,
		maxPrice: Number(maxPrice) || Number.MAX_SAFE_INTEGER,
		category,
		subCategory,
		offer,
		size: Array.isArray(size) ? size : size ? [size] : undefined,
		color: Array.isArray(color) ? color : color ? [color] : undefined,
		brand: brandArray,
		rating: ratingNumber,
	};

	const facetFilterScope = {
		search,
		category,
		subCategory,
		offer,
	};

	// Prefetch products, facets, and metadata filters on the server in parallel
	await Promise.all([
		queryClient.prefetchQuery({
			queryKey: queryKeys.products.list(filterOptions, sort || '', null),
			queryFn: () => getProducts(filterOptions, sort, null),
		}),
		queryClient.prefetchQuery({
			queryKey: queryKeys.search.facets(facetFilterScope),
			queryFn: () => getSearchFacets(facetFilterScope),
		}),
		queryClient.prefetchQuery({
			queryKey: queryKeys.colors.filtered({ category, offer, subCategory }),
			queryFn: () => getFilteredColors({ category, offer, subCategory }, 10),
		}),
		queryClient.prefetchQuery({
			queryKey: queryKeys.sizes.filtered({ category, offer, subCategory }),
			queryFn: () => getFilteredSizes({ category, offer, subCategory }, 10),
		}),
	]);

	return (
		<div className='relative min-h-screen lg:h-screen lg:overflow-hidden bg-background'>
			<HydrationBoundary state={dehydrate(queryClient)}>
				{/* Header */}
				<Header />

				{/* Collapsible Layout */}
				<BrowseLayoutClient
					filters={<ProductFilters queries={resolvedParams} />}
				>
					{/* Product List */}
					<Suspense fallback={<BrowseProductsSkeleton />}>
						<BrowseProductsList queries={resolvedParams} />
					</Suspense>
				</BrowseLayoutClient>
			</HydrationBoundary>
		</div>
	);
}

import ProductFilters from '@/components/store/browse-page/filters';
import BrowseLayoutClient from '@/components/store/browse-page/browse-layout';
import Header from '@/components/store/layout/header/header';
import { FiltersQueryType } from '@/lib/types';
import { getProducts } from '@/queries/product';
import { getFilteredColors } from '@/queries/color';
import { getFilteredSizes } from '@/queries/size';
import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import { queryKeys } from '@/lib/query-keys';
import BrowseProductsList from '@/components/store/browse-page/products-list';
import { ProductsGridSkeleton } from '@/components/store/skeletons/home-skeletons';

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
	} = resolvedParams;

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
	};

	// Prefetch products and metadata filters on the server in parallel
	await Promise.all([
		queryClient.prefetchQuery({
			queryKey: queryKeys.products.list(filterOptions, sort || '', 1),
			queryFn: () => getProducts(filterOptions, sort),
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
		<div className='relative min-h-screen bg-background'>
			<HydrationBoundary state={dehydrate(queryClient)}>
				{/* Header */}
				<Header />

				{/* Collapsible Layout */}
				<BrowseLayoutClient
					filters={<ProductFilters queries={resolvedParams} />}
				>
					{/* Product List */}
					<Suspense fallback={<ProductsGridSkeleton />}>
						<BrowseProductsList queries={resolvedParams} />
					</Suspense>
				</BrowseLayoutClient>
			</HydrationBoundary>
		</div>
	);
}


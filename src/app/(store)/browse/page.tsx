import ProductFilters from '@/components/store/browse-page/filters';
import ProductSort from '@/components/store/browse-page/sort';
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
		<div className='relative h-screen overflow-hidden'>
			<HydrationBoundary state={dehydrate(queryClient)}>
				{/* Header */}
				<div className='fixed top-0 left-0 w-full z-10'>
					<Header />
				</div>

				{/* Filters Sidebar */}
				<div className='fixed top-[124px] lg:top-16 left-2 md:left-4 pt-4 h-[calc(100vh-64px)] overflow-auto scrollbar'>
					<ProductFilters queries={resolvedParams} />{' '}
				</div>

				{/* Main Content */}
				<div className='ml-[190px] md:ml-[220px] pt-[140px] lg:pt-20'>
					{/* Sort Section */}
					<div className='sticky top-[64px] z-10 px-4 py-2 flex items-center'>
						<ProductSort />
					</div>

					{/* Product List */}
					<Suspense fallback={<ProductsGridSkeleton />}>
						<BrowseProductsList queries={resolvedParams} />
					</Suspense>
				</div>
			</HydrationBoundary>
		</div>
	);
}


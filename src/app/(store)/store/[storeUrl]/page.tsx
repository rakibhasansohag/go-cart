import ProductFilters from '@/components/store/browse-page/filters';
import CategoriesHeader from '@/components/store/layout/categories-header/categories-header';
import Header from '@/components/store/layout/header/header';
import StoreDetails from '@/components/store/store-page/store-details';
import StoreProducts from '@/components/store/store-page/store-products';
import StoreLayoutClient from '@/components/store/store-page/store-layout';
import { FiltersQueryType } from '@/lib/types';
import { getStorePageDetails } from '@/queries/store';
import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import { queryKeys } from '@/lib/query-keys';
import { getProducts } from '@/queries/product';
import { getFilteredColors } from '@/queries/color';
import { getFilteredSizes } from '@/queries/size';
import { ProductsGridSkeleton } from '@/components/store/skeletons/home-skeletons';

export default async function StorePage({
	params,
	searchParams,
}: {
	params: Promise<{ storeUrl: string }>;
	searchParams: Promise<FiltersQueryType>;
}) {
	const { storeUrl } = await params;
	const resolvedSearchParams = await searchParams;

	const {
		category,
		offer,
		search,
		size,
		sort,
		subCategory,
		color,
		minPrice,
		maxPrice,
	} = resolvedSearchParams;

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
		store: storeUrl,
	};

	// Parallel prefetch store info, products list and active filter options on server
	const [store] = await Promise.all([
		getStorePageDetails(storeUrl),
		queryClient.prefetchQuery({
			queryKey: queryKeys.products.list(filterOptions, sort || '', null),
			queryFn: () => getProducts(filterOptions, sort, null),
		}),
		queryClient.prefetchQuery({
			queryKey: queryKeys.colors.filtered({ category, offer, subCategory, storeUrl }),
			queryFn: () => getFilteredColors({ category, offer, subCategory, storeUrl }, 10),
		}),
		queryClient.prefetchQuery({
			queryKey: queryKeys.sizes.filtered({ category, offer, subCategory, storeUrl }),
			queryFn: () => getFilteredSizes({ category, offer, subCategory, storeUrl }, 10),
		}),
	]);

	return (
		<>
			<Header />
			<CategoriesHeader />
			<div className='max-w-[1600px] mx-auto px-4 '>
				<StoreDetails details={store} />
				<HydrationBoundary state={dehydrate(queryClient)}>
					<StoreLayoutClient
						filters={<ProductFilters queries={resolvedSearchParams} storeUrl={storeUrl} />}
					>
						<Suspense fallback={<ProductsGridSkeleton />}>
							<StoreProducts
								searchParams={resolvedSearchParams}
								store={storeUrl}
							/>
						</Suspense>
					</StoreLayoutClient>
				</HydrationBoundary>
			</div>
		</>
	);
}

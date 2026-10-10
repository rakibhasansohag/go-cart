import { listingMetadata } from '@/lib/seo/page-metadata';
import { serializeJsonLd } from '@/lib/seo/serialize-jsonld';
import ProductFilters from '@/components/store/browse-page/filters';
import CategoriesHeader from '@/components/store/layout/categories-header/categories-header';
import Header from '@/components/store/layout/header/header';
import StoreDetails from '@/components/store/store-page/store-details';
import StoreProducts from '@/components/store/store-page/store-products';
import StoreLayoutClient from '@/components/store/store-page/store-layout';
import { FiltersQueryType } from '@/lib/types';
import { getStorePageDetails } from '@/queries/store';
import { cache, Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import { queryKeys } from '@/lib/query-keys';
import { getProducts } from '@/queries/product';
import { getFilteredColors } from '@/queries/color';
import { getFilteredSizes } from '@/queries/size';
import { ProductsGridSkeleton } from '@/components/store/skeletons/home-skeletons';
import type { Metadata } from 'next';
import { generateStoreJsonLd } from '@/lib/seo/schema';
import { getStoreProductFilters } from '@/lib/store-product-filters';

// Share the metadata/page lookup within one request, including its viewer state.
const getRequestStoreDetails = cache(getStorePageDetails);

export async function generateMetadata({
	params,
	searchParams,
}: {
	params: Promise<{ storeUrl: string }>;
	searchParams: Promise<FiltersQueryType>;
}): Promise<Metadata> {
	const { storeUrl } = await params;
	if (!storeUrl) {
		return {
			title: 'Store',
			description: 'Discover storefronts on GoCart Multi-Vendor Marketplace.',
		};
	}

	try {
		const store = await getRequestStoreDetails(storeUrl);
		if (!store) {
			return {
				title: 'Store Not Found',
				description: 'The requested store could not be found on GoCart.',
			};
		}

		const title = `${store.name} - Official Store`;
		const description = store.description
			? store.description.slice(0, 160)
			: `Shop products from ${store.name} on GoCart.`;

		const listing = listingMetadata(`/store/${encodeURIComponent(store.url)}`, await searchParams);
		const canonicalUrl = String(listing.alternates?.canonical);

		return {
			title,
			description,
			...listing,
			openGraph: {
				title: `${store.name} | GoCart`,
				description,
				url: canonicalUrl,
				images: store.cover
					? [{ url: store.cover, alt: store.name }]
					: store.logo
					? [{ url: store.logo, alt: store.name }]
					: [{ url: '/opengraph-image', alt: store.name }],
				type: 'website',
			},
			twitter: {
				card: 'summary_large_image',
				title: `${store.name} | GoCart`,
				description,
				images: store.cover ? [store.cover] : store.logo ? [store.logo] : ['/opengraph-image'],
			},
		};
	} catch {
		return {
			title: 'Store',
			description: 'Shop products on GoCart.',
		};
	}
}

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
		sort,
		subCategory,
	} = resolvedSearchParams;

	const queryClient = getQueryClient();

	const filterOptions = getStoreProductFilters(resolvedSearchParams, storeUrl);

	// Parallel prefetch store info, products list and active filter options on server
	const [store] = await Promise.all([
		getRequestStoreDetails(storeUrl),
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

	const storeJsonLd = store
		? generateStoreJsonLd({
				name: store.name,
				description: store.description,
				url: store.url,
				logo: store.logo,
				coverImage: store.cover,
				email: store.email,
				phone: store.phone,
		  })
		: null;

	return (
		<>
			<Header />
			<CategoriesHeader />
			<div className='max-w-[1600px] mx-auto px-4 '>
				{storeJsonLd ? (
					<script
						type='application/ld+json'
						dangerouslySetInnerHTML={{
							__html: serializeJsonLd(storeJsonLd),
						}}
					/>
				) : null}
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

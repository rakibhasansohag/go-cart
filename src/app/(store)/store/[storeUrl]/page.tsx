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
import type { Metadata } from 'next';
import { generateStoreJsonLd } from '@/lib/seo/schema';

export async function generateMetadata({
	params,
}: {
	params: Promise<{ storeUrl: string }>;
}): Promise<Metadata> {
	const { storeUrl } = await params;
	if (!storeUrl) {
		return {
			title: 'Store',
			description: 'Discover storefronts on GoCart Multi-Vendor Marketplace.',
		};
	}

	try {
		const store = await getStorePageDetails(storeUrl);
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

		const baseUrl =
			process.env.NEXT_PUBLIC_APP_URL ||
			(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
		const canonicalUrl = `${baseUrl}/store/${store.url}`;

		return {
			title,
			description,
			alternates: {
				canonical: canonicalUrl,
			},
			openGraph: {
				title: `${store.name} | GoCart`,
				description,
				url: canonicalUrl,
				images: store.cover
					? [{ url: store.cover, alt: store.name }]
					: store.logo
					? [{ url: store.logo, alt: store.name }]
					: [{ url: '/og-image.png', alt: store.name }],
				type: 'website',
			},
			twitter: {
				card: 'summary_large_image',
				title: `${store.name} | GoCart`,
				description,
				images: store.cover ? [store.cover] : store.logo ? [store.logo] : ['/og-image.png'],
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
							__html: JSON.stringify(storeJsonLd),
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

import StoreCard from '@/components/store/cards/store-card';
import CategoriesHeader from '@/components/store/layout/categories-header/categories-header';
import Header from '@/components/store/layout/header/header';
import ProductPageContainer from '@/components/store/product-page/container';
import ProductDescription from '@/components/store/product-page/product-description';
import ProductQuestions from '@/components/store/product-page/product-questions';
import ProductSpecs from '@/components/store/product-page/product-specs';
import RelatedProducts from '@/components/store/product-page/related-product';
import ProductReviews from '@/components/store/product-page/reviews/product-reviews';
import StoreProducts from '@/components/store/product-page/store-products';
import { Separator } from '@/components/ui/separator';
import { Country } from '@/lib/types';
import { retrieveProductDetailsOptimized, getRelatedProducts, getProductFilteredReviews } from '@/queries/product-optimized';
import { getProducts } from '@/queries/product';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import { queryKeys } from '@/lib/query-keys';
import ProductPageRelatedSkeletonLoader from '@/components/store/skeletons/product-page/related';
import ProductPageStoreProductsSkeletonLoader from '@/components/store/skeletons/product-page/store-products';


type ProductParams = { productSlug: string };
type SearchParams = Record<string, string | string[] | undefined> | undefined;

export default async function ProductPage({
	params,
	searchParams,
}: {
	params: Promise<ProductParams>;
	searchParams?: Promise<SearchParams>;
}) {
	const awaitedParams = await params;
	const awaitedSearchParams = searchParams ? await searchParams : {};

	const productSlug: string = awaitedParams?.productSlug;
	const variantSlug: string = (awaitedSearchParams?.variant as string) ?? '';

	// Validate
	if (!productSlug) {
		// either show notFound page or throw
		return redirect('/');
	}

	const queryClient = getQueryClient();

	// Data
	const data = await queryClient.fetchQuery({
		queryKey: queryKeys.products.detail(productSlug),
		queryFn: () => retrieveProductDetailsOptimized(productSlug),
	});
	if (!data) return notFound();

	// Prefetch downstream queries in parallel on the server
	await Promise.all([
		queryClient.prefetchQuery({
			queryKey: queryKeys.products.related(data.id),
			queryFn: () => getRelatedProducts(data.id, data.categoryId, data.subCategoryId),
		}),
		queryClient.prefetchQuery({
			queryKey: queryKeys.products.storeProducts(data.store.url),
			queryFn: () => getProducts({ store: data.store.url }, '', null, 5),
		}),
		queryClient.prefetchQuery({
			queryKey: ['reviews', data.id, { rating: undefined, hasImages: undefined }, undefined, 1, 4],
			queryFn: () => getProductFilteredReviews(data.id, { rating: undefined, hasImages: undefined }, undefined, 1, 4),
		}),
	]);

	const variant = data.variants.find(
		(v: { slug: string }) => v.slug === variantSlug,
	);

	const specs = {
		product: data?.specs,
		variant: variant?.specs,
	};

	// Cookies
	const cookieStore = await cookies();
	const userCountryCookie = cookieStore.get('userCountry');

	// default country fallback
	let userCountry: Country = {
		name: 'United States',
		city: '',
		code: 'US',
		region: '',
	};
	if (userCountryCookie) {
		try {
			userCountry = JSON.parse(userCountryCookie.value) as Country;
		} catch {
			/* ignore parse error and keep default */
		}
	}

	const storeData = {
		id: data.store.id,
		name: data.store.name,
		url: data.store.url,
		logo: data.store.logo,
		followersCount: 0,
		isUserFollowingStore: false,
	};

	return (
		<div>
			<Header />
			<CategoriesHeader />
			<div className='p-4 2xl:px-28 overflow-x-hidden mx-auto'>
				<HydrationBoundary state={dehydrate(queryClient)}>
					<ProductPageContainer
						productData={data}
						// pass the awaited primitive
						variantSlug={variantSlug}
						userCountry={userCountry}
					>
						<>
							<Separator />
							<Suspense fallback={<ProductPageRelatedSkeletonLoader />}>
								<RelatedProducts
									productId={data.id}
									categoryId={data.categoryId}
									subCategoryId={data.subCategoryId}
								/>
							</Suspense>
						</>
					<Separator className='mt-6' />
					<ProductReviews
						productId={data.id}
						rating={data.rating}
						variantsInfo={data.variants}
						numReviews={data._count.reviews}
					/>
					<>
						<Separator className='mt-6' />
						<ProductDescription
							text={[data.description, variant?.variantDescription || '']}
						/>
					</>
					<Separator className='mt-6' />

					{(specs.product || specs.variant) && <ProductSpecs specs={specs} />}

					<Separator className='mt-6' />
					{data.questions && <ProductQuestions questions={data.questions} />}
					<Separator className='mt-6' />
					<div className='h-6' />
					<StoreCard store={storeData} />
						<Suspense fallback={<ProductPageStoreProductsSkeletonLoader />}>
							<StoreProducts
								storeUrl={data.store.url}
								storeName={data.store.name}
								count={5}
							/>
						</Suspense>
					</ProductPageContainer>
				</HydrationBoundary>
			</div>
		</div>
	);
}

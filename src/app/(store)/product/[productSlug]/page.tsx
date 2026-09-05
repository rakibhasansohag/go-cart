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
import { getProductQA } from '@/queries/qa';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
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

	// Check if current user is admin
	const user = await currentUser();
	const dbUser = user
		? await db.user.findUnique({
				where: { id: user.id },
				select: { role: true },
		  })
		: null;
	const isCurrentUserAdmin = dbUser?.role === 'ADMIN';

	// Prefetch downstream queries in parallel on the server
	const [initialQA] = await Promise.all([
		getProductQA(data.id, { page: 1, limit: 20 }),
		queryClient.prefetchQuery({
			queryKey: ['product-qa', data.id, 1, 20, ''],
			queryFn: () => getProductQA(data.id, { page: 1, limit: 20 }),
		}),
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
					<ProductQuestions
						productId={data.id}
						storeOwnerId={data.store.userId}
						isCurrentUserAdmin={isCurrentUserAdmin}
						initialQA={initialQA.questions}
						totalQuestions={initialQA.totalQuestions}
						questions={data.questions}
					/>
					<Separator className='mt-6' />
					<StoreCard
						store={storeData}
						productId={data.id}
						productName={data.name}
					/>
						<Suspense fallback={<ProductPageStoreProductsSkeletonLoader />}>
							<StoreProducts
								storeUrl={data.store.url}
								storeName={data.store.name}
								count={5}
							/>
						</Suspense>
					</ProductPageContainer>
				</HydrationBoundary>
				{initialQA.questions.length > 0 || (data.questions && data.questions.length > 0) ? (
					<script
						type='application/ld+json'
						dangerouslySetInnerHTML={{
							__html: JSON.stringify({
								'@context': 'https://schema.org',
								'@type': 'FAQPage',
								mainEntity: [
									...initialQA.questions
										.filter((q) => q.answers.length > 0)
										.map((q) => ({
											'@type': 'Question',
											name: q.question,
											acceptedAnswer: {
												'@type': 'Answer',
												text: q.answers[0].answer,
											},
										})),
									...(data.questions || []).map((faq) => ({
										'@type': 'Question',
										name: faq.question,
										acceptedAnswer: {
											'@type': 'Answer',
											text: faq.answer,
										},
									})),
								],
							}),
						}}
					/>
				) : null}
			</div>
		</div>
	);
}

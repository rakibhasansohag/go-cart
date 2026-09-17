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
import type { Metadata } from 'next';
import { generateProductJsonLd, generateBreadcrumbJsonLd } from '@/lib/seo/schema';

type ProductParams = { productSlug: string };
type SearchParams = Record<string, string | string[] | undefined> | undefined;

export async function generateMetadata({
	params,
}: {
	params: Promise<ProductParams>;
}): Promise<Metadata> {
	const awaitedParams = await params;
	const productSlug = awaitedParams?.productSlug;
	if (!productSlug) {
		return {
			title: 'Product',
			description: 'Discover quality products on GoCart Multi-Vendor Marketplace.',
		};
	}

	try {
		const product = await retrieveProductDetailsOptimized(productSlug);
		if (!product) {
			return {
				title: 'Product Not Found',
				description: 'The requested product could not be found on GoCart.',
			};
		}

		const images: string[] = [];
		if (product.variants && product.variants.length > 0) {
			for (const v of product.variants) {
				if (v.images && v.images.length > 0) {
					for (const img of v.images) {
						if (img.url) images.push(img.url);
					}
				} else if (v.variantImage) {
					images.push(v.variantImage);
				}
			}
		}

		const firstPrice = product.variants?.[0]?.sizes?.[0]?.price;
		const formattedPrice = typeof firstPrice === 'number' ? ` - $${firstPrice.toFixed(2)}` : '';
		const title = `${product.name}${formattedPrice}`;
		const description = product.description
			? product.description.slice(0, 160)
			: `Shop ${product.name} on GoCart. High-quality products from trusted marketplace stores.`;

		const baseUrl =
			process.env.NEXT_PUBLIC_APP_URL ||
			(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
		const canonicalUrl = `${baseUrl}/product/${product.slug}`;

		return {
			title,
			description,
			alternates: {
				canonical: canonicalUrl,
			},
			openGraph: {
				title: `${product.name} | GoCart`,
				description,
				url: canonicalUrl,
				images:
					images.length > 0
						? images.map((img) => ({ url: img, alt: product.name }))
						: [{ url: '/og-image.png', alt: product.name }],
				type: 'website',
			},
			twitter: {
				card: 'summary_large_image',
				title: `${product.name} | GoCart`,
				description,
				images: images.length > 0 ? [images[0]] : ['/og-image.png'],
			},
		};
	} catch {
		return {
			title: 'Product',
			description: 'Shop products on GoCart.',
		};
	}
}

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

	const productImages: string[] = [];
	if (data.variants && data.variants.length > 0) {
		for (const v of data.variants) {
			if (v.images && v.images.length > 0) {
				for (const img of v.images) {
					if (img.url) productImages.push(img.url);
				}
			} else if (v.variantImage) {
				productImages.push(v.variantImage);
			}
		}
	}

	const activePrice = variant?.sizes?.[0]?.price ?? data.variants?.[0]?.sizes?.[0]?.price ?? 0;
	const inStock = (variant?.sizes?.some((s) => s.quantity > 0) ?? data.variants?.some((v) => v.sizes?.some((s) => s.quantity > 0))) ?? true;

	const productJsonLd = generateProductJsonLd({
		name: data.name,
		description: data.description,
		slug: data.slug,
		images: productImages,
		sku: variant?.sku || data.variants?.[0]?.sku,
		brand: data.brand,
		categoryName: data.category?.name,
		rating: data.rating,
		numReviews: data._count.reviews,
		price: activePrice,
		inStock,
		storeName: data.store.name,
		storeUrl: data.store.url,
	});

	const breadcrumbJsonLd = generateBreadcrumbJsonLd([
		{ name: 'Home', url: '/' },
		{ name: data.category?.name || 'Browse', url: data.category?.url ? `/browse?category=${data.category.url}` : '/browse' },
		{ name: data.name, url: `/product/${data.slug}` },
	]);

	return (
		<div>
			<Header />
			<CategoriesHeader />
			<div className='p-4 2xl:px-28 overflow-x-hidden mx-auto'>
				<script
					type='application/ld+json'
					dangerouslySetInnerHTML={{
						__html: JSON.stringify(productJsonLd),
					}}
				/>
				<script
					type='application/ld+json'
					dangerouslySetInnerHTML={{
						__html: JSON.stringify(breadcrumbJsonLd),
					}}
				/>
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

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
import { retrieveProductDetailsOptimized } from '@/queries/product-optimized';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

export default async function ProductPage({
	params,
	searchParams,
}: {
	params: { productSlug: string };
	searchParams?: Record<string, string | string[] | undefined>;
}) {
	const awaitedParams = await params;
	const awaitedSearchParams = await (searchParams ?? {});

	const productSlug = awaitedParams.productSlug;
	const variantSlug = (awaitedSearchParams?.variant as string) ?? '';

	// Validate
	if (!productSlug) {
		// either show notFound page or throw
		return redirect('/');
	}

	// Data
	const data = await retrieveProductDetailsOptimized(productSlug);
	if (!data) return notFound();

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
				<ProductPageContainer
					productData={data}
					// pass the awaited primitive
					variantSlug={variantSlug}
					userCountry={userCountry}
				>
					<>
						<Separator />
						<RelatedProducts
							productId={data.id}
							categoryId={data.categoryId}
							subCategoryId={data.subCategoryId}
						/>
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
					<StoreProducts
						storeUrl={data.store.url}
						storeName={data.store.name}
						count={5}
					/>
				</ProductPageContainer>
			</div>
		</div>
	);
}

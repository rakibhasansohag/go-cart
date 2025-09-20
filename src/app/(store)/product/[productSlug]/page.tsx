// DB
import StoreCard from '@/components/store/cards/store-card';
import CategoriesHeader from '@/components/store/layout/categories-header/categories-header';
import Header from '@/components/store/layout/header/header';
import ProductPageContainer from '@/components/store/product-page/container';
import ProductDescription from '@/components/store/product-page/product-description';
import ProductQuestions from '@/components/store/product-page/product-questions';
import ProductSpecs from '@/components/store/product-page/product-specs';

import StoreProducts from '@/components/store/product-page/store-products';
import { Separator } from '@/components/ui/separator';
import { Country } from '@/lib/types';
import { retrieveProductDetailsOptimized } from '@/queries/product-optimized';
import { cookies } from 'next/headers';

export default async function ProductPage({
	params,
	searchParams,
}: {
	params: { productSlug: string };
	searchParams: { variant: string };
}) {
	const data = await retrieveProductDetailsOptimized(params.productSlug);
	const variant = data.variants.find(
		(v: { slug: string }) => v.slug === searchParams.variant,
	);
	const specs = {
		product: data.specs,
		variant: variant?.specs,
	};

	// Get cookies from the store
	const cookieStore = await cookies();
	const userCountryCookie = cookieStore.get('userCountry');

	// Set default country if cookie is missing
	let userCountry: Country = {
		name: 'Bangladesh',
		city: '',
		code: 'BD',
		region: '',
	};

	// If cookie exists, update the user country
	if (userCountryCookie) {
		userCountry = JSON.parse(userCountryCookie.value) as Country;
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
					variantSlug={searchParams.variant}
					userCountry={userCountry}
				>
					<>
						<Separator />
						{/* Related products */}
						<div className='h-6'></div>
					</>
					{/* Product reviews */}
					<Separator className='mt-6' />

					<>
						<Separator className='mt-6' />
						{/* Product description */}
						<ProductDescription
							text={[data.description, variant?.variantDescription || '']}
						/>
					</>
					<Separator className='mt-6' />
					{(specs.product || specs.variant) && <ProductSpecs specs={specs} />}
					<Separator className='mt-6' />
					{data.questions && <ProductQuestions questions={data.questions} />}
					<Separator className='mt-6' />
					<div className='h-6'></div>
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

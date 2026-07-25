import { notFound } from 'next/navigation';
import ProductDetails from '@/components/dashboard/forms/product-details';
import { db } from '@/lib/db';
import { getAllCategoriesWithSubs } from '@/queries/category';
import { getAllOfferTags } from '@/queries/offer-tag';
import { getProductVariant } from '@/queries/product';

export default async function SellerProductVariantDetailsPage({
	params,
}: {
	params: Promise<{ storeUrl: string; productId: string; variantId: string }>;
}) {
	const { storeUrl, productId, variantId } = await params;

	const [variantData, categories, offerTags, countries] = await Promise.all([
		getProductVariant(productId, variantId),
		getAllCategoriesWithSubs(),
		getAllOfferTags(),
		db.country.findMany({
			orderBy: {
				name: 'asc',
			},
		}),
	]);

	if (!variantData) {
		notFound();
	}

	return (
		<div className='w-full'>
			<ProductDetails
				categories={categories}
				storeUrl={storeUrl}
				data={variantData}
				offerTags={offerTags}
				countries={countries}
			/>
		</div>
	);
}

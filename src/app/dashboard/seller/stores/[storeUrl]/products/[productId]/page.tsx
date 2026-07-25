import { notFound } from 'next/navigation';
import ProductDetails from '@/components/dashboard/forms/product-details';
import { db } from '@/lib/db';
import { getAllCategoriesWithSubs } from '@/queries/category';
import { getAllOfferTags } from '@/queries/offer-tag';
import { getProductWithFirstVariant } from '@/queries/product';

export default async function SellerProductMainDetailsPage({
	params,
}: {
	params: Promise<{ storeUrl: string; productId: string }>;
}) {
	const { storeUrl, productId } = await params;

	const [product, categories, offerTags, countries] = await Promise.all([
		getProductWithFirstVariant(productId),
		getAllCategoriesWithSubs(),
		getAllOfferTags(),
		db.country.findMany({
			orderBy: {
				name: 'asc',
			},
		}),
	]);

	if (!product) {
		notFound();
	}

	return (
		<div className='w-full'>
			<ProductDetails
				categories={categories}
				storeUrl={storeUrl}
				data={product}
				offerTags={offerTags}
				countries={countries}
			/>
		</div>
	);
}

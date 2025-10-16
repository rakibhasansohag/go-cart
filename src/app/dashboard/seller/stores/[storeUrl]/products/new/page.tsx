import ProductDetails from '@/components/dashboard/forms/product-details';
import { db } from '@/lib/db';
import { getAllCategoriesWithSubs } from '@/queries/category';
import { getAllOfferTags } from '@/queries/offer-tag';

// types
type StoreParams = { storeUrl: string };

// Metadata
export const generateMetadata = async ({
	params,
}: {
	params: Promise<StoreParams>;
}) => {
	const { storeUrl } = await params;
	return {
		title: `Create New Product | ${storeUrl}`,
	};
};

interface Params {
	params: Promise<StoreParams>;
}

export default async function SellerNewProductPage({ params }: Params) {
	const { storeUrl } = await params;

	const categories = await getAllCategoriesWithSubs();
	const offerTags = await getAllOfferTags();

	const countries = await db.country.findMany({
		orderBy: {
			name: 'asc',
		},
	});

	return (
		<div className='w-full'>
			<ProductDetails
				categories={categories}
				storeUrl={storeUrl}
				offerTags={offerTags}
				countries={countries}
			/>
		</div>
	);
}

import ProductDetails from '@/components/dashboard/forms/product-details';
import { db } from '@/lib/db';
import { getAllCategories } from '@/queries/category';
import { getAllOfferTags } from '@/queries/offer-tag';

export const generateMetadata = async ({
	params,
}: {
	params: { storeUrl: string };
}) => {
	const { storeUrl } = await params;
	return {
		title: `Create New Product | ${storeUrl}`,
	};
};

interface Params {
	params: Promise<{ storeUrl: string }>;
}

export default async function SellerNewProductPage({ params }: Params) {
	const { storeUrl } = await params;

	const categories = await getAllCategories();
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

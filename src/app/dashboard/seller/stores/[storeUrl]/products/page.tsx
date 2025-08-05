// Queries
import { getAllStoreProducts } from '@/queries/product';
import DataTable from '@/components/ui/data-table';
import { columns } from './columns';
import { Plus } from 'lucide-react';
import ProductDetails from '@/components/dashboard/forms/product-details';
import { getAllCategories } from '@/queries/category';
import { getAllOfferTags } from '@/queries/offer-tag';
import { db } from '@/lib/db';

export default async function SellerProductsPage({
	params,
}: {
	params: { storeUrl: string };
}) {
	const { storeUrl } = await params;

	// Fetching products data from the database for the active store
	const products = await getAllStoreProducts(storeUrl);

	const categories = await getAllCategories();
	const offerTags = await getAllOfferTags();

	const countries = await db.country.findMany({
		orderBy: {
			createdAt: 'desc',
		},
	});

	return (
		<DataTable
			actionButtonText={
				<>
					<Plus size={15} />
					Create product
				</>
			}
			modalChildren={
				<ProductDetails
					categories={categories}
					offerTags={offerTags}
					storeUrl={storeUrl}
					countries={countries}
				/>
			}
			newTabLink={`/dashboard/seller/stores/${storeUrl}/products/new`}
			filterValue='name'
			data={products}
			columns={columns}
			searchPlaceholder='Search product name...'
			maxWidth='lg:max-w-6xl'
		/>
	);
}

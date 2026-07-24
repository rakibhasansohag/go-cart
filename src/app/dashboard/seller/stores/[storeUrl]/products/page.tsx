import { Suspense } from 'react';
import ProductsTable from './products-table';
import DataTableSkeleton from '@/components/dashboard/shared/table-skeleton';
import { getAllStoreProducts } from '@/queries/product';
import { getAllCategoriesWithSubs } from '@/queries/category';
import { getAllOfferTags } from '@/queries/offer-tag';
import { getAllCountries } from '@/queries/country';

type StoreParams = { storeUrl: string };

export default async function SellerProductsPage({
	params,
}: {
	params: Promise<StoreParams>;
}) {
	const { storeUrl } = await params;

	const [productsRes, categories, offerTags, countries] = await Promise.all([
		getAllStoreProducts(storeUrl),
		getAllCategoriesWithSubs(),
		getAllOfferTags(),
		getAllCountries(),
	]);

	return (
		<Suspense fallback={<DataTableSkeleton />}>
			<ProductsTable
				storeUrl={storeUrl}
				initialProducts={productsRes.products}
				categories={categories}
				offerTags={offerTags}
				countries={countries}
			/>
		</Suspense>
	);
}

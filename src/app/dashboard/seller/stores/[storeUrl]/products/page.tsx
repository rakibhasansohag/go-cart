import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import { getAllStoreProducts } from '@/queries/product';
import { getAllCategoriesWithSubs } from '@/queries/category';
import { getAllOfferTags } from '@/queries/offer-tag';
import { db } from '@/lib/db';
import { queryKeys } from '@/lib/query-keys';
import ProductsTable from './products-table';
import DataTableSkeleton from '@/components/dashboard/shared/table-skeleton';

type StoreParams = { storeUrl: string };

export default async function SellerProductsPage({
	params,
}: {
	params: Promise<StoreParams>;
}) {
	const { storeUrl } = await params;
	const queryClient = getQueryClient();

	queryClient.prefetchQuery({
		queryKey: queryKeys.dashboard.products(storeUrl),
		queryFn: () => getAllStoreProducts(storeUrl),
	});

	const [categories, offerTags, countries] = await Promise.all([
		getAllCategoriesWithSubs(),
		getAllOfferTags(),
		db.country.findMany({
			orderBy: {
				createdAt: 'desc',
			},
		}),
	]);

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<Suspense fallback={<DataTableSkeleton />}>
				<ProductsTable
					storeUrl={storeUrl}
					categories={categories}
					offerTags={offerTags}
					countries={countries}
				/>
			</Suspense>
		</HydrationBoundary>
	);
}

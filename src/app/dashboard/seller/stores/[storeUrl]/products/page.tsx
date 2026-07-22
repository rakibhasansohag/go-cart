import { Suspense } from 'react';
import ProductsTable from './products-table';
import DataTableSkeleton from '@/components/dashboard/shared/table-skeleton';

type StoreParams = { storeUrl: string };

export default async function SellerProductsPage({
	params,
}: {
	params: Promise<StoreParams>;
}) {
	const { storeUrl } = await params;

	return (
		<Suspense fallback={<DataTableSkeleton />}>
			<ProductsTable storeUrl={storeUrl} />
		</Suspense>
	);
}

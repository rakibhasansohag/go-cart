import { Suspense } from 'react';
import OrdersTable from './orders-table';
import DataTableSkeleton from '@/components/dashboard/shared/table-skeleton';
import { getStoreOrders } from '@/queries/store';

type StoreParams = { storeUrl: string };

export default async function SellerOrdersPage({
	params,
}: {
	params: Promise<StoreParams>;
}) {
	const { storeUrl } = await params;

	const initialData = await getStoreOrders(storeUrl, { page: 1, limit: 10 });

	return (
		<Suspense fallback={<DataTableSkeleton />}>
			<OrdersTable storeUrl={storeUrl} initialData={initialData} />
		</Suspense>
	);
}

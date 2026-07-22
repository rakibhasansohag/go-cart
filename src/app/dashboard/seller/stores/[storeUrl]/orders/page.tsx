import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import OrdersTable from './orders-table';
import DataTableSkeleton from '@/components/dashboard/shared/table-skeleton';

type StoreParams = { storeUrl: string };

export default async function SellerOrdersPage({
	params,
}: {
	params: Promise<StoreParams>;
}) {
	const { storeUrl } = await params;

	if (!storeUrl) {
		return notFound();
	}

	return (
		<Suspense fallback={<DataTableSkeleton />}>
			<OrdersTable storeUrl={storeUrl} />
		</Suspense>
	);
}

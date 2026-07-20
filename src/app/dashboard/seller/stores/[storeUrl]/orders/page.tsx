import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import { getStoreOrders } from '@/queries/store';
import { queryKeys } from '@/lib/query-keys';
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

	const queryClient = getQueryClient();

	await queryClient.prefetchQuery({
		queryKey: queryKeys.dashboard.orders(storeUrl),
		queryFn: () => getStoreOrders(storeUrl),
	});

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<Suspense fallback={<DataTableSkeleton />}>
				<OrdersTable storeUrl={storeUrl} />
			</Suspense>
		</HydrationBoundary>
	);
}

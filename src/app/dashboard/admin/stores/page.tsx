import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import { getAllStores } from '@/queries/store';
import { queryKeys } from '@/lib/query-keys';
import StoresTable from './stores-table';
import DataTableSkeleton from '@/components/dashboard/shared/table-skeleton';

export default async function AdminStoresPage() {
	const queryClient = getQueryClient();

	queryClient.prefetchQuery({
		queryKey: queryKeys.dashboard.stores(),
		queryFn: () => getAllStores(),
	});

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<Suspense fallback={<DataTableSkeleton />}>
				<StoresTable />
			</Suspense>
		</HydrationBoundary>
	);
}

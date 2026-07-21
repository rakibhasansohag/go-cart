import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import { getAllAdminOrders } from '@/queries/analytics';
import { queryKeys } from '@/lib/query-keys';
import AdminOrdersTable from './admin-orders-table';
import DataTableSkeleton from '@/components/dashboard/shared/table-skeleton';

export default async function AdminOrdersPage() {
	const queryClient = getQueryClient();

	queryClient.prefetchQuery({
		queryKey: queryKeys.dashboard.adminOrders(),
		queryFn: () => getAllAdminOrders(),
	});

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<Suspense fallback={<DataTableSkeleton />}>
				<AdminOrdersTable />
			</Suspense>
		</HydrationBoundary>
	);
}

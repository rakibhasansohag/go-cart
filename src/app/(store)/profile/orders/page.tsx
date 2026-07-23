import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import { queryKeys } from '@/lib/query-keys';
import { getUserOrders } from '@/queries/profile';
import OrdersTable, { OrdersTableSkeleton } from '@/components/store/profile/orders/orders-table';

export const dynamic = 'force-dynamic';

export default async function ProfileOrdersPage() {
	const queryClient = getQueryClient();

	await queryClient.prefetchQuery({
		queryKey: queryKeys.profile.orders({ filter: '', period: '', search: '', page: 1, pageSize: 10 }),
		queryFn: () => getUserOrders('', '', '', 1, 10),
	});

	return (
		<div>
			<HydrationBoundary state={dehydrate(queryClient)}>
				<Suspense fallback={<OrdersTableSkeleton />}>
					<OrdersTable />
				</Suspense>
			</HydrationBoundary>
		</div>
	);
}

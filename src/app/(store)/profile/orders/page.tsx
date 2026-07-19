import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import { queryKeys } from '@/lib/query-keys';
import { getUserOrders } from '@/queries/profile';
import OrdersTable from '@/components/store/profile/orders/orders-table';

export default async function ProfileOrdersPage() {
	const queryClient = getQueryClient();

	await queryClient.prefetchQuery({
		queryKey: queryKeys.profile.orders({ filter: '', period: '', search: '', page: 1 }),
		queryFn: () => getUserOrders('', '', '', 1),
	});

	return (
		<div>
			<HydrationBoundary state={dehydrate(queryClient)}>
				<Suspense fallback={<div className="flex items-center justify-center p-8">Loading orders...</div>}>
					<OrdersTable />
				</Suspense>
			</HydrationBoundary>
		</div>
	);
}

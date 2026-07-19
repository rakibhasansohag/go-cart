import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import { queryKeys } from '@/lib/query-keys';
import OrdersTable from '@/components/store/profile/orders/orders-table';
import { OrderTableFilter } from '@/lib/types';
import { getUserOrders } from '@/queries/profile';

export default async function ProfileFilteredOrderPage({
	params,
}: {
	params: Promise<{ filter: string }>;
}) {
	const awaitedParams = await params;

	const filter = awaitedParams.filter
		? (awaitedParams.filter as OrderTableFilter)
		: '';

	const queryClient = getQueryClient();

	await queryClient.prefetchQuery({
		queryKey: queryKeys.profile.orders({ filter, period: '', search: '', page: 1 }),
		queryFn: () => getUserOrders(filter, '', '', 1),
	});

	return (
		<div>
			<HydrationBoundary state={dehydrate(queryClient)}>
				<Suspense fallback={<div className="flex items-center justify-center p-8">Loading orders...</div>}>
					<OrdersTable prev_filter={filter} />
				</Suspense>
			</HydrationBoundary>
		</div>
	);
}

import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import {
	getStoreDefaultShippingDetails,
	getStoreShippingRates,
} from '@/queries/store';
import { queryKeys } from '@/lib/query-keys';
import ShippingView from './shipping-view';
import DataTableSkeleton from '@/components/dashboard/shared/table-skeleton';

type StoreParams = { storeUrl: string };

export default async function SellerStoreShippingPage({
	params,
}: {
	params: Promise<StoreParams>;
}) {
	const { storeUrl } = await params;
	const queryClient = getQueryClient();

	queryClient.prefetchQuery({
		queryKey: queryKeys.dashboard.shipping(storeUrl),
		queryFn: async () => {
			const [details, rates] = await Promise.all([
				getStoreDefaultShippingDetails(storeUrl),
				getStoreShippingRates(storeUrl),
			]);
			return { details, rates };
		},
	});

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<Suspense fallback={<DataTableSkeleton />}>
				<ShippingView storeUrl={storeUrl} />
			</Suspense>
		</HydrationBoundary>
	);
}

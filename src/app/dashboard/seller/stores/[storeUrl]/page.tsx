import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import { getSellerStoreAnalyticsData } from '@/queries/analytics';
import { queryKeys } from '@/lib/query-keys';
import SellerOverview from './seller-overview';
import DataTableSkeleton from '@/components/dashboard/shared/table-skeleton';

type StoreParams = { storeUrl: string };

export default async function SellerStoresPage({
	params,
}: {
	params: Promise<StoreParams>;
}) {
	const { storeUrl } = await params;
	const queryClient = getQueryClient();

	await queryClient.prefetchQuery({
		queryKey: queryKeys.dashboard.sellerAnalytics(storeUrl),
		queryFn: () => getSellerStoreAnalyticsData(storeUrl),
	});

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<Suspense fallback={<DataTableSkeleton />}>
				<SellerOverview storeUrl={storeUrl} />
			</Suspense>
		</HydrationBoundary>
	);
}

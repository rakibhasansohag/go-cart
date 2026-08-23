import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import { queryKeys } from '@/lib/query-keys';
import { getSellerStoreAnalyticsData } from '@/queries/analytics';
import SellerOverview from './seller-overview';
import OverviewSkeleton from '@/components/dashboard/shared/overview-skeleton';

type StoreParams = { storeUrl: string };

export default async function SellerStoresPage({
	params,
}: {
	params: Promise<StoreParams>;
}) {
	const { storeUrl } = await params;
	const queryClient = getQueryClient();
	await queryClient.prefetchQuery({
		queryKey: queryKeys.dashboard.sellerAnalytics(storeUrl, 'all'),
		queryFn: () => getSellerStoreAnalyticsData(storeUrl, 'all'),
	});

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<Suspense fallback={<OverviewSkeleton />}>
				<SellerOverview storeUrl={storeUrl} />
			</Suspense>
		</HydrationBoundary>
	);
}

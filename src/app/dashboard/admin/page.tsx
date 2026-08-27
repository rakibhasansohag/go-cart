import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import { queryKeys } from '@/lib/query-keys';
import { getAdminAnalyticsData } from '@/queries/analytics';
import AdminOverview from './admin-overview';
import OverviewSkeleton from '@/components/dashboard/shared/overview-skeleton';

export default async function AdminDashboardPage() {
	const queryClient = getQueryClient();
	await queryClient.prefetchQuery({
		queryKey: queryKeys.dashboard.adminAnalytics(),
		queryFn: () => getAdminAnalyticsData(),
	});

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<Suspense fallback={<OverviewSkeleton />}>
				<AdminOverview />
			</Suspense>
		</HydrationBoundary>
	);
}

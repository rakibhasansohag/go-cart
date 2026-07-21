import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import { getStoreCoupons } from '@/queries/coupon';
import { queryKeys } from '@/lib/query-keys';
import CouponsTable from './coupons-table';
import DataTableSkeleton from '@/components/dashboard/shared/table-skeleton';

type StoreParams = { storeUrl: string };

export default async function SellerCouponsPage({
	params,
}: {
	params: Promise<StoreParams>;
}) {
	const { storeUrl } = await params;
	const queryClient = getQueryClient();

	queryClient.prefetchQuery({
		queryKey: queryKeys.dashboard.coupons(storeUrl),
		queryFn: () => getStoreCoupons(storeUrl),
	});

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<Suspense fallback={<DataTableSkeleton />}>
				<CouponsTable storeUrl={storeUrl} />
			</Suspense>
		</HydrationBoundary>
	);
}

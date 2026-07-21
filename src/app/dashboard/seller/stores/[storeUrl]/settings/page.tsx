import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import { queryKeys } from '@/lib/query-keys';
import StoreSettingsView from './store-settings-view';
import DataTableSkeleton from '@/components/dashboard/shared/table-skeleton';

type StoreParams = { storeUrl: string };

export default async function SellerStoreSettingsPage({
	params,
}: {
	params: Promise<StoreParams>;
}) {
	const { storeUrl } = await params;

	const storeDetails = await db.store.findUnique({
		where: {
			url: storeUrl,
		},
	});

	if (!storeDetails) redirect('/dashboard/seller/stores');

	const queryClient = getQueryClient();

	queryClient.prefetchQuery({
		queryKey: queryKeys.dashboard.storeSettings(storeUrl),
		queryFn: async () => storeDetails,
	});

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<Suspense fallback={<DataTableSkeleton />}>
				<StoreSettingsView
					storeUrl={storeUrl}
					initialStoreDetails={storeDetails}
				/>
			</Suspense>
		</HydrationBoundary>
	);
}

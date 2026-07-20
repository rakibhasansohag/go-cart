import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import { getAllOfferTags } from '@/queries/offer-tag';
import { queryKeys } from '@/lib/query-keys';
import OfferTagsTable from './offer-tags-table';
import DataTableSkeleton from '@/components/dashboard/shared/table-skeleton';

export default async function AdminOfferTagsPage() {
	const queryClient = getQueryClient();

	await queryClient.prefetchQuery({
		queryKey: queryKeys.dashboard.offerTags(),
		queryFn: () => getAllOfferTags(),
	});

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<Suspense fallback={<DataTableSkeleton />}>
				<OfferTagsTable />
			</Suspense>
		</HydrationBoundary>
	);
}

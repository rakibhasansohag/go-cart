import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import AddressContainer from '@/components/store/profile/addresses/container';
import { db } from '@/lib/db';
import { getUserShippingAddresses } from '@/queries/user';
import { queryKeys } from '@/lib/query-keys';
import DataTableSkeleton from '@/components/dashboard/shared/table-skeleton';

export const dynamic = 'force-dynamic';

export default async function ProfileAddressesPage() {
	const queryClient = getQueryClient();

	const [, countries] = await Promise.all([
		queryClient.prefetchQuery({
			queryKey: queryKeys.profile.addresses(),
			queryFn: () => getUserShippingAddresses(),
		}),
		db.country.findMany(),
	]);

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<Suspense fallback={<DataTableSkeleton />}>
				<AddressContainer countries={countries} />
			</Suspense>
		</HydrationBoundary>
	);
}

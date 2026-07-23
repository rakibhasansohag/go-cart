import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import { queryKeys } from '@/lib/query-keys';
import PaymentsTable from '@/components/store/profile/payments/payments-table';
import { getUserPayments } from '@/queries/profile';
import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ProfilePaymentPage() {
	const user = await currentUser();
	console.log('server currentUser() =>', !!user, user?.id);
	if (!user) {
		// send user to sign-in
		redirect(`/sign-in?redirect=/profile/payment`);
	}

	const queryClient = getQueryClient();

	await queryClient.prefetchQuery({
		queryKey: queryKeys.profile.payments({ filter: '', period: '', search: '', page: 1, pageSize: 10 }),
		queryFn: () => getUserPayments('', '', '', 1, 10),
	});

	return (
		<div>
			<HydrationBoundary state={dehydrate(queryClient)}>
				<Suspense fallback={<div className="flex items-center justify-center p-8">Loading payments...</div>}>
					<PaymentsTable />
				</Suspense>
			</HydrationBoundary>
		</div>
	);
}

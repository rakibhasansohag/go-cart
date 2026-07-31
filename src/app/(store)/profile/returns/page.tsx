import type { Metadata } from 'next';
import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import ReturnsList, {
	ReturnsListSkeleton,
} from '@/components/store/profile/returns/returns-list';
import { getQueryClient } from '@/lib/get-query-client';
import { queryKeys } from '@/lib/query-keys';
import { getCustomerReturns } from '@/queries/returns';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
	title: 'Your Returns | GoCart',
	description: 'Track return, exchange, and refund requests for your GoCart orders.',
	robots: { index: false, follow: false },
};

export default async function CustomerReturnsPage() {
	const queryClient = getQueryClient();
	const filters = { status: 'ALL', page: 1, pageSize: 10 };

	await queryClient.prefetchQuery({
		queryKey: queryKeys.profile.returns(filters),
		queryFn: () => getCustomerReturns('ALL', 1, 10),
	});

	return (
		<main className='space-y-6 pb-10'>
			<header>
				<h1 className='text-2xl font-bold tracking-tight'>Returns Center</h1>
				<p className='mt-2 max-w-2xl text-sm leading-6 text-muted-foreground'>
					Request a return from an eligible delivered order, follow each
					review step, and see refund or exchange updates in one place.
				</p>
			</header>

			<HydrationBoundary state={dehydrate(queryClient)}>
				<Suspense fallback={<ReturnsListSkeleton />}>
					<ReturnsList />
				</Suspense>
			</HydrationBoundary>
		</main>
	);
}

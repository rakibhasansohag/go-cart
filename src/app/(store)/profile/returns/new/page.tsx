import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import ReturnRequestForm, {
	ReturnRequestFormSkeleton,
} from '@/components/store/profile/returns/return-request-form';
import { getQueryClient } from '@/lib/get-query-client';
import { queryKeys } from '@/lib/query-keys';
import { getReturnCandidate } from '@/queries/returns';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
	title: 'Request a Return | GoCart',
	description: 'Request a refund or exchange for an eligible GoCart order item.',
	robots: { index: false, follow: false },
};

export default async function NewReturnPage({
	searchParams,
}: {
	searchParams: Promise<{ itemId?: string }>;
}) {
	const { itemId } = await searchParams;

	if (!itemId) {
		return (
			<main className='pb-10'>
				<section className='rounded-2xl border border-border bg-card p-8 text-center'>
					<h1 className='text-xl font-semibold'>Choose an order item</h1>
					<p className='mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground'>
						Open a delivered order and select “Request return” beside the
						item you want to return.
					</p>
					<Button asChild variant='outline' className='mt-5'>
						<Link href='/profile/orders'>View orders</Link>
					</Button>
				</section>
			</main>
		);
	}

	const queryClient = getQueryClient();
	await queryClient.prefetchQuery({
		queryKey: queryKeys.profile.returnCandidate(itemId),
		queryFn: () => getReturnCandidate(itemId),
	});

	return (
		<main className='space-y-6 pb-10'>
			<header>
				<h1 className='text-2xl font-bold tracking-tight'>Request a return</h1>
				<p className='mt-2 max-w-2xl text-sm leading-6 text-muted-foreground'>
					Choose a resolution, describe the issue, and attach evidence if it
					will help the store review your request.
				</p>
			</header>

			<HydrationBoundary state={dehydrate(queryClient)}>
				<Suspense fallback={<ReturnRequestFormSkeleton />}>
					<ReturnRequestForm orderItemId={itemId} />
				</Suspense>
			</HydrationBoundary>
		</main>
	);
}

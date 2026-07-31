import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import ReturnDetail, {
	ReturnDetailSkeleton,
} from '@/components/store/profile/returns/return-detail';
import { getQueryClient } from '@/lib/get-query-client';
import { queryKeys } from '@/lib/query-keys';
import { getCustomerReturn } from '@/queries/returns';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
	title: 'Return Request | GoCart',
	description: 'Review the status and timeline of your GoCart return request.',
	robots: { index: false, follow: false },
};

export default async function CustomerReturnDetailPage({
	params,
}: {
	params: Promise<{ returnId: string }>;
}) {
	const { returnId } = await params;
	const queryClient = getQueryClient();
	const request = await getCustomerReturn(returnId);

	if (!request) notFound();

	queryClient.setQueryData(
		queryKeys.profile.returnDetail(returnId),
		request,
	);

	return (
		<main className='space-y-6 pb-10'>
			<header>
				<h1 className='text-2xl font-bold tracking-tight'>
					Return #{returnId.slice(-8).toUpperCase()}
				</h1>
				<p className='mt-2 text-sm text-muted-foreground'>
					Track the review, shipment, and resolution history for this request.
				</p>
			</header>

			<HydrationBoundary state={dehydrate(queryClient)}>
				<Suspense fallback={<ReturnDetailSkeleton />}>
					<ReturnDetail returnRequestId={returnId} />
				</Suspense>
			</HydrationBoundary>
		</main>
	);
}

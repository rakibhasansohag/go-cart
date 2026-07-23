import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import { queryKeys } from '@/lib/query-keys';
import ReviewsContainer from '@/components/store/profile/reviews/reviews-container';
import { getUserReviews } from '@/queries/profile';
import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ProfileReviewsPage() {
	const user = await currentUser();
	if (!user) {
		// send user to sign-in
		redirect(`/sign-in?redirect=/profile/reviews`);
	}

	const queryClient = getQueryClient();

	await queryClient.prefetchQuery({
		queryKey: queryKeys.profile.reviews({ filter: '', period: '', search: '', page: 1, pageSize: 10 }),
		queryFn: () => getUserReviews('', '', '', 1, 10),
	});

	return (
		<div className='bg-background py-4 px-4 sm:px-6 rounded-xl border border-border/10 shadow-sm'>
			<h1 className='text-lg mb-1 font-bold'>Your reviews</h1>
			<HydrationBoundary state={dehydrate(queryClient)}>
				<Suspense fallback={<div className="flex items-center justify-center p-8">Loading reviews...</div>}>
					<ReviewsContainer />
				</Suspense>
			</HydrationBoundary>
		</div>
	);
}

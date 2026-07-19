import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import { queryKeys } from '@/lib/query-keys';
import FollowingContainer from '@/components/store/profile/following/container';
import { getUserFollowedStores } from '@/queries/profile';

export default async function ProfileFollowingPage({
	params,
}: {
	params: Promise<{ page: string }>;
}) {
	const awaitedParams = await params;

	const page = awaitedParams.page ? Number(awaitedParams.page) : 1;
	const queryClient = getQueryClient();

	await queryClient.prefetchQuery({
		queryKey: queryKeys.profile.following(page),
		queryFn: () => getUserFollowedStores(page),
	});

	return (
		<div className='bg-background py-4 px-6 rounded-xl'>
			<h1 className='text-lg mb-3 font-bold'>Stores you follow</h1>
			<HydrationBoundary state={dehydrate(queryClient)}>
				<Suspense fallback={<div className="flex items-center justify-center p-8">Loading stores...</div>}>
					<FollowingContainer page={page} />
				</Suspense>
			</HydrationBoundary>
		</div>
	);
}

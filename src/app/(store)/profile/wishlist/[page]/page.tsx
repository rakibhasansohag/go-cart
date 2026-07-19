import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import { queryKeys } from '@/lib/query-keys';
import WishlistContainer from '@/components/store/profile/wishlist/container';
import { getUserWishlist } from '@/queries/profile';

export default async function ProfileWishlistPage({
	params,
}: {
	params: Promise<{ page: string }>;
}) {
	const awaitedParams = await params;

	const page = Number(awaitedParams.page) || 1;
	const queryClient = getQueryClient();

	await queryClient.prefetchQuery({
		queryKey: queryKeys.profile.wishlist(page),
		queryFn: () => getUserWishlist(page),
	});

	return (
		<div className='bg-background py-4 px-6 rounded-xl'>
			<h1 className='text-lg mb-5 font-bold'>Your Wishlist</h1>
			<HydrationBoundary state={dehydrate(queryClient)}>
				<Suspense fallback={<div className="flex items-center justify-center p-8">Loading wishlist...</div>}>
					<WishlistContainer page={page} />
				</Suspense>
			</HydrationBoundary>
		</div>
	);
}

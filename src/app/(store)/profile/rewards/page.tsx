import RewardsContent from '@/components/store/profile/rewards/rewards-content';
import { queryKeys } from '@/lib/query-keys';
import { getUserLoyaltyAccount } from '@/queries/loyalty';
import { auth } from '@clerk/nextjs/server';
import {
	dehydrate,
	HydrationBoundary,
	QueryClient,
} from '@tanstack/react-query';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function RewardsPage() {
	const { userId } = await auth();
	if (!userId) redirect('/sign-in?redirect_url=/profile/rewards');

	const queryClient = new QueryClient();

	await queryClient.prefetchQuery({
		queryKey: queryKeys.profile.loyalty(1),
		queryFn: () => getUserLoyaltyAccount(1, 10),
	});

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<RewardsContent initialPage={1} />
		</HydrationBoundary>
	);
}

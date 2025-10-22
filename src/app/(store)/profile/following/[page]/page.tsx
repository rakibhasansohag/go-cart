import FollowingContainer from '@/components/store/profile/following/container';
import { getUserFollowedStores } from '@/queries/profile';

export default async function ProfileFollowingPage({
	params,
}: {
	params: Promise<{ page: string }>;
}) {
	const awaitedParams = await params;

	const page = awaitedParams.page ? Number(awaitedParams.page) : 1;
	const res = await getUserFollowedStores(page);
	return (
		<div className='bg-background py-4 px-6 rounded-xl'>
			<h1 className='text-lg mb-3 font-bold'>Stores you follow</h1>
			<FollowingContainer
				stores={res.stores}
				page={page}
				totalPages={res.totalPages}
			/>
		</div>
	);
}

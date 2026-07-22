import { Suspense } from 'react';
import SellerOverview from './seller-overview';
import OverviewSkeleton from '@/components/dashboard/shared/overview-skeleton';

type StoreParams = { storeUrl: string };

export default async function SellerStoresPage({
	params,
}: {
	params: Promise<StoreParams>;
}) {
	const { storeUrl } = await params;

	return (
		<Suspense fallback={<OverviewSkeleton />}>
			<SellerOverview storeUrl={storeUrl} />
		</Suspense>
	);
}

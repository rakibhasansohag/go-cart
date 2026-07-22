import { Suspense } from 'react';
import CouponsTable from './coupons-table';
import DataTableSkeleton from '@/components/dashboard/shared/table-skeleton';

type StoreParams = { storeUrl: string };

export default async function SellerCouponsPage({
	params,
}: {
	params: Promise<StoreParams>;
}) {
	const { storeUrl } = await params;

	return (
		<Suspense fallback={<DataTableSkeleton />}>
			<CouponsTable storeUrl={storeUrl} />
		</Suspense>
	);
}

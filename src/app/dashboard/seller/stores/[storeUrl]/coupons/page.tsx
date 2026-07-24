import { Suspense } from 'react';
import CouponsTable from './coupons-table';
import DataTableSkeleton from '@/components/dashboard/shared/table-skeleton';
import { getStoreCoupons } from '@/queries/coupon';

type StoreParams = { storeUrl: string };

export default async function SellerCouponsPage({
	params,
}: {
	params: Promise<StoreParams>;
}) {
	const { storeUrl } = await params;
	const coupons = await getStoreCoupons(storeUrl);

	return (
		<Suspense fallback={<DataTableSkeleton />}>
			<CouponsTable storeUrl={storeUrl} initialCoupons={coupons} />
		</Suspense>
	);
}

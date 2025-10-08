// Queries
import DataTable from '@/components/ui/data-table';
import { columns } from './columns';
import { Plus } from 'lucide-react';
import { getStoreCoupons } from '@/queries/coupon';
import CouponDetails from '@/components/dashboard/forms/coupon-details';


// Type for awaited params
type StoreParams = { storeUrl: string };

export default async function SellerCouponsPage({
	params,
}: {
	// Next 15 app routes pass awaitable proxies type as Promise<...>
	params: Promise<StoreParams>;
}) {
	// await the whole proxy first (Next 15 requirement)
	const { storeUrl } = await params;

	// Get all store coupons
	const coupons = await getStoreCoupons(storeUrl);
	return (
		<div>
			<DataTable
				actionButtonText={
					<>
						<Plus size={15} />
						Create coupon
					</>
				}
				modalChildren={<CouponDetails storeUrl={storeUrl} />}
				newTabLink={`/dashboard/seller/stores/${storeUrl}/coupons/new`}
				filterValue='code'
				data={coupons}
				columns={columns}
				searchPlaceholder='Search coupon ...'
			/>
		</div>
	);
}

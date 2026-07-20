'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import DataTable from '@/components/ui/data-table';
import { getStoreCoupons } from '@/queries/coupon';
import CouponDetails from '@/components/dashboard/forms/coupon-details';
import { columns } from './columns';
import { queryKeys } from '@/lib/query-keys';

interface CouponsTableProps {
	storeUrl: string;
}

export default function CouponsTable({ storeUrl }: CouponsTableProps) {
	const { data: coupons } = useSuspenseQuery({
		queryKey: queryKeys.dashboard.coupons(storeUrl),
		queryFn: () => getStoreCoupons(storeUrl),
	});

	if (!coupons) return null;

	return (
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
	);
}

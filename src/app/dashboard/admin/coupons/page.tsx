import { Suspense } from 'react';
import AdminCouponsTable from './admin-coupons-table';
import DataTableSkeleton from '@/components/dashboard/shared/table-skeleton';
import { getAllAdminCoupons } from '@/queries/coupon';

export default async function AdminCouponsPage() {
	const initialData = await getAllAdminCoupons({ page: 1, limit: 10 });

	return (
		<Suspense fallback={<DataTableSkeleton />}>
			<AdminCouponsTable initialData={initialData} />
		</Suspense>
	);
}

import { Suspense } from 'react';
import AdminOrdersTable from './admin-orders-table';
import DataTableSkeleton from '@/components/dashboard/shared/table-skeleton';
import { getAllAdminOrders } from '@/queries/analytics';

export default async function AdminOrdersPage() {
	const initialData = await getAllAdminOrders({ page: 1, limit: 10 });

	return (
		<Suspense fallback={<DataTableSkeleton />}>
			<AdminOrdersTable initialData={initialData} />
		</Suspense>
	);
}

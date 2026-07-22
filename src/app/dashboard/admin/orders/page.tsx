import { Suspense } from 'react';
import AdminOrdersTable from './admin-orders-table';
import DataTableSkeleton from '@/components/dashboard/shared/table-skeleton';

export default function AdminOrdersPage() {
	return (
		<Suspense fallback={<DataTableSkeleton />}>
			<AdminOrdersTable />
		</Suspense>
	);
}

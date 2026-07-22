import { Suspense } from 'react';
import StoresTable from './stores-table';
import DataTableSkeleton from '@/components/dashboard/shared/table-skeleton';

export default function AdminStoresPage() {
	return (
		<Suspense fallback={<DataTableSkeleton />}>
			<StoresTable />
		</Suspense>
	);
}

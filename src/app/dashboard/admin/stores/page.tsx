import { Suspense } from 'react';
import StoresTable from './stores-table';
import DataTableSkeleton from '@/components/dashboard/shared/table-skeleton';
import { getAllStores } from '@/queries/store';

export default async function AdminStoresPage() {
	const initialData = await getAllStores({ page: 1, limit: 10 });

	return (
		<Suspense fallback={<DataTableSkeleton />}>
			<StoresTable initialData={initialData} />
		</Suspense>
	);
}

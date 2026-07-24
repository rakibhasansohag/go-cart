import { Suspense } from 'react';
import StoresTable from './stores-table';
import DataTableSkeleton from '@/components/dashboard/shared/table-skeleton';
import { getAllStores } from '@/queries/store';

export default async function AdminStoresPage() {
	const stores = await getAllStores();

	return (
		<Suspense fallback={<DataTableSkeleton />}>
			<StoresTable initialStores={stores} />
		</Suspense>
	);
}

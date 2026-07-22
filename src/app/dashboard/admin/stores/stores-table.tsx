'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import DataTable from '@/components/ui/data-table';
import { getAllStores } from '@/queries/store';
import { columns } from './columns';
import { queryKeys } from '@/lib/query-keys';

export default function StoresTable() {
	const { data: stores } = useSuspenseQuery({
		queryKey: queryKeys.dashboard.stores(),
		queryFn: () => getAllStores(),
	});

	if (!stores) return null;

	return (
		<DataTable
			filterValue='name'
			data={stores}
			searchPlaceholder='Search store name...'
			columns={columns}
		/>
	);
}

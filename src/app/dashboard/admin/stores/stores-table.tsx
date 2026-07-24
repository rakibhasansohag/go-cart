'use client';

import { useQuery } from '@tanstack/react-query';
import DataTable from '@/components/ui/data-table';
import { getAllStores } from '@/queries/store';
import { columns } from './columns';
import { queryKeys } from '@/lib/query-keys';
import { AdminStoreType } from '@/lib/types';

interface StoresTableProps {
	initialStores?: AdminStoreType[];
}

export default function StoresTable({ initialStores }: StoresTableProps) {
	const { data: stores } = useQuery({
		queryKey: queryKeys.dashboard.stores(),
		queryFn: () => getAllStores(),
		initialData: initialStores,
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

'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import DataTable from '@/components/ui/data-table';
import { getStoreOrders } from '@/queries/store';
import { columns } from './columns';
import { queryKeys } from '@/lib/query-keys';

interface OrdersTableProps {
	storeUrl: string;
}

export default function OrdersTable({ storeUrl }: OrdersTableProps) {
	const { data: orders } = useSuspenseQuery({
		queryKey: queryKeys.dashboard.orders(storeUrl),
		queryFn: () => getStoreOrders(storeUrl),
	});

	if (!orders) return null;

	return (
		<DataTable
			filterValue='id'
			data={orders}
			columns={columns}
			searchPlaceholder='Search order by id ...'
		/>
	);
}

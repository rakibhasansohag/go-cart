'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DataTable from '@/components/ui/data-table';
import { getStoreOrders } from '@/queries/store';
import { columns } from './columns';
import { queryKeys } from '@/lib/query-keys';
import { StoreOrderType } from '@/lib/types';

interface OrdersTableProps {
	storeUrl: string;
	initialData?: {
		orders: StoreOrderType[];
		totalCount: number;
		totalPages: number;
		page: number;
		limit: number;
	};
}

export default function OrdersTable({ storeUrl, initialData }: OrdersTableProps) {
	const [page, setPage] = useState(initialData?.page ?? 1);
	const [pageSize, setPageSize] = useState(initialData?.limit ?? 10);
	const [search, setSearch] = useState('');

	const { data, isFetching } = useQuery({
		queryKey: queryKeys.dashboard.orders(storeUrl, page, pageSize, search),
		queryFn: () => getStoreOrders(storeUrl, { page, limit: pageSize, search }),
		initialData: page === 1 && pageSize === 10 && !search ? initialData : undefined,
	});

	const orders = data?.orders ?? [];
	const totalCount = data?.totalCount ?? 0;
	const totalPages = data?.totalPages ?? 1;

	return (
		<DataTable
			filterValue='id'
			data={orders}
			columns={columns}
			searchPlaceholder='Search order by ID or customer email...'
			totalCount={totalCount}
			pageCount={totalPages}
			pageIndex={page - 1}
			pageSize={pageSize}
			onPageChange={(newPage) => setPage(newPage)}
			onPageSizeChange={(newSize) => {
				setPageSize(newSize);
				setPage(1);
			}}
			onSearchChange={(newSearch) => {
				setSearch(newSearch);
				setPage(1);
			}}
			searchValue={search}
			isLoading={isFetching}
		/>
	);
}

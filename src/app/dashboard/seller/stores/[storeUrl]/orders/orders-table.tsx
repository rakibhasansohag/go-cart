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

const STATUS_TABS = [
	{ label: 'All Orders', value: 'ALL' },
	{ label: 'Pending', value: 'Pending' },
	{ label: 'Processing', value: 'Processing' },
	{ label: 'Shipped', value: 'Shipped' },
	{ label: 'Delivered', value: 'Delivered' },
	{ label: 'Cancelled', value: 'Cancelled' },
];

export default function OrdersTable({ storeUrl, initialData }: OrdersTableProps) {
	const [page, setPage] = useState(initialData?.page ?? 1);
	const [pageSize, setPageSize] = useState(initialData?.limit ?? 10);
	const [search, setSearch] = useState('');
	const [status, setStatus] = useState('ALL');

	const { data, isFetching } = useQuery({
		queryKey: queryKeys.dashboard.orders(storeUrl, page, pageSize, search, status),
		queryFn: () => getStoreOrders(storeUrl, { page, limit: pageSize, search, status }),
		initialData: page === 1 && pageSize === 10 && !search && status === 'ALL' ? initialData : undefined,
	});

	const orders = data?.orders ?? [];
	const totalCount = data?.totalCount ?? 0;
	const totalPages = data?.totalPages ?? 1;

	return (
		<div className='space-y-4'>
			{/* Status Filter Tabs */}
			<div className='flex flex-wrap gap-2 items-center border-b border-border pb-3'>
				{STATUS_TABS.map((tab) => {
					const isActive = status === tab.value;
					return (
						<button
							key={tab.value}
							onClick={() => {
								setStatus(tab.value);
								setPage(1);
							}}
							className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
								isActive
									? 'bg-primary text-primary-foreground border-primary shadow-xs'
									: 'bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted border-border/60'
							}`}
						>
							{tab.label}
						</button>
					);
				})}
			</div>

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
		</div>
	);
}

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DataTable from '@/components/ui/data-table';
import { getAllAdminOrders } from '@/queries/analytics';
import { queryKeys } from '@/lib/query-keys';
import { ColumnDef } from '@tanstack/react-table';
import Image from 'next/image';
import PaymentStatusTag from '@/components/shared/payment-status';
import OrderStatusTag from '@/components/shared/order-status';
import { PaymentStatus, OrderStatus } from '@/lib/types';
import { format } from 'date-fns';

const adminOrderColumns: ColumnDef<any>[] = [
	{
		accessorKey: 'id',
		header: 'Order ID',
		cell: ({ row }) => (
			<span className='font-medium text-xs font-mono'>{row.original.id}</span>
		),
	},
	{
		accessorKey: 'store',
		header: 'Store',
		cell: ({ row }) => (
			<span className='font-medium text-sm'>{row.original.store?.name || 'N/A'}</span>
		),
	},
	{
		accessorKey: 'customer',
		header: 'Customer',
		cell: ({ row }) => (
			<div>
				<p className='text-xs font-semibold'>
					{row.original.order?.user?.name || 'Customer'}
				</p>
				<p className='text-[10px] text-muted-foreground'>
					{row.original.order?.user?.email || ''}
				</p>
			</div>
		),
	},
	{
		accessorKey: 'items',
		header: 'Items',
		cell: ({ row }) => {
			const images = (row.original.items || []).map((item: any) => item.image);
			return (
				<div className='flex items-center -space-x-2 overflow-hidden'>
					{images.slice(0, 3).map((img: string, i: number) => (
						<Image
							key={i}
							src={img}
							alt=''
							width={28}
							height={28}
							className='inline-block h-7 w-7 rounded-full ring-2 ring-background object-cover'
						/>
					))}
					{images.length > 3 && (
						<span className='flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-semibold ring-2 ring-background'>
							+{images.length - 3}
						</span>
					)}
				</div>
			);
		},
	},
	{
		accessorKey: 'total',
		header: 'Total',
		cell: ({ row }) => (
			<span className='font-semibold text-sm'>
				${(row.original.total || 0).toFixed(2)}
			</span>
		),
	},
	{
		accessorKey: 'status',
		header: 'Order Status',
		cell: ({ row }) => (
			<OrderStatusTag status={row.original.status as OrderStatus} />
		),
	},
	{
		accessorKey: 'createdAt',
		header: 'Date',
		cell: ({ row }) => (
			<span className='text-xs text-muted-foreground'>
				{format(new Date(row.original.createdAt), 'MMM dd, yyyy')}
			</span>
		),
	},
];

interface AdminOrdersTableProps {
	initialData?: {
		orders: any[];
		totalCount: number;
		totalPages: number;
		page: number;
		limit: number;
	};
}

export default function AdminOrdersTable({ initialData }: AdminOrdersTableProps) {
	const [page, setPage] = useState(initialData?.page ?? 1);
	const [pageSize, setPageSize] = useState(initialData?.limit ?? 10);
	const [search, setSearch] = useState('');

	const { data, isFetching } = useQuery({
		queryKey: queryKeys.dashboard.adminOrders(page, pageSize, search),
		queryFn: () => getAllAdminOrders({ page, limit: pageSize, search }),
		initialData: page === 1 && pageSize === 10 && !search ? initialData : undefined,
	});

	const orders = data?.orders ?? [];
	const totalCount = data?.totalCount ?? 0;
	const totalPages = data?.totalPages ?? 1;

	return (
		<div className='space-y-4'>
			<div>
				<h1 className='text-2xl font-bold tracking-tight'>All Platform Orders</h1>
				<p className='text-sm text-muted-foreground'>
					Global order tracking across all seller stores.
				</p>
			</div>
			<DataTable
				filterValue='id'
				data={orders}
				columns={adminOrderColumns}
				searchPlaceholder='Search by Order ID, store or customer...'
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

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DataTable from '@/components/ui/data-table';
import { getStoreOrders } from '@/queries/store';
import { columns } from './columns';
import { queryKeys } from '@/lib/query-keys';
import { StoreOrderType } from '@/lib/types';
import { exportOrdersToCSV } from '@/lib/export-utils';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOrderStatusSync } from '@/hooks/use-order-status-sync';

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
	{ label: 'Pending', value: 'PENDING' },
	{ label: 'Accepted', value: 'ACCEPTED' },
	{ label: 'Processing', value: 'PROCESSING' },
	{ label: 'Ready for handoff', value: 'READY_FOR_HANDOFF' },
	{ label: 'Handed off', value: 'HANDED_OFF' },
	{ label: 'Cancelled', value: 'CANCELLED' },
];

export default function OrdersTable({ storeUrl, initialData }: OrdersTableProps) {
	const [page, setPage] = useState(initialData?.page ?? 1);
	const initialPageSize = [5, 10, 20, 50].includes(initialData?.limit ?? 10) ? initialData?.limit ?? 10 : 10;
	const [pageSize, setPageSize] = useState(initialPageSize);
	const [search, setSearch] = useState('');
	const [status, setStatus] = useState('ALL');

	const { data, isPending } = useQuery({
		queryKey: queryKeys.dashboard.orders(storeUrl, page, pageSize, search, status),
		queryFn: () => getStoreOrders(storeUrl, { page, limit: pageSize, search, status }),
		initialData: page === 1 && pageSize === 10 && !search && status === 'ALL' && initialData?.limit === 10 ? initialData : undefined,
	});

	const baseOrders = data?.orders ?? [];
	const { data: statusSnapshots = [] } = useOrderStatusSync({
		groupIds: baseOrders.map(({ id }) => id),
	});
	const statusByGroup = new Map(
		statusSnapshots.map((snapshot) => [snapshot.id, snapshot]),
	);
	const orders = baseOrders.map((order) => {
		const snapshot = statusByGroup.get(order.id);
		if (!snapshot) return order;
		return {
			...order,
			status: snapshot.status,
			packageStatus: snapshot.packageStatus,
			shipment:
				order.shipment && snapshot.shipment
					? { ...order.shipment, status: snapshot.shipment.status }
					: order.shipment,
			order: {
				...order.order,
				orderStatus: snapshot.order.orderStatus,
				paymentStatus: snapshot.order.paymentStatus,
			},
		};
	});
	const totalCount = data?.totalCount ?? 0;
	const totalPages = data?.totalPages ?? 1;

	return (
		<div className='space-y-4'>
			{/* Status Filter Tabs & Actions */}
			<div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-3'>
				<div className='flex flex-wrap gap-2 items-center'>
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

				<Button
					variant='outline'
					size='sm'
					onClick={() => exportOrdersToCSV(orders, `orders-${storeUrl}`)}
					disabled={orders.length === 0}
					className='h-8 px-3 text-xs font-medium gap-1.5 shrink-0 border-border/80 hover:bg-accent'
				>
					<Download className='w-3.5 h-3.5' />
					Export CSV ({orders.length})
				</Button>
			</div>

			<DataTable
				filterValue='id'
				data={orders}
				columns={columns}
				searchPlaceholder='Search order, package, customer, product or SKU...'
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
				isLoading={isPending}
			/>
		</div>
	);
}

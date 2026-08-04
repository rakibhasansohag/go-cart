'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOrderStatusSync } from '@/hooks/use-order-status-sync';
import DataTable from '@/components/ui/data-table';
import { getAllAdminOrders } from '@/queries/analytics';
import { queryKeys } from '@/lib/query-keys';
import { ColumnDef } from '@tanstack/react-table';
import Image from 'next/image';
import PaymentStatusTag from '@/components/shared/payment-status';
import OrderStatusTag from '@/components/shared/order-status';
import PackageStatusTag from '@/components/shared/package-status';
import ShipmentStatusSelect from '@/components/dashboard/forms/shipment-status-select';
import { PaymentStatus, OrderStatus } from '@/lib/types';
import { format } from 'date-fns';
import { formatOrderId, formatPackageId } from '@/lib/utils';

type AdminOrder = Awaited<
	ReturnType<typeof getAllAdminOrders>
>['orders'][number];

const adminOrderColumns: ColumnDef<AdminOrder>[] = [
	{
		accessorKey: 'orderId',
		header: 'Order ID',
		cell: ({ row }) => (
			<span className='whitespace-nowrap font-mono text-xs font-semibold'>
				{formatOrderId(row.original.order.id)}
			</span>
		),
	},
	{
		accessorKey: 'id',
		header: 'Package ID',
		cell: ({ row }) => (
			<span className='whitespace-nowrap rounded-md border border-border/60 bg-muted/40 px-2 py-1 font-mono text-xs font-semibold'>
				{formatPackageId(row.original.id)}
			</span>
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
		accessorKey: 'seller',
		header: 'Seller',
		cell: ({ row }) => (
			<div className='min-w-36'>
				<p className='text-xs font-semibold'>
					{row.original.store.user?.name || 'Seller'}
				</p>
				<p className='text-[10px] text-muted-foreground'>
					{row.original.store.user?.email || ''}
				</p>
			</div>
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
		header: 'Products',
		cell: ({ row }) => {
			const items = row.original.items || [];
			const firstItem = items[0];
			return (
				<div className='flex min-w-44 items-center gap-2'>
					{firstItem && (
						<Image
							src={firstItem.image}
							alt={firstItem.name}
							width={32}
							height={32}
							className='h-8 w-8 rounded-md border border-border object-cover'
						/>
					)}
					<div className='min-w-0'>
						<p className='max-w-36 truncate text-xs font-semibold'>
							{firstItem?.name || 'No products'}
						</p>
						<p className='text-[10px] text-muted-foreground'>
							{firstItem ? `SKU ${firstItem.sku}` : ''}
							{items.length > 1 ? ` · +${items.length - 1} more` : ''}
						</p>
					</div>
				</div>
			);
		},
	},
	{
		accessorKey: 'payment',
		header: 'Payment',
		cell: ({ row }) => (
			<PaymentStatusTag
				status={row.original.order.paymentStatus as PaymentStatus}
				isTable
			/>
		),
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
		accessorKey: 'orderStatus',
		header: 'Overall',
		cell: ({ row }) => (
			<OrderStatusTag
				status={row.original.order.orderStatus as OrderStatus}
			/>
		),
	},
	{
		accessorKey: 'packageStatus',
		header: 'Preparation',
		cell: ({ row }) => (
			<PackageStatusTag status={row.original.packageStatus} />
		),
	},
	{
		accessorKey: 'shipment',
		header: 'Shipment',
		cell: ({ row }) =>
			row.original.shipment ? (
				<ShipmentStatusSelect
					groupId={row.original.id}
					orderId={row.original.order.id}
					status={row.original.shipment.status}
					mode={row.original.fulfillmentMode}
					packageStatus={row.original.packageStatus}
				/>
			) : (
				<span className='text-xs text-muted-foreground'>Not created</span>
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
		orders: AdminOrder[];
		totalCount: number;
		totalPages: number;
		page: number;
		limit: number;
	};
}

export default function AdminOrdersTable({ initialData }: AdminOrdersTableProps) {
	const [page, setPage] = useState(initialData?.page ?? 1);
	const initialPageSize = [5, 10, 20, 50].includes(initialData?.limit ?? 10) ? initialData?.limit ?? 10 : 10;
	const [pageSize, setPageSize] = useState(initialPageSize);
	const [search, setSearch] = useState('');

	const { data, isPending } = useQuery({
		queryKey: queryKeys.dashboard.adminOrders(page, pageSize, search),
		queryFn: () => getAllAdminOrders({ page, limit: pageSize, search }),
		initialData: page === 1 && pageSize === 10 && !search && initialData?.limit === 10 ? initialData : undefined,
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
				searchPlaceholder='Search order, package, store, seller, customer, product or SKU...'
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

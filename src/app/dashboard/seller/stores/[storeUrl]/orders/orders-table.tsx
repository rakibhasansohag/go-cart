'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DataTable from '@/components/ui/data-table';
import { getStoreOrders } from '@/queries/store';
import { bulkUpdatePackageStatus } from '@/queries/fulfillment';
import { getColumns } from './columns';
import { queryKeys } from '@/lib/query-keys';
import { StoreOrderType } from '@/lib/types';
import { exportOrdersToCSV } from '@/lib/export-utils';
import { Download, Layers, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOrderStatusSync } from '@/hooks/use-order-status-sync';
import { toast } from 'sonner';
import { PackageStatus } from '@prisma/client';

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
	const queryClient = useQueryClient();
	const [page, setPage] = useState(initialData?.page ?? 1);
	const initialPageSize = [5, 10, 20, 50].includes(initialData?.limit ?? 10) ? initialData?.limit ?? 10 : 10;
	const [pageSize, setPageSize] = useState(initialPageSize);
	const [search, setSearch] = useState('');
	const [status, setStatus] = useState('ALL');
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [isBulkUpdating, setIsBulkUpdating] = useState<boolean>(false);

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

	const onToggleSelect = (id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const onToggleSelectAll = () => {
		if (orders.length === 0) return;
		const allSelected = orders.every((o) => selectedIds.has(o.id));
		if (allSelected) {
			setSelectedIds((prev) => {
				const next = new Set(prev);
				orders.forEach((o) => next.delete(o.id));
				return next;
			});
		} else {
			setSelectedIds((prev) => {
				const next = new Set(prev);
				orders.forEach((o) => next.add(o.id));
				return next;
			});
		}
	};

	const isAllSelected = orders.length > 0 && orders.every((o) => selectedIds.has(o.id));

	const columns = useMemo(
		() =>
			getColumns({
				storeUrl,
				selectedIds,
				onToggleSelect,
				onToggleSelectAll,
				isAllSelected,
			}),
		[storeUrl, selectedIds, isAllSelected],
	);

	const handleBulkTransition = async (nextStatus: PackageStatus) => {
		if (selectedIds.size === 0) return;
		const storeId = orders[0]?.storeId;
		if (!storeId) {
			toast.error('Store information not found.');
			return;
		}

		setIsBulkUpdating(true);
		try {
			const res = await bulkUpdatePackageStatus({
				storeId,
				groupIds: Array.from(selectedIds),
				nextStatus,
			});

			if (res.successCount > 0) {
				toast.success(
					`Updated ${res.successCount} package${res.successCount > 1 ? 's' : ''} to ${nextStatus}.`
				);
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: queryKeys.dashboard.orders(storeUrl),
					}),
					queryClient.invalidateQueries({
						queryKey: ['orders'],
					}),
				]);
				setSelectedIds(new Set());
			} else {
				const errorMsg = res.results.find((r) => r.error)?.error || 'Transition not allowed for chosen packages.';
				toast.error(`Bulk update failed: ${errorMsg}`);
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Bulk status update failed.');
		} finally {
			setIsBulkUpdating(false);
		}
	};

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
									setSelectedIds(new Set());
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

			{/* Bulk Fulfillment Action Bar */}
			{selectedIds.size > 0 && (
				<div
					data-testid='bulk-fulfillment-bar'
					className='flex flex-wrap items-center justify-between gap-3 p-3 bg-primary/10 border border-primary/20 rounded-xl animate-in fade-in slide-in-from-top-2'
				>
					<div className='flex items-center gap-2.5'>
						<span className='inline-flex items-center justify-center bg-primary text-primary-foreground text-xs font-bold w-6 h-6 rounded-full'>
							{selectedIds.size}
						</span>
						<span className='text-xs font-semibold text-foreground flex items-center gap-1.5'>
							<Layers className='w-3.5 h-3.5 text-primary' />
							{selectedIds.size} package{selectedIds.size > 1 ? 's' : ''} selected
						</span>
					</div>

					<div className='flex items-center gap-2 flex-wrap'>
						<span className='text-xs text-muted-foreground font-medium'>Bulk Transition:</span>
						<Button
							size='sm'
							variant='outline'
							disabled={isBulkUpdating}
							onClick={() => handleBulkTransition('PROCESSING')}
							className='h-7 text-xs font-semibold border-border hover:bg-muted cursor-pointer'
						>
							{isBulkUpdating ? <Loader2 className='w-3 h-3 animate-spin mr-1' /> : null}
							Mark Processing
						</Button>
						<Button
							size='sm'
							variant='outline'
							disabled={isBulkUpdating}
							onClick={() => handleBulkTransition('READY_FOR_HANDOFF')}
							className='h-7 text-xs font-semibold border-border hover:bg-muted cursor-pointer'
						>
							{isBulkUpdating ? <Loader2 className='w-3 h-3 animate-spin mr-1' /> : null}
							Ready for Handoff
						</Button>
						<Button
							size='sm'
							variant='outline'
							disabled={isBulkUpdating}
							onClick={() => handleBulkTransition('HANDED_OFF')}
							className='h-7 text-xs font-semibold border-border hover:bg-muted cursor-pointer'
						>
							{isBulkUpdating ? <Loader2 className='w-3 h-3 animate-spin mr-1' /> : null}
							Handed Off
						</Button>
						<Button
							size='sm'
							variant='ghost'
							disabled={isBulkUpdating}
							onClick={() => setSelectedIds(new Set())}
							className='h-7 text-xs text-muted-foreground hover:text-foreground cursor-pointer px-2'
						>
							<X className='w-3 h-3 mr-1' />
							Clear
						</Button>
					</div>
				</div>
			)}

			<DataTable
				filterValue='id'
				data={orders}
				columns={columns}
				searchPlaceholder='Search order, package, customer, product or SKU...'
				totalCount={totalCount}
				pageCount={totalPages}
				pageIndex={page - 1}
				pageSize={pageSize}
				onPageChange={(newPage) => {
					setPage(newPage);
					setSelectedIds(new Set());
				}}
				onPageSizeChange={(newSize) => {
					setPageSize(newSize);
					setPage(1);
					setSelectedIds(new Set());
				}}
				onSearchChange={(newSearch) => {
					setSearch(newSearch);
					setPage(1);
					setSelectedIds(new Set());
				}}
				searchValue={search}
				isLoading={isPending}
			/>
		</div>
	);
}

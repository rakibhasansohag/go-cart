'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, AlertCircle, Boxes, CheckCircle2, Layers, Package, Search } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DataTable from '@/components/ui/data-table';
import { queryKeys } from '@/lib/query-keys';
import { getStoreInventory, InventoryOverview } from '@/queries/inventory';
import { columns } from './columns';

interface InventoryViewProps {
	storeUrl: string;
	initialData: InventoryOverview;
}

export default function InventoryView({ storeUrl, initialData }: InventoryViewProps) {
	const [statusFilter, setStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
	const [searchQuery, setSearchQuery] = useState('');

	const { data = initialData } = useQuery({
		queryKey: queryKeys.dashboard.inventory(storeUrl),
		queryFn: () => getStoreInventory(storeUrl),
		initialData,
	});

	const { items, summary } = data;

	const filteredItems = useMemo(() => {
		return items.filter((item) => {
			// Status Filter
			let matchesStatus = true;
			if (statusFilter === 'in_stock') {
				matchesStatus = item.quantity >= 5;
			} else if (statusFilter === 'low_stock') {
				matchesStatus = item.quantity > 0 && item.quantity < 5;
			} else if (statusFilter === 'out_of_stock') {
				matchesStatus = item.quantity === 0;
			}

			// Search Query Filter
			let matchesSearch = true;
			if (searchQuery.trim()) {
				const query = searchQuery.toLowerCase();
				matchesSearch =
					item.productName.toLowerCase().includes(query) ||
					item.variantName.toLowerCase().includes(query) ||
					(item.sku && item.sku.toLowerCase().includes(query)) ||
					item.size.toLowerCase().includes(query);
			}

			return matchesStatus && matchesSearch;
		});
	}, [items, statusFilter, searchQuery]);

	const inStockCount = useMemo(() => {
		return items.filter((item) => item.quantity >= 5).length;
	}, [items]);

	return (
		<div className='flex flex-col gap-6 w-full p-2 md:p-6'>
			{/* Page Header */}
			<div className='flex flex-col gap-1'>
				<h1 className='text-2xl font-bold tracking-tight'>Inventory Management</h1>
				<p className='text-sm text-muted-foreground'>
					Track product stock, monitor low-inventory alerts, and make instant updates.
				</p>
			</div>

			{/* Metric Overview Cards */}
			<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
				<Card className='border-border/60 shadow-sm bg-card'>
					<CardHeader className='flex flex-row items-center justify-between pb-2 space-y-0'>
						<CardTitle className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
							Total Stock Units
						</CardTitle>
						<div className='p-2 rounded-lg bg-primary/10 text-primary'>
							<Package className='h-4 w-4' />
						</div>
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold'>{summary.totalUnits.toLocaleString()}</div>
						<p className='text-xs text-muted-foreground mt-1'>
							Across {summary.totalSKUs} product size variants
						</p>
					</CardContent>
				</Card>

				<Card className='border-border/60 shadow-sm bg-card'>
					<CardHeader className='flex flex-row items-center justify-between pb-2 space-y-0'>
						<CardTitle className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
							In Stock Items
						</CardTitle>
						<div className='p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'>
							<CheckCircle2 className='h-4 w-4' />
						</div>
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold text-emerald-600 dark:text-emerald-400'>
							{inStockCount}
						</div>
						<p className='text-xs text-muted-foreground mt-1'>Sufficient inventory levels</p>
					</CardContent>
				</Card>

				<Card className='border-border/60 shadow-sm bg-card'>
					<CardHeader className='flex flex-row items-center justify-between pb-2 space-y-0'>
						<CardTitle className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
							Low Stock Alerts
						</CardTitle>
						<div className='p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400'>
							<AlertTriangle className='h-4 w-4' />
						</div>
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold text-amber-600 dark:text-amber-400'>
							{summary.lowStockCount}
						</div>
						<p className='text-xs text-muted-foreground mt-1'>Fewer than 5 units remaining</p>
					</CardContent>
				</Card>

				<Card className='border-border/60 shadow-sm bg-card'>
					<CardHeader className='flex flex-row items-center justify-between pb-2 space-y-0'>
						<CardTitle className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
							Out of Stock
						</CardTitle>
						<div className='p-2 rounded-lg bg-destructive/10 text-destructive'>
							<AlertCircle className='h-4 w-4' />
						</div>
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold text-destructive'>
							{summary.outOfStockCount}
						</div>
						<p className='text-xs text-muted-foreground mt-1'>Items requiring immediate restock</p>
					</CardContent>
				</Card>
			</div>

			{/* Filter Controls & Table Container */}
			<div className='flex flex-col gap-4 bg-card p-4 rounded-xl border border-border/60 shadow-sm'>
				<div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4'>
					{/* Status Tabs */}
					<Tabs
						value={statusFilter}
						onValueChange={(val) => setStatusFilter(val as 'all' | 'in_stock' | 'low_stock' | 'out_of_stock')}
						className='w-full sm:w-auto'
					>
						<TabsList className='grid grid-cols-4 w-full sm:w-auto h-9 p-1 bg-muted/50'>
							<TabsTrigger value='all' className='text-xs'>
								All ({items.length})
							</TabsTrigger>
							<TabsTrigger value='in_stock' className='text-xs'>
								In Stock ({inStockCount})
							</TabsTrigger>
							<TabsTrigger value='low_stock' className='text-xs'>
								Low Stock ({summary.lowStockCount})
							</TabsTrigger>
							<TabsTrigger value='out_of_stock' className='text-xs'>
								Out of Stock ({summary.outOfStockCount})
							</TabsTrigger>
						</TabsList>
					</Tabs>

					{/* Search Input */}
					<div className='relative w-full sm:w-72'>
						<Search className='absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none' />
						<Input
							placeholder='Search by product, SKU, size...'
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className='h-9 text-xs pl-8 bg-muted/20 border-border/60 focus-visible:ring-1 focus-visible:ring-primary'
						/>
					</div>
				</div>

				{/* Inventory Data Table */}
				<DataTable
					columns={columns}
					data={filteredItems}
					filterValue=''
					searchPlaceholder=''
					noHeader
				/>
			</div>
		</div>
	);
}

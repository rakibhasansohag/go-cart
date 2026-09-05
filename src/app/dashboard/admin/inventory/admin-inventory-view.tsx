'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
	AlertCircle,
	AlertTriangle,
	Boxes,
	CheckCircle2,
	ExternalLink,
	Package,
	Search,
	Store as StoreIcon,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { queryKeys } from '@/lib/query-keys';
import {
	AdminInventoryOverview,
	getAdminInventoryOverview,
} from '@/queries/inventory';

interface AdminInventoryViewProps {
	initialData: AdminInventoryOverview;
}

export default function AdminInventoryView({ initialData }: AdminInventoryViewProps) {
	const [activeTab, setActiveTab] = useState<'critical' | 'stores'>('critical');
	const [statusFilter, setStatusFilter] = useState<'all' | 'out_of_stock' | 'low_stock'>('all');
	const [searchQuery, setSearchQuery] = useState('');

	const { data = initialData } = useQuery({
		queryKey: queryKeys.dashboard.adminInventory(),
		queryFn: () => getAdminInventoryOverview(),
		initialData,
	});

	const { summary, criticalItems, stores } = data;

	const filteredCriticalItems = useMemo(() => {
		return criticalItems.filter((item) => {
			let matchesStatus = true;
			if (statusFilter === 'out_of_stock') {
				matchesStatus = item.quantity === 0;
			} else if (statusFilter === 'low_stock') {
				matchesStatus = item.quantity > 0;
			}

			let matchesSearch = true;
			if (searchQuery.trim()) {
				const query = searchQuery.toLowerCase();
				matchesSearch =
					item.productName.toLowerCase().includes(query) ||
					item.variantName.toLowerCase().includes(query) ||
					item.storeName.toLowerCase().includes(query) ||
					(item.sku && item.sku.toLowerCase().includes(query)) ||
					item.size.toLowerCase().includes(query);
			}

			return matchesStatus && matchesSearch;
		});
	}, [criticalItems, statusFilter, searchQuery]);

	const filteredStores = useMemo(() => {
		if (!searchQuery.trim()) return stores;
		const query = searchQuery.toLowerCase();
		return stores.filter((s) => s.storeName.toLowerCase().includes(query) || s.storeUrl.toLowerCase().includes(query));
	}, [stores, searchQuery]);

	return (
		<div className='flex flex-col gap-6 w-full p-2 md:p-6'>
			{/* Header */}
			<div className='flex flex-col gap-1'>
				<h1 className='text-2xl font-bold tracking-tight'>Platform Inventory Health</h1>
				<p className='text-sm text-muted-foreground'>
					Cross-store inventory surveillance, stockout risk monitoring, and SKU replenishment alerts.
				</p>
			</div>

			{/* Metric Overview Grid */}
			<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
				<Card className='border-border/60 shadow-sm bg-card'>
					<CardHeader className='flex flex-row items-center justify-between pb-2 space-y-0'>
						<CardTitle className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
							Total Marketplace Units
						</CardTitle>
						<div className='p-2 rounded-lg bg-primary/10 text-primary'>
							<Package className='h-4 w-4' />
						</div>
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold'>{summary.totalUnits.toLocaleString()}</div>
						<p className='text-xs text-muted-foreground mt-1'>
							Across {summary.totalSKUs.toLocaleString()} sellable SKUs
						</p>
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
							{summary.lowStockCount.toLocaleString()}
						</div>
						<p className='text-xs text-muted-foreground mt-1'>
							SKUs at or below seller threshold
						</p>
					</CardContent>
				</Card>

				<Card className='border-border/60 shadow-sm bg-card'>
					<CardHeader className='flex flex-row items-center justify-between pb-2 space-y-0'>
						<CardTitle className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
							Out of Stock SKUs
						</CardTitle>
						<div className='p-2 rounded-lg bg-destructive/10 text-destructive'>
							<AlertCircle className='h-4 w-4' />
						</div>
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold text-destructive'>
							{summary.outOfStockCount.toLocaleString()}
						</div>
						<p className='text-xs text-muted-foreground mt-1'>
							Sellable SKUs with zero stock
						</p>
					</CardContent>
				</Card>

				<Card className='border-border/60 shadow-sm bg-card'>
					<CardHeader className='flex flex-row items-center justify-between pb-2 space-y-0'>
						<CardTitle className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
							Affected Stores
						</CardTitle>
						<div className='p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400'>
							<StoreIcon className='h-4 w-4' />
						</div>
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold text-blue-600 dark:text-blue-400'>
							{summary.affectedStoresCount.toLocaleString()}
						</div>
						<p className='text-xs text-muted-foreground mt-1'>
							Stores with low or empty stock
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Main Section Tabs */}
			<div className='flex flex-col gap-4 bg-card p-4 rounded-xl border border-border/60 shadow-sm'>
				<div className='flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pb-2 border-b border-border/60'>
					<Tabs
						value={activeTab}
						onValueChange={(val) => setActiveTab(val as 'critical' | 'stores')}
						className='w-full md:w-auto'
					>
						<TabsList className='grid grid-cols-2 w-full md:w-auto h-9 bg-muted/50'>
							<TabsTrigger value='critical' className='text-xs'>
								Critical SKUs ({criticalItems.length})
							</TabsTrigger>
							<TabsTrigger value='stores' className='text-xs'>
								Affected Stores ({stores.length})
							</TabsTrigger>
						</TabsList>
					</Tabs>

					{/* Search input */}
					<div className='relative w-full md:w-72'>
						<Search className='absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none' />
						<Input
							placeholder={activeTab === 'critical' ? 'Search SKU, product, store...' : 'Search store name...'}
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className='h-9 text-xs pl-8 bg-muted/20 border-border/60 focus-visible:ring-1 focus-visible:ring-primary'
						/>
					</div>
				</div>

				{activeTab === 'critical' && (
					<div className='flex flex-col gap-4'>
						{/* Sub-filters for Critical SKUs */}
						<div className='flex items-center gap-2'>
							<button
								type='button'
								onClick={() => setStatusFilter('all')}
								className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
									statusFilter === 'all'
										? 'bg-primary text-primary-foreground'
										: 'bg-muted/50 text-muted-foreground hover:bg-muted'
								}`}
							>
								All ({criticalItems.length})
							</button>
							<button
								type='button'
								onClick={() => setStatusFilter('out_of_stock')}
								className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
									statusFilter === 'out_of_stock'
										? 'bg-destructive text-destructive-foreground'
										: 'bg-muted/50 text-muted-foreground hover:bg-muted'
								}`}
							>
								Out of Stock ({summary.outOfStockCount})
							</button>
							<button
								type='button'
								onClick={() => setStatusFilter('low_stock')}
								className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
									statusFilter === 'low_stock'
										? 'bg-amber-500 text-white'
										: 'bg-muted/50 text-muted-foreground hover:bg-muted'
								}`}
							>
								Low Stock ({summary.lowStockCount})
							</button>
						</div>

						{/* Critical Items Table */}
						<div className='overflow-x-auto rounded-lg border border-border/60'>
							<table className='w-full text-left text-xs'>
								<thead className='bg-muted/40 text-muted-foreground font-semibold border-b border-border/60'>
									<tr>
										<th className='p-3'>Product & Variant</th>
										<th className='p-3'>Store</th>
										<th className='p-3'>Size</th>
										<th className='p-3'>Current Stock</th>
										<th className='p-3'>Threshold</th>
										<th className='p-3'>Price</th>
										<th className='p-3 text-right'>Action</th>
									</tr>
								</thead>
								<tbody className='divide-y divide-border/60'>
									{filteredCriticalItems.length === 0 ? (
										<tr>
											<td colSpan={7} className='p-8 text-center text-muted-foreground'>
												<CheckCircle2 className='h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80' />
												No critical stock issues matching the selected filters.
											</td>
										</tr>
									) : (
										filteredCriticalItems.map((item) => {
											const isOos = item.quantity === 0;
											return (
												<tr key={item.id} className='hover:bg-muted/20 transition-colors'>
													<td className='p-3'>
														<div className='flex items-center gap-3'>
															{item.variantImage ? (
																<Image
																	src={item.variantImage}
																	alt={item.productName}
																	width={40}
																	height={40}
																	className='h-10 w-10 rounded-md object-cover border border-border/60 shrink-0 bg-muted/30'
																/>
															) : (
																<div className='h-10 w-10 rounded-md bg-muted/40 border border-border/60 shrink-0 flex items-center justify-center text-[10px] text-muted-foreground font-semibold'>
																	N/A
																</div>
															)}
															<div className='flex flex-col min-w-0'>
																<span className='font-semibold text-foreground truncate max-w-[200px]'>
																	{item.productName}
																</span>
																<span className='text-[11px] text-muted-foreground truncate max-w-[200px]'>
																	{item.variantName}
																</span>
																{item.sku && (
																	<span className='text-[10px] font-mono text-muted-foreground'>
																		SKU: {item.sku}
																	</span>
																)}
															</div>
														</div>
													</td>
													<td className='p-3'>
														<Link
															href={`/dashboard/seller/stores/${item.storeUrl}/inventory`}
															className='font-medium text-primary hover:underline flex items-center gap-1 max-w-[150px] truncate'
														>
															{item.storeName}
														</Link>
													</td>
													<td className='p-3'>
														<Badge variant='outline' className='font-mono text-xs px-2 py-0.5 bg-muted/30'>
															{item.size}
														</Badge>
													</td>
													<td className='p-3'>
														{isOos ? (
															<Badge className='bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20 text-[11px] font-medium'>
																0 (Out of Stock)
															</Badge>
														) : (
															<Badge className='bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20 text-[11px] font-medium'>
																{item.quantity} units left
															</Badge>
														)}
													</td>
													<td className='p-3'>
														<span className='font-mono text-xs text-muted-foreground'>
															≤ {item.lowStockThreshold}
														</span>
													</td>
													<td className='p-3 font-medium'>
														${item.price.toFixed(2)}
													</td>
													<td className='p-3 text-right'>
														<Button variant='ghost' size='sm' asChild className='h-7 px-2 text-xs'>
															<Link
																href={`/dashboard/seller/stores/${item.storeUrl}/inventory?filter=low_stock`}
																target='_blank'
																className='flex items-center gap-1 text-muted-foreground hover:text-foreground'
															>
																<span>Store View</span>
																<ExternalLink className='h-3 w-3' />
															</Link>
														</Button>
													</td>
												</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>
					</div>
				)}

				{activeTab === 'stores' && (
					<div className='overflow-x-auto rounded-lg border border-border/60'>
						<table className='w-full text-left text-xs'>
							<thead className='bg-muted/40 text-muted-foreground font-semibold border-b border-border/60'>
								<tr>
									<th className='p-3'>Store Name</th>
									<th className='p-3'>Total Units</th>
									<th className='p-3'>Total SKUs</th>
									<th className='p-3'>Low Stock SKUs</th>
									<th className='p-3'>Out of Stock SKUs</th>
									<th className='p-3 text-right'>Inventory Management</th>
								</tr>
							</thead>
							<tbody className='divide-y divide-border/60'>
								{filteredStores.length === 0 ? (
									<tr>
										<td colSpan={6} className='p-8 text-center text-muted-foreground'>
											<CheckCircle2 className='h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80' />
											All stores maintain healthy inventory levels.
										</td>
									</tr>
								) : (
									filteredStores.map((s) => (
										<tr key={s.storeId} className='hover:bg-muted/20 transition-colors'>
											<td className='p-3 font-semibold text-foreground'>
												{s.storeName}
											</td>
											<td className='p-3 font-mono'>
												{s.totalUnits.toLocaleString()}
											</td>
											<td className='p-3 font-mono'>
												{s.totalSKUs.toLocaleString()}
											</td>
											<td className='p-3'>
												{s.lowStockCount > 0 ? (
													<Badge className='bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[11px] font-medium'>
														{s.lowStockCount}
													</Badge>
												) : (
													<span className='text-muted-foreground font-mono'>0</span>
												)}
											</td>
											<td className='p-3'>
												{s.outOfStockCount > 0 ? (
													<Badge className='bg-destructive/15 text-destructive border-destructive/30 text-[11px] font-medium'>
														{s.outOfStockCount}
													</Badge>
												) : (
													<span className='text-muted-foreground font-mono'>0</span>
												)}
											</td>
											<td className='p-3 text-right'>
												<Button variant='outline' size='sm' asChild className='h-7 text-xs'>
													<Link
														href={`/dashboard/seller/stores/${s.storeUrl}/inventory`}
														className='flex items-center gap-1.5'
													>
														<span>Open Store Inventory</span>
														<ExternalLink className='h-3 w-3' />
													</Link>
												</Button>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
}

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSellerStoreAnalyticsData } from '@/queries/analytics';
import { queryKeys } from '@/lib/query-keys';
import StatCard from '@/components/dashboard/analytics/stat-card';
import OverviewChart from '@/components/dashboard/analytics/overview-chart';
import StatusDistribution from '@/components/dashboard/analytics/status-distribution';
import RecentTransactions from '@/components/dashboard/analytics/recent-transactions';
import TopProducts from '@/components/dashboard/analytics/top-products';
import OverviewSkeleton from '@/components/dashboard/shared/overview-skeleton';
import { DollarSign, Package, ShoppingBag, TrendingUp, Users } from 'lucide-react';

interface SellerOverviewProps {
	storeUrl: string;
}

const TIMEFRAMES = [
	{ label: 'All Time', value: 'all' },
	{ label: 'This Month', value: 'this_month' },
	{ label: 'Last 30 Days', value: '30d' },
	{ label: 'Last 7 Days', value: '7d' },
];

export default function SellerOverview({ storeUrl }: SellerOverviewProps) {
	const [timeframe, setTimeframe] = useState<string>('all');

	const { data, isLoading } = useQuery({
		queryKey: queryKeys.dashboard.sellerAnalytics(storeUrl, timeframe),
		queryFn: () => getSellerStoreAnalyticsData(storeUrl, timeframe),
	});

	if (isLoading || !data) return <OverviewSkeleton />;

	return (
		<div className='space-y-6'>
			{/* Page Header */}
			<div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
				<div>
					<h1 className='text-2xl font-bold tracking-tight'>
						{data.storeName} Overview
					</h1>
					<p className='text-sm text-muted-foreground'>
						Monitor your store&apos;s sales, product inventory, and customer activity.
					</p>
				</div>

				<div className='flex flex-wrap items-center gap-1 p-1 bg-muted/40 rounded-xl border border-border/60 shrink-0'>
					{TIMEFRAMES.map((tf) => {
						const isActive = timeframe === tf.value;
						return (
							<button
								key={tf.value}
								onClick={() => setTimeframe(tf.value)}
								className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
									isActive
										? 'bg-background text-foreground shadow-xs border border-border/80'
										: 'text-muted-foreground hover:text-foreground'
								}`}
							>
								{tf.label}
							</button>
						);
					})}
				</div>
			</div>

			{/* Stat Cards Grid */}
			<div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4'>
				<StatCard
					title='Gross Revenue'
					value={`$${data.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
					change={15.3}
					icon={DollarSign}
					iconBgColor='bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
				/>
				<StatCard
					title='Avg Order Value'
					value={`$${(data.averageOrderValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
					change={4.2}
					icon={TrendingUp}
					iconBgColor='bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
				/>
				<StatCard
					title='Total Orders'
					value={data.totalOrders.toLocaleString()}
					change={9.1}
					icon={ShoppingBag}
					iconBgColor='bg-blue-500/10 text-blue-600 dark:text-blue-400'
				/>
				<StatCard
					title='Active Products'
					value={data.activeProducts.toLocaleString()}
					description='Items in inventory'
					icon={Package}
					iconBgColor='bg-purple-500/10 text-purple-600 dark:text-purple-400'
				/>
				<StatCard
					title='Unique Customers'
					value={data.totalCustomers.toLocaleString()}
					change={6.4}
					icon={Users}
					iconBgColor='bg-amber-500/10 text-amber-600 dark:text-amber-400'
				/>
			</div>

			{/* Analytics Grid */}
			<div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
				<div className='lg:col-span-2 space-y-6'>
					<OverviewChart
						data={data.monthlyRevenue}
						title='Monthly Store Revenue'
						description='Sales revenue overview over the last 6 months'
					/>
				</div>
				<div className='lg:col-span-1 space-y-6'>
					<StatusDistribution
						data={data.statusDistribution}
						title='Order Fulfillment Status'
						description='Breakdown by order delivery state'
					/>
					<TopProducts
						products={data.topProducts || []}
						title='Top Selling Products'
						description='Leaderboard of best-performing items'
					/>
				</div>
			</div>

			{/* Recent Transactions */}
			<div>
				<RecentTransactions
					orders={data.recentOrders}
					title='Recent Store Orders'
					description='Latest customer orders for your store'
				/>
			</div>
		</div>
	);
}

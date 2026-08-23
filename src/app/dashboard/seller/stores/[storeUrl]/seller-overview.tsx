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

	const { data, isLoading, isError } = useQuery({
		queryKey: queryKeys.dashboard.sellerAnalytics(storeUrl, timeframe),
		queryFn: () => getSellerStoreAnalyticsData(storeUrl, timeframe),
		staleTime: 30_000,
	});

	if (isError) return <p role='alert' className='rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive'>Analytics are temporarily unavailable. Try again shortly.</p>;
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
					description={`$${data.netSellerRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} seller payable`}
					icon={DollarSign}
					iconBgColor='bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
				/>
				<StatCard
					title='Avg Order Value'
					value={`$${(data.averageOrderValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
					description={`${data.totalOrders.toLocaleString()} paid orders`}
					icon={TrendingUp}
					iconBgColor='bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
				/>
				<StatCard
					title='Total Orders'
					value={data.totalOrders.toLocaleString()}
					description={`${data.refundRate.toFixed(1)}% refund rate`}
					icon={ShoppingBag}
					iconBgColor='bg-blue-500/10 text-blue-600 dark:text-blue-400'
				/>
				<StatCard
					title='Catalog Products'
					value={data.activeProducts.toLocaleString()}
					description={`${data.returnRate.toFixed(1)}% return rate`}
					icon={Package}
					iconBgColor='bg-purple-500/10 text-purple-600 dark:text-purple-400'
				/>
				<StatCard
					title='Unique Customers'
					value={data.totalCustomers.toLocaleString()}
					description={`${data.repeatCustomerRate.toFixed(1)}% repeat customers`}
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

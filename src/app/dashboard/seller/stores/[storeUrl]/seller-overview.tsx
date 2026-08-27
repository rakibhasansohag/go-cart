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
import StockRisk from '@/components/dashboard/analytics/stock-risk';
import OverviewSkeleton from '@/components/dashboard/shared/overview-skeleton';
import { ArrowDownRight, ArrowUpRight, DollarSign, Minus, Package, ShoppingBag, TrendingUp, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface SellerOverviewProps {
	storeUrl: string;
}

const TIMEFRAMES = [
	{ label: 'All Time', value: 'all' },
	{ label: 'This Month', value: 'this_month' },
	{ label: 'Last 30 Days', value: '30d' },
	{ label: 'Last 7 Days', value: '7d' },
];

const GRANULARITIES = [
	{ label: 'Day', value: 'day' },
	{ label: 'Week', value: 'week' },
	{ label: 'Month', value: 'month' },
] as const;

function comparisonLabel(value: number | null) {
	if (value === null) return 'No prior period';
	return `${value > 0 ? '+' : ''}${value.toFixed(1)}% vs prior period`;
}

export default function SellerOverview({ storeUrl }: SellerOverviewProps) {
	const [timeframe, setTimeframe] = useState<string>('all');
	const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('month');

	const { data, isLoading, isError } = useQuery({
		queryKey: queryKeys.dashboard.sellerAnalytics(storeUrl, timeframe, granularity),
		queryFn: () => getSellerStoreAnalyticsData(storeUrl, timeframe, granularity),
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
									aria-pressed={isActive}
								>
								{tf.label}
							</button>
						);
					})}
				</div>
				<div className='flex items-center gap-1 rounded-xl border border-border/60 bg-muted/40 p-1 shrink-0' aria-label='Revenue grouping'>
					{GRANULARITIES.map((option) => (
						<button
							key={option.value}
							onClick={() => setGranularity(option.value)}
							aria-pressed={granularity === option.value}
							className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${granularity === option.value ? 'bg-background text-foreground shadow-xs border border-border/80' : 'text-muted-foreground hover:text-foreground'}`}
						>
							{option.label}
						</button>
					))}
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

			<Card className='border border-border/60 shadow-xs'>
				<CardHeader className='pb-3'>
					<CardTitle className='text-base'>Compared with the previous period</CardTitle>
					<CardDescription>Revenue and paid orders for the selected range</CardDescription>
				</CardHeader>
				<CardContent className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
					{[
						{ label: 'Revenue', value: data.periodComparison.revenueChangePercent, icon: DollarSign },
						{ label: 'Paid orders', value: data.periodComparison.orderChangePercent, icon: ShoppingBag },
					].map((item) => {
						const Icon = item.icon;
						const TrendIcon = item.value === null ? Minus : item.value > 0 ? ArrowUpRight : item.value < 0 ? ArrowDownRight : Minus;
						const trendClass = item.value === null ? 'text-muted-foreground' : item.value > 0 ? 'text-emerald-600 dark:text-emerald-400' : item.value < 0 ? 'text-destructive' : 'text-muted-foreground';
						return (
							<div key={item.label} className='flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-3 py-2'>
								<span className='flex items-center gap-2 text-sm text-muted-foreground'><Icon className='h-4 w-4' />{item.label}</span>
								<span className={`flex items-center gap-1 text-sm font-semibold ${trendClass}`}><TrendIcon className='h-4 w-4' />{comparisonLabel(item.value)}</span>
							</div>
						);
					})}
				</CardContent>
			</Card>

			{/* Analytics Grid */}
			<div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
				<div className='lg:col-span-2 space-y-6'>
					<OverviewChart
						data={data.revenueTrend}
						title='Revenue trend'
						description={`Paid sales grouped by ${granularity}`}
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
						variants={data.topVariants || []}
						title='Top Selling Products'
						description='Leaderboard of best-performing items'
					/>
				</div>
			</div>

			<div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
				<StockRisk data={data.stockRisk} />
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

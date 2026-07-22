'use client';

import { useQuery } from '@tanstack/react-query';
import { getSellerStoreAnalyticsData } from '@/queries/analytics';
import { queryKeys } from '@/lib/query-keys';
import StatCard from '@/components/dashboard/analytics/stat-card';
import OverviewChart from '@/components/dashboard/analytics/overview-chart';
import StatusDistribution from '@/components/dashboard/analytics/status-distribution';
import RecentTransactions from '@/components/dashboard/analytics/recent-transactions';
import OverviewSkeleton from '@/components/dashboard/shared/overview-skeleton';
import { DollarSign, Package, ShoppingBag, Users } from 'lucide-react';

interface SellerOverviewProps {
	storeUrl: string;
}

export default function SellerOverview({ storeUrl }: SellerOverviewProps) {
	const { data, isLoading } = useQuery({
		queryKey: queryKeys.dashboard.sellerAnalytics(storeUrl),
		queryFn: () => getSellerStoreAnalyticsData(storeUrl),
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
						Monitor your store's sales, product inventory, and customer activity.
					</p>
				</div>
			</div>

			{/* Stat Cards Grid */}
			<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
				<StatCard
					title='Store Gross Revenue'
					value={`$${data.totalRevenue.toLocaleString()}`}
					change={15.3}
					icon={DollarSign}
					iconBgColor='bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
				/>
				<StatCard
					title='Store Orders'
					value={data.totalOrders.toLocaleString()}
					change={9.1}
					icon={ShoppingBag}
					iconBgColor='bg-blue-500/10 text-blue-600 dark:text-blue-400'
				/>
				<StatCard
					title='Active Products'
					value={data.activeProducts.toLocaleString()}
					description='Total items in inventory'
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
				<div className='lg:col-span-2'>
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

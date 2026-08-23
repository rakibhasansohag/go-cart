'use client';

import { useQuery } from '@tanstack/react-query';
import { getAdminAnalyticsData } from '@/queries/analytics';
import { queryKeys } from '@/lib/query-keys';
import StatCard from '@/components/dashboard/analytics/stat-card';
import OverviewChart from '@/components/dashboard/analytics/overview-chart';
import RecentTransactions from '@/components/dashboard/analytics/recent-transactions';
import OverviewSkeleton from '@/components/dashboard/shared/overview-skeleton';
import { DollarSign, ShoppingBag, Store, Users } from 'lucide-react';

export default function AdminOverview() {
	const { data, isLoading } = useQuery({
		queryKey: queryKeys.dashboard.adminAnalytics(),
		queryFn: () => getAdminAnalyticsData(),
	});

	if (isLoading || !data) return <OverviewSkeleton />;

	return (
		<div className='space-y-6'>
			{/* Page Header */}
			<div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
				<div>
					<h1 className='text-2xl font-bold tracking-tight'>Admin Overview</h1>
					<p className='text-sm text-muted-foreground'>
						Platform metrics, store performance, and recent transaction activities.
					</p>
				</div>
			</div>

			{/* Stat Cards Grid */}
			<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
				<StatCard
					title='Total Platform Revenue'
					value={`$${data.totalRevenue.toLocaleString()}`}
					icon={DollarSign}
					iconBgColor='bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
				/>
				<StatCard
					title='Total Orders'
					value={data.totalOrders.toLocaleString()}
					icon={ShoppingBag}
					iconBgColor='bg-blue-500/10 text-blue-600 dark:text-blue-400'
				/>
				<StatCard
					title='Total Stores'
					value={data.totalStores.toLocaleString()}
					description={`${data.activeStores} active stores`}
					icon={Store}
					iconBgColor='bg-purple-500/10 text-purple-600 dark:text-purple-400'
				/>
				<StatCard
					title='Total Users'
					value={data.totalUsers.toLocaleString()}
					icon={Users}
					iconBgColor='bg-amber-500/10 text-amber-600 dark:text-amber-400'
				/>
			</div>

			{/* Analytics Grid */}
			<div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
				<div className='lg:col-span-2'>
					<OverviewChart
						data={data.monthlyRevenue}
						title='Platform Revenue Trend'
						description='Monthly aggregated sales volume across all platform stores'
					/>
				</div>
				<div className='lg:col-span-1'>
					<RecentTransactions
						orders={data.recentOrders}
						title='Recent Transactions'
						description='Latest purchases completed'
					/>
				</div>
			</div>
		</div>
	);
}

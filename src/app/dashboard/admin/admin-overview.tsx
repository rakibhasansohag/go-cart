'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, DollarSign, Mail, PackageSearch, ShoppingBag, Store, Webhook } from 'lucide-react';
import { getAdminAnalyticsData } from '@/queries/analytics';
import { queryKeys } from '@/lib/query-keys';
import StatCard from '@/components/dashboard/analytics/stat-card';
import OverviewChart from '@/components/dashboard/analytics/overview-chart';
import RecentTransactions from '@/components/dashboard/analytics/recent-transactions';
import OverviewSkeleton from '@/components/dashboard/shared/overview-skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

function money(value: number) {
	return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function dateTime(value: Date | null) {
	return value ? new Date(value).toLocaleString() : 'No record';
}

export default function AdminOverview() {
	const { data, isLoading, isError } = useQuery({
		queryKey: queryKeys.dashboard.adminAnalytics(),
		queryFn: () => getAdminAnalyticsData(),
		staleTime: 30_000,
	});

	if (isLoading) return <OverviewSkeleton />;
	if (isError || !data) {
		return <p role='alert' className='rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive'>
			Platform analytics could not be loaded. Refresh the page or check the operational dashboards.
		</p>;
	}

	const { riskSignals, operationalHealth } = data;

	return (
		<div className='space-y-6'>
			<header className='flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
				<div>
					<h1 className='text-2xl font-bold tracking-tight'>Platform analytics</h1>
					<p className='text-sm text-muted-foreground'>Authorized platform financials, store performance, operating health, and exception signals.</p>
				</div>
				<p className='text-xs text-muted-foreground'>GMV includes paid and partially refunded order groups. Platform revenue is recorded seller commission, not profit.</p>
			</header>

			<section aria-label='Platform financial summary' className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5'>
				<StatCard title='Platform GMV' value={money(data.totalRevenue)} description='Paid order groups' icon={DollarSign} iconBgColor='bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' />
				<StatCard title='Platform revenue' value={money(data.platformRevenue)} description='Recorded seller commission' icon={DollarSign} iconBgColor='bg-violet-500/10 text-violet-600 dark:text-violet-400' />
				<StatCard title='Paid order groups' value={data.totalOrders.toLocaleString()} description='Paid or partially refunded' icon={ShoppingBag} iconBgColor='bg-blue-500/10 text-blue-600 dark:text-blue-400' />
				<StatCard title='Active stores' value={data.activeStores.toLocaleString()} description={`${data.totalStores} stores total`} icon={Store} iconBgColor='bg-amber-500/10 text-amber-600 dark:text-amber-400' />
				<StatCard title='Chargebacks' value={riskSignals.chargebacks.toLocaleString()} description='Payment dispute indicator' icon={AlertTriangle} iconBgColor='bg-rose-500/10 text-rose-600 dark:text-rose-400' />
			</section>

			<section className='grid grid-cols-1 gap-6 xl:grid-cols-3'>
				<div className='xl:col-span-2'>
					<OverviewChart data={data.monthlyRevenue} title='Platform GMV trend' description='Paid and partially refunded order-group GMV over the last six UTC months' />
				</div>
				<Card className='border-border/60 shadow-sm'>
					<CardHeader>
						<CardTitle className='text-lg'>Risk signals</CardTitle>
						<CardDescription>Exceptions requiring operational review, not customer-facing totals.</CardDescription>
					</CardHeader>
					<CardContent className='space-y-3 text-sm'>
						<div className='flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2'><span>Refunded order groups</span><strong>{riskSignals.refundedOrders}</strong></div>
						<div className='flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2'><span>Completed returns</span><strong>{riskSignals.completedReturns}</strong></div>
						<div className='flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2'><span>Blocked / failed settlements</span><strong>{riskSignals.blockedSettlements + riskSignals.failedSettlements}</strong></div>
						<div className='flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2'><span>At-risk seller payable</span><strong>{money(riskSignals.settlementRiskCents / 100)}</strong></div>
						<div className='flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2'><span>Failed / partial payout batches</span><strong>{riskSignals.failedOrPartialPayoutBatches}</strong></div>
						<Link href='/dashboard/admin/settlements' className='inline-flex text-xs font-semibold text-primary underline-offset-4 hover:underline'>Review marketplace settlements</Link>
					</CardContent>
				</Card>
			</section>

			<section className='grid gap-6 xl:grid-cols-2'>
				<Card className='border-border/60 shadow-sm'>
					<CardHeader>
						<CardTitle className='text-lg'>Monthly platform performance</CardTitle>
						<CardDescription>UTC month buckets; active-store history is not retained, so the summary above reports its current state only.</CardDescription>
					</CardHeader>
					<CardContent>
						<div className='overflow-x-auto rounded-lg border border-border'>
							<Table className='min-w-[620px]'>
								<TableHeader className='bg-muted/50'><TableRow className='hover:bg-muted/50'><TableHead>Month</TableHead><TableHead className='text-right'>GMV</TableHead><TableHead className='text-right'>Platform revenue</TableHead><TableHead className='text-right'>Paid groups</TableHead></TableRow></TableHeader>
								<TableBody>{data.monthlyPerformance.map((row) => <TableRow key={row.month} className='border-border/60 transition-colors duration-150 hover:bg-accent/60 dark:hover:bg-accent/20'><TableCell className='font-medium'>{row.month}</TableCell><TableCell className='text-right'>{money(row.gmv)}</TableCell><TableCell className='text-right'>{money(row.platformRevenue)}</TableCell><TableCell className='text-right'>{row.paidOrders}</TableCell></TableRow>)}{data.monthlyPerformance.length === 0 && <TableRow className='hover:bg-transparent'><TableCell colSpan={4} className='py-8 text-center text-muted-foreground'>No paid platform activity is recorded for this period.</TableCell></TableRow>}</TableBody>
							</Table>
						</div>
					</CardContent>
				</Card>

				<Card className='border-border/60 shadow-sm'>
					<CardHeader>
						<CardTitle className='text-lg'>Operational health</CardTitle>
						<CardDescription>Database-backed delivery, webhook, automation, and PostgreSQL-search catalog signals.</CardDescription>
					</CardHeader>
					<CardContent className='grid gap-3 text-sm sm:grid-cols-2'>
						<HealthMetric label='Pending email jobs' value={operationalHealth.pendingEmails} icon={<Mail className='size-4' />} />
						<HealthMetric label='Failed email jobs' value={operationalHealth.failedEmails} icon={<Mail className='size-4' />} />
						<HealthMetric label='Webhook events (24h)' value={operationalHealth.paymentWebhookEventsLast24Hours} icon={<Webhook className='size-4' />} />
						<HealthMetric label='Failed automation runs' value={operationalHealth.failedAutomationRuns} icon={<AlertTriangle className='size-4' />} />
						<HealthMetric label='Searchable products' value={operationalHealth.searchableProducts} icon={<PackageSearch className='size-4' />} />
						<div className='rounded-lg bg-muted/50 p-3'><p className='text-xs text-muted-foreground'>Oldest queued email</p><p className='mt-1 font-medium'>{dateTime(operationalHealth.oldestPendingEmailAt)}</p></div>
						<div className='rounded-lg bg-muted/50 p-3'><p className='text-xs text-muted-foreground'>Latest automation run</p><p className='mt-1 font-medium'>{dateTime(operationalHealth.latestAutomationRunAt)}</p><p className='mt-1 text-xs text-muted-foreground'>{operationalHealth.latestAutomationRunStatus ?? 'No status'}</p></div>
						<div className='rounded-lg bg-muted/50 p-3'><p className='text-xs text-muted-foreground'>Latest catalog update</p><p className='mt-1 font-medium'>{dateTime(operationalHealth.latestCatalogUpdateAt)}</p></div>
						<Link href='/dashboard/admin/delivery-health' className='flex items-center rounded-lg border border-border px-3 py-2 text-xs font-semibold text-primary hover:bg-muted'>Open delivery health and retry tools</Link>
					</CardContent>
				</Card>
			</section>

			<section className='grid gap-6 xl:grid-cols-3'>
				<Card className='xl:col-span-2 border-border/60 shadow-sm'>
					<CardHeader><CardTitle className='text-lg'>Top stores</CardTitle><CardDescription>Ranked by all-time paid GMV, with payout and dispute context.</CardDescription></CardHeader>
					<CardContent><div className='overflow-x-auto rounded-lg border border-border'><Table className='min-w-[820px]'><TableHeader className='bg-muted/50'><TableRow className='hover:bg-muted/50'><TableHead>Store</TableHead><TableHead className='text-right'>GMV</TableHead><TableHead className='text-right'>Revenue</TableHead><TableHead className='text-right'>Orders</TableHead><TableHead className='text-right'>Refunds / returns</TableHead><TableHead className='text-right'>At-risk payable</TableHead></TableRow></TableHeader><TableBody>{data.topStores.map((store) => <TableRow key={store.storeId} className='border-border/60 transition-colors duration-150 hover:bg-accent/60 dark:hover:bg-accent/20'><TableCell><Link href={`/dashboard/admin/stores/${store.storeId}`} className='font-medium text-primary hover:underline'>{store.name}</Link><p className='text-xs text-muted-foreground'>/{store.url} · {store.chargebacks} chargeback{store.chargebacks === 1 ? '' : 's'}</p></TableCell><TableCell className='text-right'>{money(store.gmv)}</TableCell><TableCell className='text-right'>{money(store.platformRevenue)}</TableCell><TableCell className='text-right'>{store.paidOrders}</TableCell><TableCell className='text-right'>{store.refundedOrders} / {store.completedReturns}</TableCell><TableCell className='text-right'>{store.settlementRiskCount > 0 ? money(store.settlementRiskCents / 100) : 'Clear'}</TableCell></TableRow>)}{data.topStores.length === 0 && <TableRow className='hover:bg-transparent'><TableCell colSpan={6} className='py-8 text-center text-muted-foreground'>No stores are available for ranking.</TableCell></TableRow>}</TableBody></Table></div></CardContent>
				</Card>
				<div className='xl:col-span-1'><RecentTransactions orders={data.recentOrders} title='Recent paid transactions' description='Latest platform order groups' /></div>
			</section>
		</div>
	);
}

function HealthMetric({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
	return <div className='rounded-lg bg-muted/50 p-3'><div className='flex items-center gap-2 text-xs text-muted-foreground'>{icon}{label}</div><p className='mt-1 text-lg font-semibold'>{value.toLocaleString()}</p></div>;
}

import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { UrlPagination } from '@/components/ui/url-pagination';
import { getAdminSellerProfile } from '@/queries/admin-seller-profile';
import { AnalyticsDateRange } from '@/components/dashboard/admin/analytics-date-range';
import { AccountStatusControl } from './account-status-control';

function usd(cents: number) {
	return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function date(value: Date | null | undefined) {
	return value ? value.toLocaleDateString('en-US', { timeZone: 'UTC' }) : '—';
}

function statusClass(status: string) {
	if (['ACTIVE', 'RELEASED', 'PAID'].includes(status)) return 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300';
	if (['DISABLED', 'FAILED', 'BLOCKED', 'REJECTED'].includes(status)) return 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300';
	return 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300';
}

function withParams(values: Record<string, string | null>) {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(values)) if (value) params.set(key, value);
	const query = params.toString();
	return query ? `?${query}` : '';
}

export default async function AdminSellerProfilePage({
	params,
	searchParams,
}: {
	params: Promise<{ sellerId: string }>;
	searchParams: Promise<{ ledgerPage?: string; batchPage?: string; storeId?: string; from?: string; to?: string }>;
}) {
	const [{ sellerId }, query] = await Promise.all([params, searchParams]);
	const profile = await getAdminSellerProfile(sellerId, query);
	if (!profile) notFound();

	const { seller, financials, performance } = profile;
	const selectedStore = seller.stores.find((store) => store.id === profile.selectedStoreId);
	const rangeLabel = profile.dateRange.from || profile.dateRange.to
		? `${profile.dateRange.from ?? 'Beginning'} – ${profile.dateRange.to ?? 'Today'}`
		: 'All time';

	return (
		<div className='w-full max-w-none space-y-6 pb-12'>
			<header className='flex flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-5'>
				<div>
					<div className='mb-2 flex items-center gap-2 text-sm text-muted-foreground'><Link href='/dashboard/admin/settlements' className='hover:text-foreground'>Settlements</Link><span>/</span><span>Seller profile</span></div>
					<h1 className='text-2xl font-bold tracking-tight'>{seller.name}</h1>
					<p className='mt-1 text-sm text-muted-foreground'>{seller.email} · Seller since {date(seller.createdAt)} · All monetary values are USD.</p>
				</div>
				<div className='flex flex-wrap items-center gap-2'><AccountStatusControl userId={seller.id} accountStatus={seller.accountStatus} /><Link href='/dashboard/admin/settlements' className='rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted'>Back to settlements</Link></div>
			</header>

			<section className='grid gap-4 lg:grid-cols-[1.2fr_1fr]'>
				<div className='rounded-xl border border-border p-5'>
					<h2 className='text-lg font-semibold'>Seller identity</h2>
					<div className='mt-4 grid gap-3 text-sm sm:grid-cols-2'>
						<div><p className='text-muted-foreground'>Stores</p><p className='mt-1 text-xl font-semibold'>{profile.storeCount}</p></div>
						<div><p className='text-muted-foreground'>Account role</p><p className='mt-1 font-medium'>{seller.role}</p></div>
						<div><p className='text-muted-foreground'>Account access</p><p className={`mt-1 font-medium ${seller.accountStatus === 'SUSPENDED' ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>{seller.accountStatus}</p></div>
						<div><p className='text-muted-foreground'>Profile email</p><p className='mt-1'>{seller.email}</p></div>
						<div><p className='text-muted-foreground'>Selected scope</p><p className='mt-1'>{selectedStore?.name ?? 'All owned stores'}</p></div>
					</div>
				</div>
				<div className='rounded-xl border border-border p-5'>
					<div className='flex items-center justify-between gap-3'><h2 className='text-lg font-semibold'>Payout-account readiness</h2><span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusClass(seller.paymentAccount?.status ?? 'PENDING')}`}>{seller.paymentAccount?.status ?? 'NOT CONNECTED'}</span></div>
					{seller.paymentAccount ? <div className='mt-4 grid gap-3 text-sm sm:grid-cols-2'>
						<div><p className='text-muted-foreground'>Provider</p><p className='mt-1'>{seller.paymentAccount.provider}</p></div>
						<div><p className='text-muted-foreground'>Country</p><p className='mt-1'>{seller.paymentAccount.country ?? 'Not provided'}</p></div>
						<div><p className='text-muted-foreground'>Transfers</p><p className='mt-1'>{seller.paymentAccount.transfersCapability ?? 'Unknown'}</p></div>
						<div><p className='text-muted-foreground'>Details submitted</p><p className='mt-1'>{seller.paymentAccount.detailsSubmitted ? 'Yes' : 'No'}</p></div>
						<div><p className='text-muted-foreground'>Requirements due</p><p className='mt-1'>{seller.paymentAccount.requirementsDueCount}</p></div>
						<div><p className='text-muted-foreground'>Last checked</p><p className='mt-1'>{date(seller.paymentAccount.lastCheckedAt)}</p></div>
					</div> : <p className='mt-4 text-sm text-muted-foreground'>No payout account is connected. Bank and KYC information is intentionally not displayed here.</p>}
				</div>
			</section>

			<section className='rounded-xl border border-border p-5'>
				<div className='flex flex-wrap items-center justify-between gap-3'><div><h2 className='text-lg font-semibold'>Owned stores</h2><p className='mt-1 text-sm text-muted-foreground'>Choose a store to drill into its results, or keep the combined seller view.</p></div><Link href={`/dashboard/admin/sellers/${seller.id}`} className={`rounded-lg border px-3 py-2 text-sm font-medium ${!profile.selectedStoreId ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'}`}>All stores</Link></div>
				<div className='mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
					{seller.stores.map((store) => <Link key={store.id} href={`/dashboard/admin/sellers/${seller.id}${withParams({ storeId: store.id, from: query.from ?? null, to: query.to ?? null })}`} className={`rounded-lg border p-4 transition-colors hover:bg-muted/40 ${store.id === profile.selectedStoreId ? 'border-primary ring-1 ring-primary/30' : 'border-border'}`}>
						<div className='flex items-start justify-between gap-3'><span className='font-semibold'>{store.name}</span><span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusClass(store.status)}`}>{store.status}</span></div>
						<p className='mt-1 text-xs text-muted-foreground'>/{store.url}</p>
						<div className='mt-3 grid grid-cols-3 gap-2 text-xs'><span><strong className='block text-sm'>{store._count.products}</strong>Products</span><span><strong className='block text-sm'>{store._count.orderGroups}</strong>Orders</span><span><strong className='block text-sm'>{store.averageRating.toFixed(1)}</strong>{store.numReviews} reviews</span></div>
					</Link>)}
					{seller.stores.length === 0 && <p className='text-sm text-muted-foreground'>This seller has no stores.</p>}
				</div>
			</section>

			<section className='rounded-xl border border-border p-5'>
				<div><h2 className='text-lg font-semibold'>Financial statement</h2><p className='mt-1 text-sm text-muted-foreground'>Append-only money facts are combined across {selectedStore?.name ?? 'all owned stores'}; operational statuses show where each balance is now.</p></div>
				<div className='mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6'>
					{[
						['Gross sales', financials.grossCents], ['Discounts', financials.discountCents], ['GoCart commission', financials.commissionCents], ['Refunds', financials.refundedCents], ['Reversals', financials.reversedCents], ['Outstanding', financials.outstandingCents], ['Held', financials.heldCents], ['Eligible', financials.eligibleCents], ['Approved', financials.approvedCents], ['Released', financials.releasedCents], ['Failed', financials.failedCents],
					].map(([label, cents]) => <div key={label} className='rounded-lg bg-muted/40 p-3'><p className='text-xs text-muted-foreground'>{label}</p><p className='mt-1 font-semibold'>{usd(Number(cents))}</p></div>)}
				</div>

				<div className='mt-6 rounded-lg border border-border'>
					<Table className='min-w-[900px] text-left text-sm'>
						<TableHeader className='bg-muted/50'>
							<TableRow className='hover:bg-muted/50'>
								<TableHead className='p-3'>Order group</TableHead><TableHead className='p-3'>Store</TableHead><TableHead className='p-3'>Status</TableHead><TableHead className='p-3'>Gross</TableHead><TableHead className='p-3'>Commission</TableHead><TableHead className='p-3'>Seller payable</TableHead><TableHead className='p-3'>Ledger facts</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{profile.settlements.map((settlement) => <TableRow key={settlement.id} className='align-top border-border/60 transition-colors duration-150 hover:bg-accent/60 dark:hover:bg-accent/20'><TableCell className='p-3 font-mono text-xs'>{settlement.orderGroup.id.slice(0, 8)}<div className='mt-1 font-sans text-xs text-muted-foreground'>{date(settlement.createdAt)}</div></TableCell><TableCell className='p-3'>{settlement.orderGroup.store.name}</TableCell><TableCell className='p-3'><span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusClass(settlement.status)}`}>{settlement.status}</span>{settlement.failureReason && <p className='mt-2 max-w-xs text-red-700 dark:text-red-300'>{settlement.failureReason}</p>}</TableCell><TableCell className='p-3'>{usd(settlement.grossCents)}</TableCell><TableCell className='p-3'>{usd(settlement.commissionCents)}</TableCell><TableCell className='p-3'>{usd(settlement.remainingPayableCents)}<div className='mt-1 text-xs text-muted-foreground'>of {usd(settlement.sellerPayableCents)}</div></TableCell><TableCell className='p-3 text-xs text-muted-foreground'>{settlement.entries.map((entry) => <div key={entry.id}>{entry.entryType}: {usd(entry.sellerPayableCents)}</div>)}</TableCell></TableRow>)}
							{profile.settlements.length === 0 && <TableRow className='hover:bg-transparent'><TableCell colSpan={7} className='p-8 text-center text-muted-foreground'>No settlement ledger entries for this seller scope.</TableCell></TableRow>}
						</TableBody>
					</Table>
					<UrlPagination label='Seller ledger pages' param='ledgerPage' {...profile.settlementPagination} />
				</div>

				<div className='mt-6'><h3 className='font-semibold'>Payout-batch history</h3><div className='mt-3 rounded-lg border border-border'><Table className='min-w-[800px] text-left text-sm'><TableHeader className='bg-muted/50'><TableRow className='hover:bg-muted/50'><TableHead className='p-3'>Payday window</TableHead><TableHead className='p-3'>Status</TableHead><TableHead className='p-3'>Seller amount</TableHead><TableHead className='p-3'>Settlements</TableHead><TableHead className='p-3'>Processed</TableHead></TableRow></TableHeader><TableBody>{profile.batches.map((batch) => <TableRow key={batch.id} className='border-border/60 transition-colors duration-150 hover:bg-accent/60 dark:hover:bg-accent/20'><TableCell className='p-3'>{date(batch.weekStart)} – {date(batch.weekEnd)}<div className='text-xs text-muted-foreground'>{batch.timezone}</div></TableCell><TableCell className='p-3'><span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusClass(batch.status)}`}>{batch.status}</span>{batch.failureReason && <p className='mt-1 text-red-700 dark:text-red-300'>{batch.failureReason}</p>}</TableCell><TableCell className='p-3'>{usd(batch.sellerTotalCents)}</TableCell><TableCell className='p-3'>{batch.settlementCount}</TableCell><TableCell className='p-3'>{date(batch.processedAt)}</TableCell></TableRow>)}{profile.batches.length === 0 && <TableRow className='hover:bg-transparent'><TableCell colSpan={5} className='p-8 text-center text-muted-foreground'>No payout batches for this seller scope.</TableCell></TableRow>}</TableBody></Table><UrlPagination label='Seller payout batch pages' param='batchPage' {...profile.batchPagination} /></div></div>
			</section>

			<section className='rounded-xl border border-border p-5'>
				<div className='flex flex-wrap items-end justify-between gap-4'><div><h2 className='text-lg font-semibold'>Performance drill-down</h2><p className='mt-1 text-sm text-muted-foreground'>Paid orders only · {rangeLabel}{selectedStore ? ` · ${selectedStore.name}` : ''}</p></div><form className='flex flex-wrap items-end gap-2' method='get'><input type='hidden' name='storeId' value={profile.selectedStoreId ?? ''} /><AnalyticsDateRange from={query.from} to={query.to} prefix='seller-performance' /></form></div>
				{!profile.dateRange.valid && <p role='alert' className='mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300'>Choose valid dates where the From date is on or before the To date.</p>}
				<div className='mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5'><div className='rounded-lg bg-muted/40 p-3'><p className='text-xs text-muted-foreground'>Paid orders</p><p className='mt-1 text-xl font-semibold'>{performance.paidOrders}</p></div><div className='rounded-lg bg-muted/40 p-3'><p className='text-xs text-muted-foreground'>Units sold</p><p className='mt-1 text-xl font-semibold'>{performance.unitsSold}</p></div><div className='rounded-lg bg-muted/40 p-3'><p className='text-xs text-muted-foreground'>Net sales</p><p className='mt-1 text-xl font-semibold'>{usd(performance.netSalesCents)}</p></div><div className='rounded-lg bg-muted/40 p-3'><p className='text-xs text-muted-foreground'>Average order value</p><p className='mt-1 text-xl font-semibold'>{usd(performance.averageOrderValueCents)}</p></div><div className='rounded-lg bg-muted/40 p-3'><p className='text-xs text-muted-foreground'>Reviews / rating</p><p className='mt-1 text-xl font-semibold'>{performance.reviewCount} · {performance.averageRating.toFixed(1)} / 5</p></div></div>
				<div className='mt-5 rounded-lg border border-border'><Table className='min-w-[700px] text-left text-sm'><TableHeader className='bg-muted/50'><TableRow className='hover:bg-muted/50'><TableHead className='p-3'>Top product</TableHead><TableHead className='p-3'>Units sold</TableHead><TableHead className='p-3'>Revenue</TableHead></TableRow></TableHeader><TableBody>{performance.topProducts.map((product) => <TableRow key={`${product.productId}-${product.productSlug}`} className='border-border/60 transition-colors duration-150 hover:bg-accent/60 dark:hover:bg-accent/20'><TableCell className='p-3'><div className='font-medium'>{product.name}</div><div className='text-xs text-muted-foreground'>{product.productSlug}</div></TableCell><TableCell className='p-3'>{product.unitsSold}</TableCell><TableCell className='p-3'>{usd(product.revenueCents)}</TableCell></TableRow>)}{performance.topProducts.length === 0 && <TableRow className='hover:bg-transparent'><TableCell colSpan={3} className='p-8 text-center text-muted-foreground'>No paid product sales in this date range.</TableCell></TableRow>}</TableBody></Table></div>
			</section>
		</div>
	);
}

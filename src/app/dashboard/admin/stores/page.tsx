import Link from 'next/link';
import { ExternalLink, Users } from 'lucide-react';
import { DirectoryFilters } from '@/components/dashboard/admin/directory-filters';
import { MarketplaceStatusBadge } from '@/components/dashboard/admin/marketplace-status-badge';
import { MetricCard } from '@/components/dashboard/admin/metric-card';
import StoreStatusSelect from '@/components/dashboard/forms/store-status-select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UrlPagination } from '@/components/ui/url-pagination';
import { getAdminStoreDirectory } from '@/queries/admin-store-operations';
import { StoreStatus } from '@/lib/types';

function usd(cents: number) {
	return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function date(value: Date) {
	return value.toLocaleDateString('en-US', { timeZone: 'UTC' });
}

export default async function AdminStoresPage({ searchParams }: { searchParams: Promise<{ page?: string; search?: string; status?: string }> }) {
	const query = await searchParams;
	const directory = await getAdminStoreDirectory(query);

	return <div className='w-full max-w-none space-y-6 pb-12'>
		<header className='flex flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-5'>
			<div>
				<p className='text-sm text-muted-foreground'>Marketplace operations</p>
				<h1 className='mt-1 text-2xl font-bold tracking-tight'>Stores</h1>
				<p className='mt-1 max-w-3xl text-sm text-muted-foreground'>Review each store with its accountable seller, customer rating, catalog size, paid sales, GoCart commission, and outstanding seller balance.</p>
			</div>
			<Button asChild variant='outline'><Link href='/dashboard/admin/sellers'><Users className='mr-2 size-4' />Seller directory</Link></Button>
		</header>

		<div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
			<MetricCard label='Stores in this result set' value={directory.summary.storeCount} supporting='Use filters to narrow the directory.' />
			<MetricCard label='Active stores on this page' value={directory.summary.activeStores} supporting='Only the visible page is summarized.' />
			<MetricCard label='Paid sales on this page' value={usd(directory.summary.paidSalesCents)} supporting='Paid order groups only.' />
			<MetricCard label='GoCart commission on this page' value={usd(directory.summary.commissionCents)} supporting='Marketplace revenue, not operating profit.' />
		</div>

		<DirectoryFilters key={`${query.search ?? ''}:${query.status ?? 'ALL'}`} initialSearch={query.search} initialStatus={query.status ?? 'ALL'} placeholder='Search store, URL, owner, or email…' statusOptions={[{ value: 'ALL', label: 'All statuses' }, ...Object.values(StoreStatus).map((status) => ({ value: status, label: status }))]} />

		<section className='rounded-xl border border-border bg-card'>
			<div className='border-b border-border/60 px-5 py-4'>
				<h2 className='font-semibold'>Store directory</h2>
				<p className='mt-1 text-sm text-muted-foreground'>Each record links to the store operations view and the seller&apos;s full financial profile.</p>
			</div>
			<div className='hidden lg:block'>
				<Table className='min-w-[1120px]'>
					<TableHeader className='bg-muted/50'><TableRow className='hover:bg-muted/50'><TableHead className='px-5'>Store</TableHead><TableHead>Seller</TableHead><TableHead>Health</TableHead><TableHead>Paid sales</TableHead><TableHead>Commission</TableHead><TableHead>Catalog</TableHead><TableHead className='pr-5 text-right'>Open</TableHead></TableRow></TableHeader>
					<TableBody>
						{directory.items.map((store) => <TableRow key={store.id} className='group/row transition-colors duration-150 hover:bg-accent/60 dark:hover:bg-accent/20'>
							<TableCell className='px-5 py-4'><Link href={`/dashboard/admin/stores/${store.id}`} className='block focus-visible:outline-none'><div className='font-semibold transition-colors group-hover/row:text-primary'>{store.name}</div><div className='mt-1 text-xs text-muted-foreground'>/{store.url} · created {date(store.createdAt)}</div></Link></TableCell>
							<TableCell><Link href={`/dashboard/admin/sellers/${store.user.id}`} className='block hover:text-primary'><div className='font-medium'>{store.user.name}</div><div className='mt-1 text-xs text-muted-foreground'>{store.user.email}</div></Link></TableCell>
							<TableCell><div className='flex flex-wrap items-center gap-2'><StoreStatusSelect storeId={store.id} status={store.status as StoreStatus} /><span className='text-sm font-medium'>{store.averageRating.toFixed(1)} / 5</span><span className='text-xs text-muted-foreground'>({store.numReviews} reviews)</span>{store.featured && <Badge variant='secondary'>Featured</Badge>}</div></TableCell>
							<TableCell><div className='font-medium'>{usd(store.metrics.paidSalesCents)}</div><div className='mt-1 text-xs text-muted-foreground'>{store.metrics.paidOrders} paid orders</div></TableCell>
							<TableCell><div className='font-medium'>{usd(store.metrics.commissionCents)}</div><div className='mt-1 text-xs text-muted-foreground'>{usd(store.metrics.outstandingCents)} awaiting release</div></TableCell>
							<TableCell><div className='font-medium'>{store._count.products} products</div><div className='mt-1 text-xs text-muted-foreground'>{store._count.followers} followers · {store._count.orderGroups} groups</div></TableCell>
							<TableCell className='pr-5 text-right'><Button asChild size='sm'><Link href={`/dashboard/admin/stores/${store.id}`}>Details <ExternalLink className='ml-1 size-3.5' /></Link></Button></TableCell>
						</TableRow>)}
						{directory.items.length === 0 && <TableRow className='hover:bg-transparent'><TableCell colSpan={7} className='h-36 text-center text-muted-foreground'>No stores match this directory filter.</TableCell></TableRow>}
					</TableBody>
				</Table>
			</div>
			<div className='grid gap-3 p-4 lg:hidden'>
				{directory.items.map((store) => <Card key={store.id} className='gap-0 py-0 shadow-none transition-colors hover:bg-accent/60 dark:hover:bg-accent/20'><CardContent className='space-y-4 p-4'>
					<div className='flex items-start justify-between gap-3'><div><Link href={`/dashboard/admin/stores/${store.id}`} className='font-semibold hover:text-primary'>{store.name}</Link><p className='mt-1 text-xs text-muted-foreground'>/{store.url}</p></div><MarketplaceStatusBadge status={store.status} /></div>
					<Link href={`/dashboard/admin/sellers/${store.user.id}`} className='block rounded-lg bg-muted/50 p-3 hover:bg-muted'><p className='text-xs text-muted-foreground'>Seller</p><p className='mt-1 font-medium'>{store.user.name}</p><p className='text-xs text-muted-foreground'>{store.user.email}</p></Link>
					<div className='grid grid-cols-2 gap-3 text-sm'><div><p className='text-xs text-muted-foreground'>Paid sales</p><p className='mt-1 font-semibold'>{usd(store.metrics.paidSalesCents)}</p><p className='text-xs text-muted-foreground'>{store.metrics.paidOrders} paid orders</p></div><div><p className='text-xs text-muted-foreground'>GoCart commission</p><p className='mt-1 font-semibold'>{usd(store.metrics.commissionCents)}</p><p className='text-xs text-muted-foreground'>{usd(store.metrics.outstandingCents)} outstanding</p></div><div><p className='text-xs text-muted-foreground'>Catalog</p><p className='mt-1 font-semibold'>{store._count.products} products</p></div><div><p className='text-xs text-muted-foreground'>Rating</p><p className='mt-1 font-semibold'>{store.averageRating.toFixed(1)} / 5</p><p className='text-xs text-muted-foreground'>{store.numReviews} reviews</p></div></div>
					<div className='flex items-center justify-between gap-3'><StoreStatusSelect storeId={store.id} status={store.status as StoreStatus} /><Button asChild size='sm'><Link href={`/dashboard/admin/stores/${store.id}`}>Open details</Link></Button></div>
				</CardContent></Card>)}
				{directory.items.length === 0 && <p className='py-8 text-center text-sm text-muted-foreground'>No stores match this directory filter.</p>}
			</div>
			<UrlPagination label='Admin store directory pages' param='page' {...directory.pagination} />
		</section>
	</div>;
}

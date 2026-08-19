import Link from 'next/link';
import { Store, UserRound } from 'lucide-react';
import { DirectoryFilters } from '@/components/dashboard/admin/directory-filters';
import { MarketplaceStatusBadge } from '@/components/dashboard/admin/marketplace-status-badge';
import { MetricCard } from '@/components/dashboard/admin/metric-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UrlPagination } from '@/components/ui/url-pagination';
import { getAdminSellerDirectory } from '@/queries/admin-store-operations';
import { StoreStatus } from '@/lib/types';

function usd(cents: number) {
	return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function payoutLabel(account: { status: string; transfersCapability: string | null; detailsSubmitted: boolean } | null) {
	if (!account) return 'Not connected';
	if (account.status === 'ACTIVE' && account.transfersCapability === 'ACTIVE' && account.detailsSubmitted) return 'Ready';
	if (account.status === 'ACTIVE') return 'Review required';
	return account.status.replaceAll('_', ' ');
}

export default async function AdminSellersPage({ searchParams }: { searchParams: Promise<{ page?: string; search?: string; status?: string }> }) {
	const query = await searchParams;
	const directory = await getAdminSellerDirectory(query);

	return <div className='w-full max-w-none space-y-6 pb-12'>
		<header className='flex flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-5'>
			<div><p className='text-sm text-muted-foreground'>Marketplace operations</p><h1 className='mt-1 text-2xl font-bold tracking-tight'>Sellers</h1><p className='mt-1 max-w-3xl text-sm text-muted-foreground'>A seller-centered view of owned stores, payout readiness, catalog size, paid sales, customer ratings, and settlement exposure.</p></div>
			<Button asChild variant='outline'><Link href='/dashboard/admin/stores'><Store className='mr-2 size-4' />Store directory</Link></Button>
		</header>

		<div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'><MetricCard label='Sellers in this result set' value={directory.summary.sellerCount} supporting='Every account owning at least one store.' /><MetricCard label='Active stores on this page' value={directory.summary.activeStores} supporting='Across the visible sellers.' /><MetricCard label='Paid sales on this page' value={usd(directory.summary.paidSalesCents)} supporting='Paid order groups only.' /><MetricCard label='GoCart commission on this page' value={usd(directory.summary.commissionCents)} supporting='Marketplace revenue, not operating profit.' /></div>

		<DirectoryFilters key={`${query.search ?? ''}:${query.status ?? 'ALL'}`} initialSearch={query.search} initialStatus={query.status ?? 'ALL'} placeholder='Search seller, email, store, or URL…' statusOptions={[{ value: 'ALL', label: 'All store statuses' }, ...Object.values(StoreStatus).map((status) => ({ value: status, label: `Has ${status} store` }))]} />

		<section className='rounded-xl border border-border bg-card'><div className='border-b border-border/60 px-5 py-4'><h2 className='font-semibold'>Seller directory</h2><p className='mt-1 text-sm text-muted-foreground'>Open a profile to review the complete append-only ledger, payout history, date-scoped performance, and its individual stores.</p></div>
			<div className='hidden lg:block'><Table className='min-w-[1100px]'><TableHeader className='bg-muted/50'><TableRow className='hover:bg-muted/50'><TableHead className='px-5'>Seller</TableHead><TableHead>Stores & catalog</TableHead><TableHead>Payout readiness</TableHead><TableHead>Paid sales</TableHead><TableHead>Commission</TableHead><TableHead>Customer trust</TableHead><TableHead className='pr-5 text-right'>Profile</TableHead></TableRow></TableHeader><TableBody>{directory.items.map((seller) => <TableRow key={seller.id} className='group/row transition-colors duration-150 hover:bg-accent/60 dark:hover:bg-accent/20'><TableCell className='px-5 py-4'><div className='font-semibold transition-colors group-hover/row:text-primary'>{seller.name}</div><div className='mt-1 text-xs text-muted-foreground'>{seller.email}</div></TableCell><TableCell><div className='font-medium'>{seller.metrics.storeCount} stores · {seller.metrics.activeStoreCount} active</div><div className='mt-1 text-xs text-muted-foreground'>{seller.metrics.productCount} products</div></TableCell><TableCell><MarketplaceStatusBadge status={payoutLabel(seller.paymentAccount).toUpperCase().replaceAll(' ', '_')} /><div className='mt-1 text-xs text-muted-foreground'>{seller.paymentAccount?.requirementsDueCount ?? 0} requirements due</div></TableCell><TableCell><div className='font-medium'>{usd(seller.metrics.paidSalesCents)}</div><div className='mt-1 text-xs text-muted-foreground'>{seller.metrics.paidOrders} paid orders</div></TableCell><TableCell><div className='font-medium'>{usd(seller.metrics.commissionCents)}</div><div className='mt-1 text-xs text-muted-foreground'>{usd(seller.metrics.outstandingCents)} outstanding</div></TableCell><TableCell><div className='font-medium'>{seller.metrics.averageRating.toFixed(1)} / 5</div><div className='mt-1 text-xs text-muted-foreground'>{seller.metrics.reviewCount} reviews</div></TableCell><TableCell className='pr-5 text-right'><Button asChild size='sm'><Link href={`/dashboard/admin/sellers/${seller.id}`}>Open profile</Link></Button></TableCell></TableRow>)}{directory.items.length === 0 && <TableRow className='hover:bg-transparent'><TableCell colSpan={7} className='h-36 text-center text-muted-foreground'>No sellers match this directory filter.</TableCell></TableRow>}</TableBody></Table></div>
			<div className='grid gap-3 p-4 lg:hidden'>{directory.items.map((seller) => <Card key={seller.id} className='gap-0 py-0 shadow-none transition-colors hover:bg-accent/60 dark:hover:bg-accent/20'><CardContent className='space-y-4 p-4'><div className='flex items-start justify-between gap-3'><div><p className='font-semibold'>{seller.name}</p><p className='mt-1 text-xs text-muted-foreground'>{seller.email}</p></div><UserRound className='size-5 text-muted-foreground' /></div><div className='grid grid-cols-2 gap-3 text-sm'><div><p className='text-xs text-muted-foreground'>Stores / products</p><p className='mt-1 font-semibold'>{seller.metrics.storeCount} / {seller.metrics.productCount}</p><p className='text-xs text-muted-foreground'>{seller.metrics.activeStoreCount} active</p></div><div><p className='text-xs text-muted-foreground'>Rating</p><p className='mt-1 font-semibold'>{seller.metrics.averageRating.toFixed(1)} / 5</p><p className='text-xs text-muted-foreground'>{seller.metrics.reviewCount} reviews</p></div><div><p className='text-xs text-muted-foreground'>Paid sales</p><p className='mt-1 font-semibold'>{usd(seller.metrics.paidSalesCents)}</p></div><div><p className='text-xs text-muted-foreground'>GoCart commission</p><p className='mt-1 font-semibold'>{usd(seller.metrics.commissionCents)}</p></div></div><div className='flex items-center justify-between gap-3'><MarketplaceStatusBadge status={payoutLabel(seller.paymentAccount).toUpperCase().replaceAll(' ', '_')} /><Button asChild size='sm'><Link href={`/dashboard/admin/sellers/${seller.id}`}>Open profile</Link></Button></div></CardContent></Card>)}{directory.items.length === 0 && <p className='py-8 text-center text-sm text-muted-foreground'>No sellers match this directory filter.</p>}</div>
			<UrlPagination label='Admin seller directory pages' param='page' {...directory.pagination} />
		</section>
	</div>;
}

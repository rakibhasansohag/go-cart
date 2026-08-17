import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { getCommissionSettings, listSellerSettlements } from '@/lib/settlement/service';
import { notFound, redirect } from 'next/navigation';
import EarningsPanel from './earnings-panel';

export default async function SellerEarningsPage({ params, searchParams }: { params: Promise<{ storeUrl: string }>; searchParams: Promise<{ page?: string }> }) {
	const { userId } = await auth();
	if (!userId) redirect('/sign-in');
	const { storeUrl } = await params;
	const store = await db.store.findFirst({ where: { url: storeUrl, userId }, select: { name: true, url: true } });
	if (!store) notFound();
	const { payoutHoldDays } = await getCommissionSettings();
	const { page } = await searchParams;
	const settlements = await listSellerSettlements({ sellerId: userId, storeUrl: store.url, page: Number(page) });
	return <div className='flex w-full flex-col gap-6 pb-12'><header className='border-b border-border/60 pb-4'><h1 className='text-2xl font-bold tracking-tight'>Earnings &amp; payday</h1><p className='mt-1 text-sm text-muted-foreground'>{store.name} · USD ledger · weekly review in Asia/Dhaka · updates automatically</p></header><EarningsPanel key={`earnings-page-${settlements.pagination.page}`} storeUrl={store.url} payoutHoldDays={payoutHoldDays} initialSummary={settlements.summary} pagination={settlements.pagination} initialSettlements={settlements.items.map((item) => ({ id: item.id, status: item.status, sellerPayableCents: item.sellerPayableCents, remainingPayableCents: item.remainingPayableCents, eligibleAt: item.eligibleAt, orderGroup: { id: item.orderGroup.id } }))} /></div>;
}

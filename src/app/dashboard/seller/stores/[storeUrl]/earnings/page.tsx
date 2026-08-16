import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { getCommissionSettings, listSellerSettlements } from '@/lib/settlement/service';
import { notFound, redirect } from 'next/navigation';
import EarningsPanel from './earnings-panel';

export default async function SellerEarningsPage({ params }: { params: Promise<{ storeUrl: string }> }) {
	const { userId } = await auth();
	if (!userId) redirect('/sign-in');
	const { storeUrl } = await params;
	const store = await db.store.findFirst({ where: { url: storeUrl, userId }, select: { name: true, url: true } });
	if (!store) notFound();
	const { payoutHoldDays } = await getCommissionSettings();
	const settlements = (await listSellerSettlements(userId)).filter((item) => item.orderGroup.store.url === store.url);
	return <div className='mx-auto flex w-full max-w-[1400px] flex-col gap-6 pb-12'><header className='border-b border-border/60 pb-4'><h1 className='text-2xl font-bold tracking-tight'>Earnings &amp; payday</h1><p className='mt-1 text-sm text-muted-foreground'>{store.name} · USD ledger · weekly review in Asia/Dhaka · updates automatically</p></header><EarningsPanel storeUrl={store.url} payoutHoldDays={payoutHoldDays} initialSettlements={settlements.map((item) => ({ id: item.id, status: item.status, sellerPayableCents: item.sellerPayableCents, remainingPayableCents: item.remainingPayableCents, eligibleAt: item.eligibleAt, orderGroup: { id: item.orderGroup.id } }))} /></div>;
}

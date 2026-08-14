import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { getCommissionSettings, listSellerSettlements } from '@/lib/settlement/service';
import { notFound, redirect } from 'next/navigation';

export default async function SellerEarningsPage({ params }: { params: Promise<{ storeUrl: string }> }) {
	const { userId } = await auth();
	if (!userId) redirect('/sign-in');
	const { storeUrl } = await params;
	const store = await db.store.findFirst({ where: { url: storeUrl, userId }, select: { name: true, url: true } });
	if (!store) notFound();
	const { payoutHoldDays } = await getCommissionSettings();
	const settlements = (await listSellerSettlements(userId)).filter((item) => item.orderGroup.store.url === store.url);
	const held = settlements.filter((item) => ['HELD', 'BLOCKED'].includes(item.status)).reduce((sum, item) => sum + item.remainingPayableCents, 0);
	const released = settlements.filter((item) => item.status === 'RELEASED').reduce((sum, item) => sum + item.sellerPayableCents, 0);
	const holdCopy = payoutHoldDays === 0
		? 'Funds can become eligible immediately after delivery evidence (sandbox testing mode).'
		: `Funds wait for delivery evidence and the ${payoutHoldDays}-day return-risk window.`;
	return <div className='mx-auto flex w-full max-w-[1400px] flex-col gap-6 pb-12'><header className='border-b border-border/60 pb-4'><h1 className='text-2xl font-bold tracking-tight'>Earnings &amp; payday</h1><p className='mt-1 text-sm text-muted-foreground'>{store.name} · USD ledger · weekly review in Asia/Dhaka</p></header><div className='grid gap-4 sm:grid-cols-2'><div className='rounded-xl border border-border p-5'><p className='text-xs text-muted-foreground'>Held or blocked</p><p className='mt-2 text-2xl font-semibold'>${(held / 100).toFixed(2)}</p><p className='mt-1 text-xs text-muted-foreground'>{holdCopy}</p></div><div className='rounded-xl border border-border p-5'><p className='text-xs text-muted-foreground'>Released to seller</p><p className='mt-2 text-2xl font-semibold'>${(released / 100).toFixed(2)}</p><p className='mt-1 text-xs text-muted-foreground'>The platform commission is already reflected in each entry.</p></div></div><div className='overflow-x-auto rounded-xl border border-border'><table className='w-full text-left text-sm'><thead className='bg-muted/50'><tr><th className='p-3'>Order group</th><th className='p-3'>Status</th><th className='p-3'>Seller payable</th><th className='p-3'>Eligible after</th></tr></thead><tbody>{settlements.map((item) => <tr key={item.id} className='border-t border-border/60'><td className='p-3 font-mono text-xs'>{item.orderGroup.id.slice(0, 8)}</td><td className='p-3'>{item.status}</td><td className='p-3'>${(item.sellerPayableCents / 100).toFixed(2)}</td><td className='p-3'>{item.eligibleAt ? item.eligibleAt.toLocaleDateString('en-US') : 'Admin evidence required'}</td></tr>)}{settlements.length === 0 && <tr><td colSpan={4} className='p-8 text-center text-muted-foreground'>No paid order groups have generated a settlement yet.</td></tr>}</tbody></table></div></div>;
}

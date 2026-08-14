'use client';

import { useState } from 'react';

type Settlement = {
	id: string;
	status: string;
	sellerPayableCents: number;
	remainingPayableCents: number;
	seller: { name: string; email: string };
	orderGroup: { id: string; store: { name: string; url: string } };
	payoutBatch: { id: string } | null;
};

type Batch = { id: string; weekStart: Date; weekEnd: Date; status: string; totalCents: number };

export default function SettlementsTable({ initialSettlements, initialBatches }: { initialSettlements: Settlement[]; initialBatches: Batch[] }) {
	const [message, setMessage] = useState('');
	const [busy, setBusy] = useState(false);
	async function run(action: string, batchId?: string) {
		setBusy(true);
		const response = await fetch('/api/admin/settlements', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, batchId }) });
		const data = await response.json() as { error?: string; batch?: { id: string; status: string } };
		setMessage(data.error ?? `${action} completed${data.batch ? ` (${data.batch.status})` : ''}. Refresh to see the new state.`);
		setBusy(false);
	}
	return (
		<div className='mx-auto flex w-full max-w-[1600px] flex-col gap-6 pb-12'>
			<header className='flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4'>
				<div><h1 className='text-2xl font-bold tracking-tight'>Marketplace settlements</h1><p className='mt-1 text-sm text-muted-foreground'>Review held funds, approve the weekly Asia/Dhaka payday batch, and inspect transfer failures.</p></div>
				<button disabled={busy} onClick={() => run('create-batch')} className='rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50'>Create weekly batch</button>
			</header>
			{message && <p role='status' className='rounded-lg border border-border p-3 text-sm'>{message}</p>}
			{initialBatches.length > 0 && <section className='rounded-xl border border-border p-4'><h2 className='font-semibold'>Weekly payday batches</h2><div className='mt-3 space-y-2'>{initialBatches.map((batch) => <div key={batch.id} className='flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/40 p-3 text-sm'><span>{batch.weekStart.toLocaleDateString()} – {batch.weekEnd.toLocaleDateString()} · ${(batch.totalCents / 100).toFixed(2)} · {batch.status}</span><span className='flex gap-2'>{batch.status === 'DRAFT' && <button disabled={busy} onClick={() => run('approve', batch.id)} className='rounded border border-border px-2 py-1 text-xs'>Approve</button>}{(batch.status === 'APPROVED' || batch.status === 'PARTIAL') && <button disabled={busy} onClick={() => run('process', batch.id)} className='rounded bg-primary px-2 py-1 text-xs text-primary-foreground'>Process transfers</button>}</span></div>)}</div></section>}
			<div className='overflow-x-auto rounded-xl border border-border'>
				<table className='w-full text-left text-sm'><thead className='bg-muted/50'><tr><th className='p-3'>Seller / store</th><th className='p-3'>Order group</th><th className='p-3'>Status</th><th className='p-3'>Payable</th><th className='p-3'>Action</th></tr></thead><tbody>
					{initialSettlements.map((settlement) => <tr key={settlement.id} className='border-t border-border/60'><td className='p-3'>{settlement.seller.name}<div className='text-xs text-muted-foreground'>{settlement.orderGroup.store.name}</div></td><td className='p-3 font-mono text-xs'>{settlement.orderGroup.id.slice(0, 8)}</td><td className='p-3'>{settlement.status}</td><td className='p-3'>${(settlement.remainingPayableCents / 100).toFixed(2)} USD</td><td className='p-3 text-xs text-muted-foreground'>{['FAILED', 'BLOCKED'].includes(settlement.status) && settlement.payoutBatch ? <button disabled={busy} onClick={() => run('retry', settlement.id)} className='rounded border border-border px-2 py-1'>Retry after correction</button> : 'Batch actions are available after creating the weekly batch.'}</td></tr>)}
					{initialSettlements.length === 0 && <tr><td colSpan={5} className='p-8 text-center text-muted-foreground'>No settlement entries yet. Paid order groups will appear here.</td></tr>}
				</tbody></table>
			</div>
		</div>
	);
}

'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { UrlPagination } from '@/components/ui/url-pagination';

type Settlement = {
	id: string;
	status: string;
	sellerPayableCents: number;
	remainingPayableCents: number;
	failureReason: string | null;
	seller: { id: string; name: string; email: string };
	orderGroup: { id: string; store: { name: string; url: string } };
	payoutBatch: { id: string; status: string; weekStart: Date } | null;
};

type Batch = {
	id: string;
	weekStart: Date;
	weekEnd: Date;
	status: string;
	totalCents: number;
	_count: { settlements: number };
};

type Pagination = { page: number; pageSize: number; total: number; totalPages: number };

const BATCH_STATUS_COPY: Record<string, string> = {
	DRAFT: 'Needs admin approval. Seller funds are not being transferred yet.',
	APPROVED: 'Approved and ready for Stripe transfers.',
	PROCESSING: 'Stripe transfers are being created. Keep this page open until it completes.',
	PAID: 'All approved seller transfers in this batch completed.',
	PARTIAL: 'Some transfers failed. Review the blocked rows and retry after correction.',
	FAILED: 'Batch processing failed. Review the transfer error before retrying.',
	CANCELLED: 'This batch was cancelled and cannot be processed.',
};

function batchCopy(batch: Batch) {
	if (batch._count.settlements === 0) {
		return batch.status === 'PAID'
			? 'Completed with no attached settlements; no seller transfer was made.'
			: 'No eligible seller settlements were attached. Delivery evidence must be recorded before funds can enter a batch.';
	}
	return BATCH_STATUS_COPY[batch.status] ?? 'Review this batch status.';
}

function settlementCopy(settlement: Settlement) {
	if (settlement.status === 'BLOCKED' && !settlement.payoutBatch) {
		return 'Waiting for delivery evidence. Mark the shipment Delivered before creating a payout batch.';
	}
	if (settlement.failureReason) return settlement.failureReason;
	if (settlement.status === 'HELD') return 'Delivery evidence recorded; waiting for the configured payout window.';
	if (settlement.status === 'ELIGIBLE') return 'Ready to include in the next weekly payday batch.';
	if (settlement.status === 'APPROVED') return 'Included in an approved batch and ready for transfer processing.';
	if (settlement.status === 'PROCESSING') return 'Transfer is currently being created.';
	if (settlement.status === 'RELEASED') return 'Transfer completed and funds were released to the seller.';
	return 'Review the settlement status and batch history for the next action.';
}

export default function SettlementsTable({
	initialSettlements,
	initialBatches,
	settlementPagination,
	batchPagination,
	payoutHoldDays,
	selectedBatchId,
}: {
	initialSettlements: Settlement[];
	initialBatches: Batch[];
	settlementPagination: Pagination;
	batchPagination: Pagination;
	payoutHoldDays: number;
	selectedBatchId?: string;
}) {
	const router = useRouter();
	const [message, setMessage] = useState('');
	const [busyAction, setBusyAction] = useState<string | null>(null);

	async function run(action: string, id?: string) {
		setBusyAction(id ? `${action}:${id}` : action);
		setMessage('');
		try {
			const body: { action: string; batchId?: string; settlementId?: string } = { action };
			if (action === 'retry') body.settlementId = id;
			else if (id) body.batchId = id;
			const response = await fetch('/api/admin/settlements', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body),
			});
			const data = await response.json() as {
				error?: string;
				batch?: { status: string; totalCents?: number };
			};
			if (!response.ok) throw new Error(data.error ?? 'Settlement action failed.');

			const status = data.batch?.status;
			const actionLabel = action === 'create-batch' ? 'Weekly batch created' : `${action[0].toUpperCase()}${action.slice(1)} completed`;
			const detail = status ? ` Batch status: ${status}.` : '';
			setMessage(`${actionLabel}.${detail} The page is updating.`);
			if (action === 'process' && status === 'PARTIAL') toast.warning('Batch finished with failed seller transfers. Review the settlement rows.');
			else if (action === 'process' && status === 'PAID') toast.success('All seller transfers completed successfully.');
			else toast.success(`${actionLabel}.${detail}`);
			router.refresh();
		} catch (error) {
			const text = error instanceof Error ? error.message : 'Settlement action failed.';
			setMessage(text);
			toast.error(text);
		} finally {
			setBusyAction(null);
		}
	}

	return (
		<div className='mx-auto flex w-full max-w-[1600px] flex-col gap-6 pb-12'>
			<header className='flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4'>
				<div>
					<h1 className='text-2xl font-bold tracking-tight'>Marketplace settlements</h1>
					<p className='mt-1 text-sm text-muted-foreground'>Review delivery evidence, approve the weekly Asia/Dhaka payday batch, and process seller transfers. New settlements wait {payoutHoldDays} day{payoutHoldDays === 1 ? '' : 's'} after delivery evidence.</p>
				</div>
				<button disabled={Boolean(busyAction)} onClick={() => run('create-batch')} className='rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50'>
					{busyAction === 'create-batch' ? 'Creating…' : 'Create weekly batch'}
				</button>
			</header>

			{message && <p role='status' aria-live='polite' className='rounded-lg border border-border bg-muted/30 p-3 text-sm'>{message}</p>}

			<section className='rounded-xl border border-border bg-muted/20 p-4'>
				<h2 className='font-semibold'>How payday works</h2>
				<div className='mt-3 grid gap-3 text-sm md:grid-cols-4'>
					<div><strong>1. Delivery</strong><p className='mt-1 text-muted-foreground'>Admin records delivery evidence.</p></div>
					<div><strong>2. Eligibility</strong><p className='mt-1 text-muted-foreground'>{payoutHoldDays === 0 ? 'Funds become eligible immediately.' : `Funds wait ${payoutHoldDays} day${payoutHoldDays === 1 ? '' : 's'}.`}</p></div>
					<div><strong>3. Approval</strong><p className='mt-1 text-muted-foreground'>Create and approve the weekly batch.</p></div>
					<div><strong>4. Transfer</strong><p className='mt-1 text-muted-foreground'>Process the approved batch through Stripe.</p></div>
				</div>
			</section>

			{selectedBatchId && <p role='status' className='rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm'>This payout batch was opened from an admin review notification. Review its contents before you approve it; no email link can approve or transfer funds.</p>}

			{initialBatches.length > 0 && <section className='rounded-xl border border-border p-4'>
				<h2 className='font-semibold'>Weekly payday batches</h2>
				<div className='mt-3 space-y-3'>
					{initialBatches.map((batch) => {
						const actionKey = batch.id;
						return <div id={`payout-batch-${batch.id}`} key={batch.id} className={`rounded-lg bg-muted/40 p-3 text-sm ${batch.id === selectedBatchId ? 'ring-2 ring-primary/50' : ''}`}>
							<div className='flex flex-wrap items-center justify-between gap-3'>
								<span className='font-medium'>{batch.weekStart.toLocaleDateString()} – {batch.weekEnd.toLocaleDateString()} · ${(batch.totalCents / 100).toFixed(2)} · {batch.status}</span>
								<span className='text-xs text-muted-foreground'>{batch._count.settlements} settlement{batch._count.settlements === 1 ? '' : 's'} attached</span>
								<span className='flex gap-2'>
									{batch.status === 'DRAFT' && <button disabled={Boolean(busyAction)} onClick={() => run('approve', actionKey)} className='rounded border border-border px-2 py-1 text-xs disabled:opacity-50'>{busyAction === `approve:${actionKey}` ? 'Approving…' : 'Approve'}</button>}
									{(batch.status === 'APPROVED' || batch.status === 'PARTIAL') && <button disabled={Boolean(busyAction)} onClick={() => run('process', actionKey)} className='rounded bg-primary px-2 py-1 text-xs text-primary-foreground disabled:opacity-50'>{busyAction === `process:${actionKey}` ? 'Processing…' : 'Process transfers'}</button>}
								</span>
							</div>
							<p className='mt-2 text-xs text-muted-foreground'>{batchCopy(batch)}</p>
						</div>;
					})}
				</div>
				<UrlPagination label='Weekly payday batch pages' param='batchPage' {...batchPagination} />
			</section>}

			<div className='overflow-x-auto rounded-xl border border-border'>
				<table className='w-full text-left text-sm'><thead className='bg-muted/50'><tr><th className='p-3'>Seller / store</th><th className='p-3'>Order group</th><th className='p-3'>Status</th><th className='p-3'>Payable</th><th className='p-3'>What happens next</th><th className='p-3'>Action</th></tr></thead><tbody>
					{initialSettlements.map((settlement) => <tr key={settlement.id} className='border-t border-border/60 align-top'>
						<td className='p-3'><Link href={`/dashboard/admin/sellers/${settlement.seller.id}`} className='font-medium text-primary underline-offset-4 hover:underline'>{settlement.seller.name}</Link><div className='text-xs text-muted-foreground'>{settlement.orderGroup.store.name}</div><div className='text-xs text-muted-foreground'>{settlement.seller.email}</div></td>
						<td className='p-3 font-mono text-xs'>{settlement.orderGroup.id.slice(0, 8)}</td>
						<td className='p-3 font-semibold'>{settlement.status}<div className='mt-1 text-xs font-normal text-muted-foreground'>{settlement.payoutBatch ? `Batch: ${settlement.payoutBatch.status}` : 'No batch attached'}</div></td>
						<td className='p-3'>${(settlement.remainingPayableCents / 100).toFixed(2)} USD</td>
						<td className='max-w-md p-3 text-xs text-muted-foreground'>{settlementCopy(settlement)}</td>
						<td className='p-3 text-xs'>{['FAILED', 'BLOCKED'].includes(settlement.status) && settlement.payoutBatch ? <button disabled={Boolean(busyAction)} onClick={() => run('retry', settlement.id)} className='rounded border border-border px-2 py-1 disabled:opacity-50'>{busyAction === `retry:${settlement.id}` ? 'Retrying…' : 'Retry after correction'}</button> : settlement.status === 'BLOCKED' ? <span className='text-muted-foreground'>Complete delivery evidence first.</span> : <span className='text-muted-foreground'>No action needed.</span>}</td>
					</tr>)}
					{initialSettlements.length === 0 && <tr><td colSpan={6} className='p-8 text-center text-muted-foreground'>No settlement entries yet. Paid order groups will appear here.</td></tr>}
				</tbody></table>
				<UrlPagination label='Settlement record pages' param='settlementPage' {...settlementPagination} />
			</div>
		</div>
	);
}

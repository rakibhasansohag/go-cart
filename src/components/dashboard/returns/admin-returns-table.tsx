'use client';

import { useState } from 'react';
import type { ReturnRequestStatus } from '@prisma/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { getAdminReturns, reconcileReturnInventory, transitionReturnRequest } from '@/queries/returns';
import { issueReturnRefund } from '@/queries/refunds';
import { queryKeys } from '@/lib/query-keys';
import { getAllowedReturnTransitions } from '@/lib/returns/domain';
import ReturnStatus, { getReturnStatusLabel } from '@/components/store/profile/returns/return-status';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const FILTERS: Array<{ value: ReturnRequestStatus | 'ALL' | 'DISPUTED'; label: string }> = [
	{ value: 'ALL', label: 'All requests' },
	{ value: 'DISPUTED', label: 'Disputes / Escalated' },
	{ value: 'REQUESTED', label: 'Requested' },
	{ value: 'UNDER_REVIEW', label: 'Under review' },
	{ value: 'AWAITING_SHIPMENT', label: 'Awaiting shipment' },
	{ value: 'IN_TRANSIT', label: 'In transit' },
	{ value: 'RECEIVED', label: 'Received' },
	{ value: 'REFUND_PENDING', label: 'Refund pending' },
	{ value: 'EXCHANGE_PENDING', label: 'Exchange pending' },
	{ value: 'REFUNDED', label: 'Refunded' },
	{ value: 'EXCHANGED', label: 'Exchanged' },
	{ value: 'CLOSED', label: 'Closed' },
];

type Props = { initialData: Awaited<ReturnType<typeof getAdminReturns>> };

export default function AdminReturnsTable({ initialData }: Props) {
	const [status, setStatus] = useState<ReturnRequestStatus | 'ALL' | 'DISPUTED'>('ALL');
	const [search, setSearch] = useState('');
	const [page, setPage] = useState(1);
	const [openRequestId, setOpenRequestId] = useState<string | null>(null);
	const [restockRequest, setRestockRequest] = useState<(typeof initialData.requests)[number] | null>(null);
	const [timelineRequest, setTimelineRequest] = useState<(typeof initialData.requests)[number] | null>(null);
	const [restockChoices, setRestockChoices] = useState<Record<string, boolean>>({});
	const queryClient = useQueryClient();
	const filters = { status: status as ReturnRequestStatus | 'ALL', page, pageSize: 10, search };
	const query = useQuery({
		queryKey: queryKeys.dashboard.adminReturns(filters),
		queryFn: () => getAdminReturns(status, page, 10, search),
		initialData: status === 'ALL' && page === 1 && !search ? initialData : undefined,
	});
	const mutation = useMutation({
		mutationFn: (input: { id: string; toStatus: ReturnRequestStatus }) =>
			transitionReturnRequest({ returnRequestId: input.id, toStatus: input.toStatus, note: `Admin moved request to ${getReturnStatusLabel(input.toStatus)}.` }),
		onSuccess: () => query.refetch(),
	});
	const refundMutation = useMutation({
		mutationFn: (returnRequestId: string) => issueReturnRefund(returnRequestId),
		onSuccess: () => query.refetch(),
	});
	const restockMutation = useMutation({
		mutationFn: () => reconcileReturnInventory({
			returnRequestId: restockRequest!.id,
			items: restockRequest!.items.map((item) => ({ returnItemId: item.id, restockable: restockChoices[item.id] ?? false, quantity: item.receivedQuantity || item.quantity })),
		}),
		onSuccess: (result) => { toast.success(`${result.restocked} item(s) added back to inventory.`); const storeUrl = restockRequest?.store.url; setRestockRequest(null); query.refetch(); queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.adminOrders() }); queryClient.invalidateQueries({ queryKey: ['dashboard', 'inventory'] }); if (storeUrl) queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.inventory(storeUrl) }); },
		onError: (error) => toast.error(error instanceof Error ? error.message : 'Inventory reconciliation failed.'),
	});
	const data = query.data ?? initialData;

	return (
		<div className='space-y-5'>
			<div className='flex flex-wrap gap-2 border-b border-border pb-3'>
				{FILTERS.map((filter) => <button key={filter.value} type='button' className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold ${status === filter.value ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-muted/40 hover:bg-muted'}`} onClick={() => { setStatus(filter.value); setPage(1); }}>{filter.label}</button>)}
			</div>
			<div className='relative max-w-lg'>
				<Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
				<Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder='Search return, order, package, store, seller, or customer' className='pl-9' />
			</div>
			{data.requests.length === 0 ? <div className='rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground'>No return requests match these filters.</div> : (
				<div className='overflow-x-auto rounded-xl border border-border'>
					<table className='w-full min-w-[1250px] text-sm'>
						<thead className='border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground'><tr><th className='p-3'>Return / order</th><th className='p-3'>Store / seller</th><th className='p-3'>Customer</th><th className='p-3'>Item</th><th className='p-3'>Amount</th><th className='p-3'>Status</th><th className='p-3'>Admin action</th></tr></thead>
						<tbody>{data.requests.map((request) => {
							const item = request.items[0]?.orderItem;
							const actions = getAllowedReturnTransitions(request.status, 'ADMIN');
							return <tr key={request.id} className='border-b border-border last:border-0 align-top'>
								<td className='p-3'><div className='font-semibold'>#{request.id.slice(-8).toUpperCase()}</div><div className='text-xs text-muted-foreground'>Order #{request.order.id.slice(-8).toUpperCase()}</div><div className='text-xs text-muted-foreground'>Package #{request.orderGroup.id.slice(-8).toUpperCase()}</div></td>
								<td className='p-3'><div className='font-medium'>{request.store.name}</div><div className='text-xs text-muted-foreground'>{request.store.user?.name || 'Seller'}</div><div className='text-xs text-muted-foreground'>{request.store.user?.email || ''}</div></td>
								<td className='p-3'><div className='font-medium'>{request.customer.name || 'Customer'}</div><div className='text-xs text-muted-foreground'>{request.customer.email}</div></td>
								<td className='p-3'><div className='max-w-64 font-medium'>{item?.name || 'Order item'}</div><div className='text-xs text-muted-foreground'>{item?.sku || ''} · Qty {request.items.reduce((sum, entry) => sum + entry.quantity, 0)}</div></td>
								<td className='p-3 font-semibold'>{request.currency} {request.requestedAmount.toFixed(2)}</td>
								<td className='p-3'><ReturnStatus status={request.status} /></td>
														<td className='p-3'><div className='flex flex-wrap items-center gap-2'><button type='button' className='inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 text-xs font-medium hover:bg-muted' onClick={() => setTimelineRequest(request)}><Eye className='size-3.5' />Timeline</button>{actions.length === 0 && request.status !== 'REFUND_PENDING' && !['RECEIVED', 'REFUNDED', 'EXCHANGED'].includes(request.status) ? <span className='text-xs text-muted-foreground'>No admin action</span> : <DropdownMenu open={openRequestId === request.id} onOpenChange={(open) => setOpenRequestId(open ? request.id : null)}><DropdownMenuTrigger asChild><button type='button' disabled={mutation.isPending || refundMutation.isPending || restockMutation.isPending} onPointerDown={(event) => { if (event.button === 0 && !event.ctrlKey) { event.preventDefault(); setOpenRequestId(request.id); } }} className='inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-muted disabled:cursor-wait disabled:opacity-60'>Choose next step<ChevronDown className='size-3.5' /></button></DropdownMenuTrigger><DropdownMenuContent align='end' className='z-[100000] w-56'><DropdownMenuLabel>Admin resolution steps</DropdownMenuLabel><DropdownMenuSeparator />{actions.map((next) => <DropdownMenuItem key={next} disabled={mutation.isPending || refundMutation.isPending} onSelect={() => { setOpenRequestId(null); mutation.mutate({ id: request.id, toStatus: next }); }}>{getReturnStatusLabel(next)}</DropdownMenuItem>)}{request.status === 'REFUND_PENDING' && <DropdownMenuItem disabled={refundMutation.isPending} onSelect={() => { setOpenRequestId(null); refundMutation.mutate(request.id); }}>Issue payment refund</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu>}{['RECEIVED', 'REFUNDED', 'EXCHANGED'].includes(request.status) && <button type='button' className='cursor-pointer rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300' onClick={() => { setRestockRequest(request); setRestockChoices(Object.fromEntries(request.items.map((item) => [item.id, item.restockable ?? false]))); }}>Reconcile inventory</button>}</div></td>
			</tr>;
						})}</tbody>
					</table>
				</div>
			)}
			<div className='flex items-center justify-between'><span className='text-sm text-muted-foreground'>Showing {data.totalCount} request(s)</span>{data.totalPages > 1 && <div className='flex items-center gap-2'><Button type='button' variant='outline' size='sm' disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft className='size-4' />Previous</Button><span className='text-sm text-muted-foreground'>Page {data.currentPage} of {data.totalPages}</span><Button type='button' variant='outline' size='sm' disabled={page >= data.totalPages} onClick={() => setPage((value) => value + 1)}>Next<ChevronRight className='size-4' /></Button></div>}</div>
			<Dialog open={Boolean(restockRequest)} onOpenChange={(open) => !open && setRestockRequest(null)}>
				<DialogContent>
					<DialogHeader><DialogTitle>Reconcile returned inventory</DialogTitle><DialogDescription>Choose only units that are clean and ready to sell again. Damaged units stay out of stock.</DialogDescription></DialogHeader>
					<div className='space-y-3'>{restockRequest?.items.map((item) => { const received = item.receivedQuantity || item.quantity; const already = item.restockedQuantity; return <label key={item.id} className='flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3'><Checkbox checked={restockChoices[item.id] ?? false} onCheckedChange={(checked) => setRestockChoices((current) => ({ ...current, [item.id]: checked === true }))} /><span className='min-w-0 text-sm'><span className='block font-medium'>{item.orderItem.name}</span><span className='block text-xs text-muted-foreground'>Received {received} · Already restocked {already}</span></span></label>; })}</div>
					<DialogFooter><Button type='button' variant='outline' onClick={() => setRestockRequest(null)}>Cancel</Button><Button type='button' disabled={restockMutation.isPending} onClick={() => restockMutation.mutate()}>{restockMutation.isPending ? 'Saving…' : 'Save inventory changes'}</Button></DialogFooter>
				</DialogContent>
			</Dialog>
			<Dialog open={Boolean(timelineRequest)} onOpenChange={(open) => !open && setTimelineRequest(null)}>
				<DialogContent className='max-w-2xl max-h-[85vh] overflow-y-auto'>
					<DialogHeader>
						<DialogTitle>Return Request Timeline &amp; Evidence</DialogTitle>
						<DialogDescription>
							Review customer notes, evidence uploads, and complete history for Return #{timelineRequest?.id.slice(-8).toUpperCase()}
						</DialogDescription>
					</DialogHeader>
					{timelineRequest && (
						<div className='space-y-4 py-2 text-sm'>
							{timelineRequest.customerNote && (
								<div className='rounded-lg bg-muted/50 p-3 border border-border/60'>
									<span className='font-semibold text-xs text-muted-foreground block mb-1'>Customer Reason Note:</span>
									<p className='text-xs italic text-foreground'>{timelineRequest.customerNote}</p>
								</div>
							)}
							{timelineRequest.evidence && timelineRequest.evidence.length > 0 && (
								<div>
									<span className='font-semibold text-xs text-muted-foreground block mb-2'>Uploaded Evidence ({timelineRequest.evidence.length}):</span>
									<div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
										{timelineRequest.evidence.map((item) => (
											<a key={item.id} href={item.url} target='_blank' rel='noreferrer' className='block overflow-hidden rounded-lg border border-border bg-muted group'>
												<img src={item.url} alt={item.alt || 'Evidence'} className='h-24 w-full object-cover group-hover:scale-105 transition-transform' />
											</a>
										))}
									</div>
								</div>
							)}
							<div>
								<span className='font-semibold text-xs text-muted-foreground block mb-2'>Event Audit History:</span>
								<div className='space-y-2 border-l-2 border-primary/30 pl-4'>
									{timelineRequest.events && timelineRequest.events.length > 0 ? (
										timelineRequest.events.map((event) => (
											<div key={event.id} className='text-xs space-y-0.5'>
												<div className='flex items-center justify-between font-semibold text-foreground'>
													<span className='capitalize'>{event.eventType.replaceAll('.', ' ').replaceAll('_', ' ')}</span>
													<span className='text-[10px] text-muted-foreground'>{new Date(event.createdAt).toLocaleString()}</span>
												</div>
												<div className='text-muted-foreground text-[11px]'>Actor: <span className='font-medium text-foreground'>{event.actorRole}</span> ({event.actorId})</div>
											</div>
										))
									) : (
										<p className='text-xs text-muted-foreground'>No audit events logged yet.</p>
									)}
								</div>
							</div>
						</div>
					)}
					<DialogFooter>
						<Button type='button' variant='outline' onClick={() => setTimelineRequest(null)}>Close</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}


'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { ReturnRequestStatus } from '@prisma/client';
import { Search, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { getSellerReturns, transitionReturnRequest } from '@/queries/returns';
import { queryKeys } from '@/lib/query-keys';
import { getAllowedReturnTransitions } from '@/lib/returns/domain';
import ReturnStatus, { getReturnStatusLabel } from '@/components/store/profile/returns/return-status';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const FILTERS: Array<{ value: ReturnRequestStatus | 'ALL'; label: string }> = [
	{ value: 'ALL', label: 'All requests' },
	{ value: 'REQUESTED', label: 'Requested' },
	{ value: 'UNDER_REVIEW', label: 'Under review' },
	{ value: 'MORE_INFO_REQUIRED', label: 'Needs information' },
	{ value: 'APPROVED', label: 'Approved' },
	{ value: 'IN_TRANSIT', label: 'In transit' },
	{ value: 'RECEIVED', label: 'Received' },
	{ value: 'REFUND_PENDING', label: 'Refund pending' },
	{ value: 'EXCHANGE_PENDING', label: 'Exchange pending' },
	{ value: 'REJECTED', label: 'Rejected' },
	{ value: 'CLOSED', label: 'Closed' },
];

type Props = { storeUrl: string; initialData: Awaited<ReturnType<typeof getSellerReturns>> };

export default function SellerReturnsTable({ storeUrl, initialData }: Props) {
	const [status, setStatus] = useState<ReturnRequestStatus | 'ALL'>('ALL');
	const [search, setSearch] = useState('');
	const [page, setPage] = useState(1);
	const filters = { status, page, pageSize: 10, search };
	const query = useQuery({
		queryKey: queryKeys.dashboard.returns(storeUrl, filters),
		queryFn: () => getSellerReturns(storeUrl, status, page, 10, search),
		initialData: status === 'ALL' && page === 1 && !search ? initialData : undefined,
	});
	const mutation = useMutation({
		mutationFn: (input: { id: string; toStatus: ReturnRequestStatus }) =>
			transitionReturnRequest({ returnRequestId: input.id, toStatus: input.toStatus, note: `Seller moved request to ${getReturnStatusLabel(input.toStatus)}.` }),
		onSuccess: () => query.refetch(),
	});
	const data = query.data ?? initialData;

	return (
		<div className='space-y-5'>
			<div className='flex flex-wrap gap-2 border-b border-border pb-3'>
				{FILTERS.map((filter) => (
					<button key={filter.value} type='button' className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold ${status === filter.value ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-muted/40 hover:bg-muted'}`} onClick={() => { setStatus(filter.value); setPage(1); }}>
						{filter.label}
					</button>
				))}
			</div>
			<div className='relative max-w-md'>
				<Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
				<Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder='Search return, order, customer, or product' className='pl-9' />
			</div>
			{data.requests.length === 0 ? <div className='rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground'>No return requests match these filters.</div> : (
				<div className='overflow-x-auto rounded-xl border border-border'>
					<table className='w-full min-w-[900px] text-sm'>
						<thead className='border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground'><tr><th className='p-3'>Return</th><th className='p-3'>Customer</th><th className='p-3'>Item</th><th className='p-3'>Amount</th><th className='p-3'>Status</th><th className='p-3'>Actions</th></tr></thead>
						<tbody>{data.requests.map((request) => {
							const item = request.items[0]?.orderItem;
							const actions = getAllowedReturnTransitions(request.status, 'SELLER');
							return <tr key={request.id} className='border-b border-border last:border-0 align-top'>
								<td className='p-3'><div className='font-semibold'>#{request.id.slice(-8).toUpperCase()}</div><div className='text-xs text-muted-foreground'>Order #{request.order.id.slice(-8).toUpperCase()}</div><div className='mt-1 flex flex-wrap gap-2'>{request.evidence.length === 0 ? <span className='text-xs text-muted-foreground'>No evidence</span> : request.evidence.map((file) => <a key={file.id} href={file.url} target='_blank' rel='noreferrer' className='text-xs text-primary underline'>{file.type.toLowerCase()}<span className='sr-only'> evidence</span></a>)}</div></td>
								<td className='p-3'><div className='font-medium'>{request.customer.name || 'Customer'}</div><div className='text-xs text-muted-foreground'>{request.customer.email}</div></td>
								<td className='p-3'><div className='font-medium'>{item?.name || 'Order item'}</div><div className='text-xs text-muted-foreground'>{item?.sku} · Qty {request.items.reduce((sum, entry) => sum + entry.quantity, 0)}</div></td>
								<td className='p-3 font-semibold'>{request.currency} {request.requestedAmount.toFixed(2)}</td>
								<td className='p-3'>
									{actions.length === 0 ? <ReturnStatus status={request.status} /> : (
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<button type='button' disabled={mutation.isPending} className='inline-flex cursor-pointer items-center gap-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60' aria-label={`Change return status from ${getReturnStatusLabel(request.status)}`}>
													<ReturnStatus status={request.status} /><ChevronDown className='size-3.5' aria-hidden='true' />
												</button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align='start' className='z-[100000] w-64'>
												<DropdownMenuLabel>Return next steps</DropdownMenuLabel>
												<DropdownMenuSeparator />
												{actions.map((next) => <DropdownMenuItem key={next} disabled={mutation.isPending} onSelect={() => mutation.mutate({ id: request.id, toStatus: next })}>{getReturnStatusLabel(next)}</DropdownMenuItem>)}
											</DropdownMenuContent>
										</DropdownMenu>
									)}
								</td>
								<td className='p-3 text-xs text-muted-foreground'>{actions.length > 0 ? 'Choose the next return step from the status menu.' : 'No seller action'}</td>
							</tr>;
						})}</tbody>
					</table>
				</div>
			)}
			{data.totalPages > 1 && <div className='flex items-center justify-between'><Button type='button' variant='outline' size='sm' disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft className='size-4' />Previous</Button><span className='text-sm text-muted-foreground'>Page {data.currentPage} of {data.totalPages}</span><Button type='button' variant='outline' size='sm' disabled={page >= data.totalPages} onClick={() => setPage((value) => value + 1)}>Next<ChevronRight className='size-4' /></Button></div>}
		</div>
	);
}

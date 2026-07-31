'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import type { ReturnRequestStatus } from '@prisma/client';
import {
	ArrowLeft,
	CalendarDays,
	CheckCircle2,
	ExternalLink,
	FileText,
	MessageSquareText,
	PackageCheck,
	Store,
	Video,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { queryKeys } from '@/lib/query-keys';
import {
	getCustomerReturn,
	transitionReturnRequest,
} from '@/queries/returns';
import ReturnStatus, { getReturnStatusLabel } from './return-status';

export function ReturnDetailSkeleton() {
	return (
		<div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]'>
			<div className='h-[620px] animate-pulse rounded-2xl border border-border bg-muted/30' />
			<div className='h-96 animate-pulse rounded-2xl border border-border bg-muted/30' />
		</div>
	);
}

export default function ReturnDetail({
	returnRequestId,
}: {
	returnRequestId: string;
}) {
	const queryClient = useQueryClient();
	const [responseNote, setResponseNote] = useState('');
	const { data: request } = useSuspenseQuery({
		queryKey: queryKeys.profile.returnDetail(returnRequestId),
		queryFn: () => getCustomerReturn(returnRequestId),
		staleTime: 20_000,
		refetchInterval: (query) => {
			const status = query.state.data?.status;
			return status &&
				!['REJECTED', 'REFUNDED', 'EXCHANGED', 'CANCELLED', 'CLOSED'].includes(
					status,
				)
				? 15_000
				: false;
		},
	});

	const transitionMutation = useMutation({
		mutationFn: ({
			toStatus,
			note,
		}: {
			toStatus: ReturnRequestStatus;
			note?: string;
		}) =>
			transitionReturnRequest({
				returnRequestId,
				toStatus,
				note,
			}),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: queryKeys.profile.returnDetail(returnRequestId),
				}),
				queryClient.invalidateQueries({
					queryKey: ['profile', 'returns'],
				}),
				request?.order.id
					? queryClient.invalidateQueries({
							queryKey: queryKeys.orders.detail(request.order.id),
						})
					: Promise.resolve(),
			]);
			setResponseNote('');
			toast.success('Return request updated.');
		},
		onError: (error) => {
			toast.error(
				error instanceof Error
					? error.message
					: 'Could not update the return request.',
			);
		},
	});

	if (!request) {
		return (
			<div className='rounded-2xl border border-border bg-card p-8 text-center'>
				<h2 className='font-semibold'>Return request unavailable</h2>
				<p className='mt-2 text-sm text-muted-foreground'>
					This request could not be found or does not belong to your account.
				</p>
			</div>
		);
	}

	const canCancel = ['REQUESTED', 'MORE_INFO_REQUIRED'].includes(request.status);
	const canRespond = request.status === 'MORE_INFO_REQUIRED';
	const canMarkShipped = request.status === 'AWAITING_SHIPMENT';

	return (
		<div className='space-y-5'>
			<div className='flex flex-wrap items-center justify-between gap-3'>
				<Button asChild variant='ghost' size='sm'>
					<Link href='/profile/returns'>
						<ArrowLeft className='size-4' aria-hidden='true' />
						All returns
					</Link>
				</Button>
				<ReturnStatus status={request.status} />
			</div>

			<div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]'>
				<div className='space-y-6'>
					<section
						aria-labelledby='returned-items-heading'
						className='rounded-2xl border border-border bg-card p-5 shadow-sm'
					>
						<h2 id='returned-items-heading' className='font-semibold'>
							Returned items
						</h2>
						<div className='mt-4 space-y-4'>
							{request.items.map((entry) => (
								<div
									key={entry.id}
									className='flex gap-4 rounded-xl border border-border bg-muted/20 p-3'
								>
									<Image
										src={entry.orderItem.image}
										alt={entry.orderItem.name}
										width={88}
										height={88}
										className='size-20 rounded-lg object-cover'
									/>
									<div className='min-w-0 flex-1'>
										<h3 className='line-clamp-2 text-sm font-semibold'>
											{entry.orderItem.name}
										</h3>
										<p className='mt-1 text-xs text-muted-foreground'>
											Size {entry.orderItem.size} · Qty {entry.quantity}
										</p>
										<p className='mt-2 text-sm font-semibold'>
											{request.currency} {entry.requestedAmount.toFixed(2)}
										</p>
									</div>
								</div>
							))}
						</div>
					</section>

					<section
						aria-labelledby='return-timeline-heading'
						className='rounded-2xl border border-border bg-card p-5 shadow-sm'
					>
						<div className='flex items-center gap-2'>
							<MessageSquareText
								className='size-5 text-primary'
								aria-hidden='true'
							/>
							<h2 id='return-timeline-heading' className='font-semibold'>
								Request timeline
							</h2>
						</div>
						<ol className='relative mt-5 space-y-0 border-l border-border pl-6'>
							{request.events.map((event) => (
								<li key={event.id} className='relative pb-6 last:pb-0'>
									<span className='absolute -left-[29px] top-1 size-3 rounded-full border-2 border-background bg-primary' />
									<div className='flex flex-wrap items-start justify-between gap-2'>
										<div>
											<h3 className='text-sm font-semibold'>
												{event.toStatus
													? getReturnStatusLabel(event.toStatus)
													: event.eventType}
											</h3>
											<p className='mt-1 text-xs text-muted-foreground'>
												{event.actor?.name ||
													(event.actorRole === 'CUSTOMER'
														? 'You'
														: event.actorRole.toLowerCase())}
												{' · '}
												{new Date(event.createdAt).toLocaleString()}
											</p>
										</div>
										<span className='rounded-full bg-muted px-2 py-1 text-[11px] font-medium capitalize text-muted-foreground'>
											{event.actorRole.toLowerCase()}
										</span>
									</div>
									{event.note && (
										<p className='mt-3 whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm leading-6'>
											{event.note}
										</p>
									)}
								</li>
							))}
						</ol>
					</section>

					{request.evidence.length > 0 && (
						<section
							aria-labelledby='return-evidence-heading'
							className='rounded-2xl border border-border bg-card p-5 shadow-sm'
						>
							<h2 id='return-evidence-heading' className='font-semibold'>
								Evidence
							</h2>
							<ul className='mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3'>
								{request.evidence.map((file, index) => (
									<li key={file.id}>
										<a
											href={file.url}
											target='_blank'
											rel='noreferrer'
											className='group relative flex h-32 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
											aria-label={`Open evidence ${index + 1} in a new tab`}
										>
											{file.type === 'IMAGE' ? (
												<Image
													src={file.url}
													alt={file.alt || `Return evidence ${index + 1}`}
													fill
													className='object-cover'
													sizes='(max-width: 640px) 50vw, 220px'
												/>
											) : file.type === 'VIDEO' ? (
												<Video className='size-8 text-muted-foreground' />
											) : (
												<FileText className='size-8 text-muted-foreground' />
											)}
											<ExternalLink className='absolute right-2 top-2 size-4 rounded bg-background/80 p-0.5 opacity-0 shadow-sm group-hover:opacity-100 group-focus-visible:opacity-100' />
										</a>
									</li>
								))}
							</ul>
						</section>
					)}

					{(canRespond || canMarkShipped || canCancel) && (
						<section
							aria-labelledby='return-actions-heading'
							className='rounded-2xl border border-border bg-card p-5 shadow-sm'
						>
							<h2 id='return-actions-heading' className='font-semibold'>
								What you can do
							</h2>

							{canRespond && (
								<div className='mt-4 space-y-2'>
									<Label htmlFor='return-response'>
										Response to the reviewer
									</Label>
									<Textarea
										id='return-response'
										value={responseNote}
										onChange={(event) => setResponseNote(event.target.value)}
										maxLength={2000}
										placeholder='Add the information requested by the store or administrator.'
									/>
									<Button
										type='button'
										onClick={() =>
											transitionMutation.mutate({
												toStatus: 'UNDER_REVIEW',
												note: responseNote,
											})
										}
										disabled={
											transitionMutation.isPending || !responseNote.trim()
										}
									>
										Send response
									</Button>
								</div>
							)}

							{canMarkShipped && (
								<div className='mt-4 rounded-xl bg-muted/40 p-4'>
									<p className='text-sm leading-6 text-muted-foreground'>
										Mark the return as shipped after handing the parcel to the
										carrier. Tracking details will be added in the shipment phase.
									</p>
									<Button
										type='button'
										className='mt-3'
										onClick={() =>
											transitionMutation.mutate({ toStatus: 'IN_TRANSIT' })
										}
										disabled={transitionMutation.isPending}
									>
										<PackageCheck className='size-4' aria-hidden='true' />
										Mark as shipped
									</Button>
								</div>
							)}

							{canCancel && (
								<div className='mt-4 border-t border-border pt-4'>
									<Button
										type='button'
										variant='destructive'
										onClick={() =>
											transitionMutation.mutate({ toStatus: 'CANCELLED' })
										}
										disabled={transitionMutation.isPending}
									>
										Cancel return request
									</Button>
								</div>
							)}
						</section>
					)}
				</div>

				<aside
					aria-labelledby='return-summary-heading'
					className='h-fit space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm lg:sticky lg:top-6'
				>
					<h2 id='return-summary-heading' className='font-semibold'>
						Request summary
					</h2>
					<dl className='space-y-3 text-sm'>
						<div className='flex justify-between gap-4'>
							<dt className='text-muted-foreground'>Reason</dt>
							<dd className='text-right capitalize'>
								{request.reason.toLowerCase().replaceAll('_', ' ')}
							</dd>
						</div>
						<div className='flex justify-between gap-4'>
							<dt className='text-muted-foreground'>Resolution</dt>
							<dd className='capitalize'>
								{request.resolution.toLowerCase()}
							</dd>
						</div>
						<div className='flex justify-between gap-4'>
							<dt className='text-muted-foreground'>Items</dt>
							<dd>{request.requestedSubtotal.toFixed(2)}</dd>
						</div>
						<div className='flex justify-between gap-4'>
							<dt className='text-muted-foreground'>Shipping</dt>
							<dd>{request.requestedShipping.toFixed(2)}</dd>
						</div>
						<div className='flex justify-between gap-4'>
							<dt className='text-muted-foreground'>Discount</dt>
							<dd>-{request.requestedDiscount.toFixed(2)}</dd>
						</div>
						<div className='flex justify-between gap-4 border-t border-border pt-3 font-semibold'>
							<dt>Requested total</dt>
							<dd>
								{request.currency} {request.requestedAmount.toFixed(2)}
							</dd>
						</div>
					</dl>

					<div className='space-y-3 border-t border-border pt-4 text-sm'>
						<p className='flex gap-2'>
							<Store className='mt-0.5 size-4 shrink-0 text-primary' />
							<span>
								<span className='block text-xs text-muted-foreground'>Store</span>
								<Link
									href={`/store/${request.store.url}`}
									className='font-medium hover:underline'
								>
									{request.store.name}
								</Link>
							</span>
						</p>
						<p className='flex gap-2'>
							<CalendarDays className='mt-0.5 size-4 shrink-0 text-primary' />
							<span>
								<span className='block text-xs text-muted-foreground'>Submitted</span>
								{new Date(request.createdAt).toLocaleString()}
							</span>
						</p>
						{request.resolvedAt && (
							<p className='flex gap-2'>
								<CheckCircle2 className='mt-0.5 size-4 shrink-0 text-emerald-500' />
								<span>
									<span className='block text-xs text-muted-foreground'>
										Resolved
									</span>
									{new Date(request.resolvedAt).toLocaleString()}
								</span>
							</p>
						)}
					</div>

					<Button asChild variant='outline' className='w-full'>
						<Link href={`/order/${request.order.id}`}>View original order</Link>
					</Button>
				</aside>
			</div>
		</div>
	);
}

'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSuspenseQuery } from '@tanstack/react-query';
import type { ReturnRequestStatus } from '@prisma/client';
import { ChevronLeft, ChevronRight, PackageSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { queryKeys } from '@/lib/query-keys';
import { getCustomerReturns } from '@/queries/returns';
import ReturnStatus from './return-status';

const STATUS_OPTIONS: Array<{
	value: ReturnRequestStatus | 'ALL';
	label: string;
}> = [
	{ value: 'ALL', label: 'All requests' },
	{ value: 'REQUESTED', label: 'Requested' },
	{ value: 'UNDER_REVIEW', label: 'Under review' },
	{ value: 'MORE_INFO_REQUIRED', label: 'Needs information' },
	{ value: 'APPROVED', label: 'Approved' },
	{ value: 'IN_TRANSIT', label: 'In transit' },
	{ value: 'REFUND_PENDING', label: 'Refund pending' },
	{ value: 'REFUNDED', label: 'Refunded' },
	{ value: 'EXCHANGED', label: 'Exchanged' },
	{ value: 'REJECTED', label: 'Rejected' },
	{ value: 'CANCELLED', label: 'Cancelled' },
	{ value: 'CLOSED', label: 'Closed' },
];

export function ReturnsListSkeleton() {
	return (
		<div className='space-y-4'>
			<div className='h-10 w-48 animate-pulse rounded-lg bg-muted' />
			{Array.from({ length: 3 }).map((_, index) => (
				<div
					key={index}
					className='h-44 animate-pulse rounded-2xl border border-border bg-muted/30'
				/>
			))}
		</div>
	);
}

export default function ReturnsList() {
	const [status, setStatus] = useState<ReturnRequestStatus | 'ALL'>('ALL');
	const [page, setPage] = useState(1);

	useEffect(() => {
		setPage(1);
	}, [status]);

	const filters = { status, page, pageSize: 10 };
	const { data } = useSuspenseQuery({
		queryKey: queryKeys.profile.returns(filters),
		queryFn: () => getCustomerReturns(status, page, 10),
		staleTime: 30_000,
		refetchInterval: (query) => {
			const terminalStatuses: ReturnRequestStatus[] = [
				'REJECTED',
				'REFUNDED',
				'EXCHANGED',
				'CANCELLED',
				'CLOSED',
			];
			return query.state.data?.requests.some(
				(request) => !terminalStatuses.includes(request.status),
			)
				? 30_000
				: false;
		},
	});

	return (
		<section aria-labelledby='returns-list-heading' className='space-y-4'>
			<div className='flex flex-col justify-between gap-3 sm:flex-row sm:items-end'>
				<div>
					<h2 id='returns-list-heading' className='text-base font-semibold'>
						Your requests
					</h2>
					<p className='mt-1 text-sm text-muted-foreground'>
						{data.totalCount} return {data.totalCount === 1 ? 'request' : 'requests'}
					</p>
				</div>
				<div className='space-y-1.5'>
					<Label htmlFor='return-status-filter'>Status</Label>
					<select
						id='return-status-filter'
						value={status}
						onChange={(event) =>
							setStatus(
								event.target.value as ReturnRequestStatus | 'ALL',
							)
						}
						className='h-10 min-w-48 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50'
					>
						{STATUS_OPTIONS.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
				</div>
			</div>

			{data.requests.length === 0 ? (
				<div className='rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center'>
					<PackageSearch
						className='mx-auto size-10 text-muted-foreground'
						aria-hidden='true'
					/>
					<h3 className='mt-4 font-semibold'>No return requests found</h3>
					<p className='mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground'>
						Delivered items that are inside the store return window can be
						started from their order details.
					</p>
					<Button asChild variant='outline' className='mt-5'>
						<Link href='/profile/orders'>View your orders</Link>
					</Button>
				</div>
			) : (
				<ul className='space-y-4'>
					{data.requests.map((request) => {
						const item = request.items[0]?.orderItem;
						const latestEvent = request.events[0];

						return (
							<li key={request.id}>
								<article className='rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5'>
									<div className='flex flex-col gap-4 sm:flex-row'>
										{item && (
											<Image
												src={item.image}
												alt={item.name}
												width={96}
												height={96}
												className='size-24 rounded-xl object-cover'
											/>
										)}
										<div className='min-w-0 flex-1'>
											<div className='flex flex-wrap items-start justify-between gap-3'>
												<div>
													<h3 className='line-clamp-2 font-semibold'>
														{item?.name || 'Returned order item'}
													</h3>
													<p className='mt-1 text-xs text-muted-foreground'>
														{request.store.name} · Order #{request.order.id.slice(-8).toUpperCase()}
													</p>
												</div>
												<ReturnStatus status={request.status} />
											</div>

											<dl className='mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4'>
												<div>
													<dt className='text-xs text-muted-foreground'>Requested</dt>
													<dd className='mt-1 font-medium'>
														{new Date(request.createdAt).toLocaleDateString()}
													</dd>
												</div>
												<div>
													<dt className='text-xs text-muted-foreground'>Resolution</dt>
													<dd className='mt-1 font-medium capitalize'>
														{request.resolution.toLowerCase()}
													</dd>
												</div>
												<div>
													<dt className='text-xs text-muted-foreground'>Quantity</dt>
													<dd className='mt-1 font-medium'>
														{request.items.reduce(
															(total, entry) => total + entry.quantity,
															0,
														)}
													</dd>
												</div>
												<div>
													<dt className='text-xs text-muted-foreground'>Estimate</dt>
													<dd className='mt-1 font-medium'>
														{request.currency} {request.requestedAmount.toFixed(2)}
													</dd>
												</div>
											</dl>

											<div className='mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3'>
												<p className='text-xs text-muted-foreground'>
													{latestEvent
														? `Last update ${new Date(latestEvent.createdAt).toLocaleString()}`
														: 'Awaiting an update'}
													{request._count.evidence > 0
														? ` · ${request._count.evidence} evidence file(s)`
														: ''}
												</p>
												<Button asChild size='sm' variant='outline'>
													<Link href={`/profile/returns/${request.id}`}>
														View timeline
													</Link>
												</Button>
											</div>
										</div>
									</div>
								</article>
							</li>
						);
					})}
				</ul>
			)}

			{data.totalPages > 1 && (
				<nav
					aria-label='Returns pagination'
					className='flex items-center justify-between rounded-xl border border-border bg-card p-3'
				>
					<Button
						type='button'
						variant='outline'
						size='sm'
						onClick={() => setPage((current) => Math.max(1, current - 1))}
						disabled={page <= 1}
					>
						<ChevronLeft className='size-4' aria-hidden='true' />
						Previous
					</Button>
					<span className='text-sm text-muted-foreground'>
						Page {data.currentPage} of {data.totalPages}
					</span>
					<Button
						type='button'
						variant='outline'
						size='sm'
						onClick={() =>
							setPage((current) =>
								Math.min(data.totalPages, current + 1),
							)
						}
						disabled={page >= data.totalPages}
					>
						Next
						<ChevronRight className='size-4' aria-hidden='true' />
					</Button>
				</nav>
			)}
		</section>
	);
}

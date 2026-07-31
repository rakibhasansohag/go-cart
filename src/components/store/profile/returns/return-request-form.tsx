'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import type { ReturnReason, ReturnResolution } from '@prisma/client';
import { AlertCircle, ArrowLeft, CalendarDays, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { queryKeys } from '@/lib/query-keys';
import {
	createReturnRequest,
	getReturnCandidate,
	type ReturnEvidenceInput,
} from '@/queries/returns';
import EvidenceUpload from './evidence-upload';

const REASONS: Array<{ value: ReturnReason; label: string }> = [
	{ value: 'DAMAGED', label: 'Arrived damaged' },
	{ value: 'DEFECTIVE', label: 'Defective or not working' },
	{ value: 'WRONG_ITEM', label: 'Wrong item received' },
	{ value: 'NOT_AS_DESCRIBED', label: 'Not as described' },
	{ value: 'SIZE_OR_FIT', label: 'Size or fit issue' },
	{ value: 'CHANGED_MIND', label: 'Changed my mind' },
	{ value: 'ARRIVED_LATE', label: 'Arrived too late' },
	{ value: 'MISSING_PARTS', label: 'Missing parts' },
	{ value: 'OTHER', label: 'Other reason' },
];

export function ReturnRequestFormSkeleton() {
	return (
		<div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]'>
			<div className='h-[620px] animate-pulse rounded-2xl border border-border bg-muted/30' />
			<div className='h-80 animate-pulse rounded-2xl border border-border bg-muted/30' />
		</div>
	);
}

export default function ReturnRequestForm({
	orderItemId,
}: {
	orderItemId: string;
}) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { data: candidate } = useSuspenseQuery({
		queryKey: queryKeys.profile.returnCandidate(orderItemId),
		queryFn: () => getReturnCandidate(orderItemId),
		staleTime: 30_000,
	});
	const [quantity, setQuantity] = useState(1);
	const [reason, setReason] = useState<ReturnReason>('DAMAGED');
	const [resolution, setResolution] =
		useState<ReturnResolution>('REFUND');
	const [note, setNote] = useState('');
	const [evidence, setEvidence] = useState<ReturnEvidenceInput[]>([]);

	const selectedAmount = useMemo(
		() =>
			candidate.amounts.find((amount) => amount.quantity === quantity)
				?.breakdown,
		[candidate.amounts, quantity],
	);

	const createMutation = useMutation({
		mutationFn: () =>
			createReturnRequest({
				orderItemId,
				quantity,
				reason,
				resolution,
				note,
				evidence,
			}),
		onSuccess: async (request) => {
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: ['profile', 'returns'],
				}),
				queryClient.invalidateQueries({
					queryKey: queryKeys.orders.detail(candidate.order.id),
				}),
				queryClient.invalidateQueries({
					queryKey: queryKeys.profile.returnCandidate(orderItemId),
				}),
			]);
			toast.success('Your return request was submitted.');
			router.push(`/profile/returns/${request.id}`);
		},
		onError: (error) => {
			toast.error(
				error instanceof Error
					? error.message
					: 'Could not submit your return request.',
			);
		},
	});

	if (!candidate.eligible) {
		return (
			<section
				aria-labelledby='return-unavailable-heading'
				className='rounded-2xl border border-border bg-card p-6 shadow-sm'
			>
				<div className='flex items-start gap-3'>
					<AlertCircle
						className='mt-0.5 size-5 text-amber-600 dark:text-amber-400'
						aria-hidden='true'
					/>
					<div>
						<h2 id='return-unavailable-heading' className='font-semibold'>
							This item cannot be returned
						</h2>
						<p className='mt-1 text-sm text-muted-foreground'>
							{candidate.message}
						</p>
						<Button asChild variant='outline' className='mt-4'>
							<Link href={`/order/${candidate.order.id}`}>
								<ArrowLeft className='size-4' aria-hidden='true' />
								Back to order
							</Link>
						</Button>
					</div>
				</div>
			</section>
		);
	}

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				createMutation.mutate();
			}}
			className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]'
		>
			<section
				aria-labelledby='return-details-heading'
				className='space-y-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6'
			>
				<div>
					<h2 id='return-details-heading' className='text-lg font-semibold'>
						Return details
					</h2>
					<p className='mt-1 text-sm text-muted-foreground'>
						Tell the store what happened so they can review your request.
					</p>
				</div>

				<div className='flex gap-4 rounded-xl border border-border bg-muted/20 p-3'>
					<Image
						src={candidate.item.image}
						alt={candidate.item.name}
						width={88}
						height={88}
						className='size-20 rounded-lg object-cover'
					/>
					<div className='min-w-0'>
						<p className='line-clamp-2 text-sm font-semibold'>
							{candidate.item.name}
						</p>
						<p className='mt-1 text-xs text-muted-foreground'>
							Size {candidate.item.size} · SKU {candidate.item.sku}
						</p>
						<p className='mt-2 text-sm font-semibold'>
							${candidate.item.price.toFixed(2)} each
						</p>
					</div>
				</div>

				<div className='grid gap-5 sm:grid-cols-2'>
					<div className='space-y-2'>
						<Label htmlFor='return-quantity'>Quantity</Label>
						<select
							id='return-quantity'
							value={quantity}
							onChange={(event) => setQuantity(Number(event.target.value))}
							className='h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50'
						>
							{candidate.amounts.map((amount) => (
								<option key={amount.quantity} value={amount.quantity}>
									{amount.quantity}
								</option>
							))}
						</select>
					</div>

					<div className='space-y-2'>
						<Label htmlFor='return-resolution'>Preferred resolution</Label>
						<select
							id='return-resolution'
							value={resolution}
							onChange={(event) =>
								setResolution(event.target.value as ReturnResolution)
							}
							className='h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50'
						>
							<option value='REFUND'>Refund</option>
							<option value='EXCHANGE'>Exchange</option>
						</select>
					</div>
				</div>

				<div className='space-y-2'>
					<Label htmlFor='return-reason'>Reason for return</Label>
					<select
						id='return-reason'
						value={reason}
						onChange={(event) =>
							setReason(event.target.value as ReturnReason)
						}
						className='h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50'
					>
						{REASONS.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
				</div>

				<div className='space-y-2'>
					<Label htmlFor='return-note'>Describe the issue</Label>
					<Textarea
						id='return-note'
						value={note}
						onChange={(event) => setNote(event.target.value)}
						maxLength={2000}
						rows={5}
						placeholder='Include useful details such as the damage, missing parts, or fit issue.'
						aria-describedby='return-note-help'
					/>
					<p id='return-note-help' className='text-xs text-muted-foreground'>
						{note.length}/2,000 characters
					</p>
				</div>

				<fieldset className='space-y-2'>
					<legend className='text-sm font-medium'>
						Evidence <span className='text-muted-foreground'>(optional)</span>
					</legend>
					<EvidenceUpload
						value={evidence}
						onChange={setEvidence}
						disabled={createMutation.isPending}
					/>
				</fieldset>
			</section>

			<aside
				aria-labelledby='refund-summary-heading'
				className='h-fit space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm lg:sticky lg:top-6'
			>
				<div>
					<h2 id='refund-summary-heading' className='font-semibold'>
						Estimated resolution
					</h2>
					<p className='mt-1 text-xs leading-5 text-muted-foreground'>
						The final amount is confirmed after the store reviews the item.
					</p>
				</div>

				{selectedAmount && (
					<dl className='space-y-3 text-sm'>
						<div className='flex justify-between gap-4'>
							<dt className='text-muted-foreground'>Items</dt>
							<dd>${selectedAmount.itemSubtotal.toFixed(2)}</dd>
						</div>
						<div className='flex justify-between gap-4'>
							<dt className='text-muted-foreground'>Shipping</dt>
							<dd>${selectedAmount.shipping.toFixed(2)}</dd>
						</div>
						<div className='flex justify-between gap-4'>
							<dt className='text-muted-foreground'>Coupon adjustment</dt>
							<dd>-${selectedAmount.couponDiscount.toFixed(2)}</dd>
						</div>
						<div className='flex justify-between gap-4'>
							<dt className='text-muted-foreground'>Tax</dt>
							<dd>${selectedAmount.tax.toFixed(2)}</dd>
						</div>
						<div className='flex justify-between gap-4 border-t border-border pt-3 font-semibold'>
							<dt>Estimated total</dt>
							<dd>${selectedAmount.total.toFixed(2)}</dd>
						</div>
					</dl>
				)}

				<div className='space-y-2 rounded-xl bg-muted/40 p-3 text-xs leading-5 text-muted-foreground'>
					<p className='flex gap-2'>
						<CalendarDays className='mt-0.5 size-4 shrink-0' aria-hidden='true' />
						Request by{' '}
						{candidate.deadline
							? new Date(candidate.deadline).toLocaleDateString()
							: 'the stated deadline'}
						.
					</p>
					<p className='flex gap-2'>
						<ShieldCheck className='mt-0.5 size-4 shrink-0' aria-hidden='true' />
						{candidate.store.returnShippingFees
							? 'Eligible return shipping is included.'
							: 'Original shipping fees are not refundable.'}
					</p>
				</div>

				<Button
					type='submit'
					className='w-full'
					disabled={createMutation.isPending}
				>
					{createMutation.isPending ? 'Submitting…' : 'Submit return request'}
				</Button>
				<Button asChild type='button' variant='ghost' className='w-full'>
					<Link href={`/order/${candidate.order.id}`}>Cancel and go back</Link>
				</Button>
			</aside>
		</form>
	);
}

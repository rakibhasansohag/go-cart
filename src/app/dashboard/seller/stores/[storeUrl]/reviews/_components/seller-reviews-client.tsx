'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { BadgeCheck, MessageSquareReply, Trash2, Star, ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { replyToReview, deleteReviewReply } from '@/queries/review-actions';
import { getStoreReviews } from '@/queries/review-actions';
import ReviewImageLightbox from '@/components/store/shared/review-image-lightbox';

type ReviewsData = Awaited<ReturnType<typeof getStoreReviews>>;
type ReviewItem = ReviewsData['reviews'][number];

interface Props {
	storeUrl: string;
	initialData: ReviewsData;
	currentPage: number;
	ratingFilter?: number;
	replyFilter?: 'replied' | 'unreplied';
}

function StarDisplay({ rating }: { rating: number }) {
	return (
		<div className='flex items-center gap-0.5'>
			{Array.from({ length: 5 }).map((_, i) => (
				<Star
					key={i}
					className={cn(
						'w-3.5 h-3.5',
						i < Math.round(rating)
							? 'fill-yellow-400 text-yellow-400'
							: 'fill-neutral-200 text-neutral-200',
					)}
				/>
			))}
			<span className='ml-1 text-xs text-muted-foreground'>{rating.toFixed(1)}</span>
		</div>
	);
}

function ReplyForm({
	review,
	onDone,
}: {
	review: ReviewItem;
	onDone: () => void;
}) {
	const [body, setBody] = useState(review.reply?.body ?? '');
	const [isPending, startTransition] = useTransition();

	const handleSubmit = () => {
		if (!body.trim()) return;
		startTransition(async () => {
			try {
				await replyToReview(review.id, body);
				toast.success('Reply saved.');
				onDone();
			} catch (e) {
				toast.error(e instanceof Error ? e.message : 'Failed to save reply.');
			}
		});
	};

	return (
		<div className='mt-3 space-y-2'>
			<textarea
				value={body}
				onChange={(e) => setBody(e.target.value)}
				placeholder='Write your official reply...'
				rows={3}
				className='w-full p-3 text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none'
			/>
			<div className='flex gap-2 justify-end'>
				<Button variant='ghost' size='sm' onClick={onDone} disabled={isPending}>
					Cancel
				</Button>
				<Button size='sm' onClick={handleSubmit} disabled={isPending || !body.trim()}>
					{isPending ? 'Saving...' : review.reply ? 'Update Reply' : 'Post Reply'}
				</Button>
			</div>
		</div>
	);
}

function ReviewRow({ review }: { review: ReviewItem }) {
	const [showForm, setShowForm] = useState(false);
	const [localReply, setLocalReply] = useState(review.reply);
	const [lightbox, setLightbox] = useState<{ images: string[]; startIndex: number } | null>(null);
	const [isDeleting, startDeleteTransition] = useTransition();

	const censoredName = review.user.name.length > 2
		? `${review.user.name[0]}***${review.user.name[review.user.name.length - 1]}`
		: `${review.user.name[0]}***`;

	const handleDelete = () => {
		startDeleteTransition(async () => {
			try {
				await deleteReviewReply(review.id);
				setLocalReply(null);
				toast.success('Reply deleted.');
			} catch (e) {
				toast.error(e instanceof Error ? e.message : 'Failed to delete reply.');
			}
		});
	};

	return (
		<div className='border border-neutral-200 dark:border-neutral-700 rounded-2xl p-4 space-y-3 hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors'>
			{/* Header */}
			<div className='flex items-start gap-3'>
				<Image
					src={review.user.picture}
					alt={censoredName}
					width={40}
					height={40}
					className='w-10 h-10 rounded-full object-cover shrink-0'
				/>
				<div className='flex-1 min-w-0'>
					<div className='flex items-center gap-2 flex-wrap'>
						<span className='text-sm font-medium'>{censoredName.toUpperCase()}</span>
						{review.isVerifiedPurchase && (
							<span className='inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded-full'>
								<BadgeCheck className='w-3 h-3' />
								Verified
							</span>
						)}
						<span className='ml-auto text-xs text-muted-foreground'>
							{formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
						</span>
					</div>
					<StarDisplay rating={review.rating} />
					<div className='text-xs text-muted-foreground mt-0.5'>
						on{' '}
						<Link
							href={`/product/${review.product.slug}`}
							className='hover:text-emerald-600 hover:underline transition-colors'
							target='_blank'
						>
							{review.product.name}
						</Link>
						{' · '}
						{review.variant} · {review.size}
					</div>
				</div>
			</div>

			{/* Review text */}
			<p className='text-sm leading-relaxed text-neutral-700 dark:text-neutral-300'>
				{review.review}
			</p>

			{/* Review images */}
			{review.images.length > 0 && (
				<div className='flex gap-2 flex-wrap'>
					{review.images.slice(0, 4).map((img, idx) => (
						<button
							key={img.id}
							onClick={() =>
								setLightbox({
									images: review.images.map((i) => i.url),
									startIndex: idx,
								})
							}
							className='w-16 h-16 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 hover:ring-2 hover:ring-emerald-500 transition-all'
						>
							<Image
								src={img.url}
								alt='Review photo'
								width={64}
								height={64}
								className='w-full h-full object-cover'
							/>
						</button>
					))}
					{review.images.length > 4 && (
						<button
							onClick={() => setLightbox({ images: review.images.map((i) => i.url), startIndex: 4 })}
							className='w-16 h-16 rounded-xl border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-xs text-muted-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors'
						>
							<ImageIcon className='w-4 h-4' />
							<span>+{review.images.length - 4}</span>
						</button>
					)}
				</div>
			)}

			{/* Existing reply */}
			{localReply && !showForm && (
				<div className='bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl p-3 space-y-1.5'>
					<div className='flex items-center justify-between'>
						<span className='text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1'>
							<MessageSquareReply className='w-3.5 h-3.5' />
							Your reply
						</span>
						<div className='flex gap-1'>
							<button
								onClick={() => setShowForm(true)}
								className='text-xs text-muted-foreground hover:text-emerald-600 px-2 py-0.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors'
							>
								Edit
							</button>
							<button
								onClick={handleDelete}
								disabled={isDeleting}
								className='text-xs text-red-400 hover:text-red-500 px-2 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-950 transition-colors'
							>
								<Trash2 className='w-3.5 h-3.5' />
							</button>
						</div>
					</div>
					<p className='text-sm text-neutral-700 dark:text-neutral-300'>{localReply.body}</p>
				</div>
			)}

			{/* Reply form / button */}
			{showForm ? (
				<ReplyForm
					review={{ ...review, reply: localReply }}
					onDone={() => {
						setShowForm(false);
						// Optimistic: re-fetch would be ideal but we just close form
						// Server action calls revalidatePath so next page load is fresh
					}}
				/>
			) : !localReply ? (
				<button
					onClick={() => setShowForm(true)}
					className='flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors'
				>
					<MessageSquareReply className='w-4 h-4' />
					Reply as store
				</button>
			) : null}

			{lightbox && (
				<ReviewImageLightbox
					images={lightbox.images}
					startIndex={lightbox.startIndex}
					onClose={() => setLightbox(null)}
				/>
			)}
		</div>
	);
}

export default function SellerReviewsClient({
	storeUrl,
	initialData,
	currentPage,
	ratingFilter,
	replyFilter,
}: Props) {
	const router = useRouter();
	const sp = useSearchParams();

	const buildUrl = (params: Record<string, string | undefined>) => {
		const next = new URLSearchParams(sp.toString());
		Object.entries(params).forEach(([k, v]) => {
			if (v) next.set(k, v);
			else next.delete(k);
		});
		return `/dashboard/seller/stores/${storeUrl}/reviews?${next.toString()}`;
	};

	const ratings = [5, 4, 3, 2, 1];

	return (
		<>
			{/* Filters */}
			<div className='flex flex-wrap gap-2 items-center'>
				<div className='flex gap-1.5'>
					{ratings.map((r) => (
						<Link
							key={r}
							href={buildUrl({ rating: ratingFilter === r ? undefined : String(r), page: '1' })}
							className={cn(
								'px-3 py-1.5 rounded-full text-sm border transition-colors',
								ratingFilter === r
									? 'border-yellow-400 bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300'
									: 'border-neutral-200 dark:border-neutral-700 hover:border-yellow-300',
							)}
						>
							{r}★
						</Link>
					))}
				</div>
				<div className='flex gap-1.5 ml-2 border-l border-neutral-200 dark:border-neutral-700 pl-2'>
					{(['replied', 'unreplied'] as const).map((f) => (
						<Link
							key={f}
							href={buildUrl({ reply: replyFilter === f ? undefined : f, page: '1' })}
							className={cn(
								'px-3 py-1.5 rounded-full text-sm border transition-colors capitalize',
								replyFilter === f
									? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
									: 'border-neutral-200 dark:border-neutral-700 hover:border-emerald-300',
							)}
						>
							{f}
						</Link>
					))}
				</div>
				{(ratingFilter || replyFilter) && (
					<Link
						href={`/dashboard/seller/stores/${storeUrl}/reviews`}
						className='text-sm text-muted-foreground hover:text-red-500 transition-colors ml-1'
					>
						Clear filters
					</Link>
				)}
				<span className='ml-auto text-sm text-muted-foreground'>
					{initialData.total} review{initialData.total !== 1 ? 's' : ''}
				</span>
			</div>

			{/* Reviews list */}
			{initialData.reviews.length === 0 ? (
				<div className='text-center py-16 text-muted-foreground'>
					No reviews found matching your filters.
				</div>
			) : (
				<div className='space-y-4'>
					{initialData.reviews.map((review) => (
						<ReviewRow key={review.id} review={review} />
					))}
				</div>
			)}

			{/* Pagination */}
			{initialData.totalPages > 1 && (
				<div className='flex items-center justify-center gap-2'>
					<Link
						href={buildUrl({ page: String(currentPage - 1) })}
						aria-disabled={currentPage <= 1}
						className={cn(
							'p-2 rounded-lg border transition-colors',
							currentPage <= 1
								? 'opacity-40 pointer-events-none border-neutral-200 dark:border-neutral-700'
								: 'border-neutral-200 dark:border-neutral-700 hover:border-emerald-400',
						)}
					>
						<ChevronLeft className='w-4 h-4' />
					</Link>
					<span className='text-sm'>
						{currentPage} / {initialData.totalPages}
					</span>
					<Link
						href={buildUrl({ page: String(currentPage + 1) })}
						aria-disabled={currentPage >= initialData.totalPages}
						className={cn(
							'p-2 rounded-lg border transition-colors',
							currentPage >= initialData.totalPages
								? 'opacity-40 pointer-events-none border-neutral-200 dark:border-neutral-700'
								: 'border-neutral-200 dark:border-neutral-700 hover:border-emerald-400',
						)}
					>
						<ChevronRight className='w-4 h-4' />
					</Link>
				</div>
			)}
		</>
	);
}

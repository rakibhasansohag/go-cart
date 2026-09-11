'use client';
import { ReviewWithImageType } from '@/lib/types';

import Image from 'next/image';
import { useState, useTransition } from 'react';

import StarRating from '@/components/StarRating';
import ColorWheel from '../../shared/color-wheel';
import { toggleReviewHelpfulVote } from '@/queries/review-actions';
import { ThumbsUp, ThumbsDown, BadgeCheck, Store, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ReviewCardProps {
	review: ReviewWithImageType;
	onImageClick?: (images: string[], startIndex: number) => void;
}

export default function ReviewCard({ review, onImageClick }: ReviewCardProps) {
	const { images, user } = review;
	const [helpfulCount, setHelpfulCount] = useState(review.helpfulCount);
	const [voted, setVoted] = useState<boolean | null>(review.hasVoted);
	const [isPending, startTransition] = useTransition();

	const censoredName = user.name.length > 2
		? `${user.name[0]}***${user.name[user.name.length - 1]}`
		: `${user.name[0]}***`;

	const colors = review.color
		.split(',')
		.filter((c) => c.trim() !== '')
		.map((c) => ({ name: c.trim() }));

	const handleVote = (helpful: boolean) => {
		startTransition(async () => {
			try {
				const result = await toggleReviewHelpfulVote(review.id, helpful);
				if (result.action === 'removed') {
					setVoted(null);
					if (helpful) setHelpfulCount((p) => p - 1);
				} else if (result.action === 'flipped') {
					setVoted(result.helpful);
					setHelpfulCount((p) => helpful ? p + 1 : p - 1);
				} else {
					setVoted(result.helpful);
					if (helpful) setHelpfulCount((p) => p + 1);
				}
			} catch {
				toast.error('Please sign in to vote on reviews.');
			}
		});
	};

	return (
		<div className='border border-neutral-300 dark:border-neutral-700 rounded-xl flex flex-col h-fit relative py-4 px-3 gap-3'>
			{/* Header row */}
			<div className='flex gap-3'>
				{/* Avatar */}
				<div className='w-14 shrink-0 space-y-1 flex flex-col items-center'>
					<Image
						src={user.picture}
						alt='Profile image'
						width={100}
						height={100}
						className='w-11 h-11 rounded-full object-cover'
					/>
					<span className='text-xs text-main-secondary text-center break-all'>
						{censoredName.toUpperCase()}
					</span>
				</div>

				{/* Review body */}
				<div className='flex flex-1 flex-col gap-2 overflow-hidden'>
					<div className='flex items-center gap-2 flex-wrap'>
						<StarRating
							count={5}
							size={22}
							color='#e5e5e5'
							activeColor='#FFD804'
							value={review.rating}
							isHalf
							edit={false}
						/>
						{review.isVerifiedPurchase && (
							<span className='inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full'>
								<BadgeCheck className='w-3.5 h-3.5' />
								Verified Purchase
							</span>
						)}
					</div>

					<div className='flex items-center gap-x-2 flex-wrap text-main-secondary text-sm'>
						<ColorWheel colors={colors} size={22} />
						<span>·</span>
						<Image
							src={review.variantImage}
							alt=''
							width={36}
							height={36}
							className='object-cover w-8 h-8 rounded-full'
						/>
						<span>{review.variant}</span>
						<span>·</span>
						<span>{review.size}</span>
						<span>·</span>
						<span>{review.quantity} PC</span>
					</div>

					<p className='text-sm leading-relaxed'>{review.review}</p>

					{/* Review images */}
					{images.length > 0 && (
						<div className='flex flex-wrap gap-2'>
							{images.map((img, idx) => (
								<button
									key={img.id}
									className='w-20 h-20 rounded-xl overflow-hidden cursor-pointer ring-1 ring-neutral-200 dark:ring-neutral-700 hover:ring-2 hover:ring-emerald-500 transition-all'
									onClick={() =>
										onImageClick?.(
											images.map((i) => i.url),
											idx,
										)
									}
								>
									<Image
										src={img.url || ''}
										alt={img.alt || 'Review image'}
										width={100}
										height={100}
										className='w-full h-full object-cover'
									/>
								</button>
							))}
							{onImageClick && (
								<button
									className='w-20 h-20 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex flex-col items-center justify-center gap-1 text-xs text-neutral-500 cursor-pointer hover:bg-neutral-200 transition-colors'
									onClick={() => onImageClick(images.map((i) => i.url), 0)}
									aria-label='View all review images'
								>
									<ImageIcon className='w-5 h-5' />
									<span>View all</span>
								</button>
							)}
						</div>
					)}

					{/* Footer: date + helpful votes */}
					<div className='flex items-center justify-between flex-wrap gap-2 mt-1'>
						<span className='text-xs text-neutral-400'>
							{formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
						</span>
						<div className='flex items-center gap-2'>
							<span className='text-xs text-neutral-500'>
								{helpfulCount > 0
									? `${helpfulCount} found helpful`
									: 'Was this helpful?'}
							</span>
							<button
								onClick={() => handleVote(true)}
								disabled={isPending}
								aria-label='Mark as helpful'
								className={cn(
									'p-1.5 rounded-lg border transition-all',
									voted === true
										? 'border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950'
										: 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-emerald-400 hover:text-emerald-500',
								)}
							>
								<ThumbsUp className='w-3.5 h-3.5' />
							</button>
							<button
								onClick={() => handleVote(false)}
								disabled={isPending}
								aria-label='Mark as not helpful'
								className={cn(
									'p-1.5 rounded-lg border transition-all',
									voted === false
										? 'border-red-400 bg-red-50 text-red-500 dark:bg-red-950'
										: 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-red-300 hover:text-red-400',
								)}
							>
								<ThumbsDown className='w-3.5 h-3.5' />
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* Seller reply */}
			{review.reply && (
				<div className='ml-14 mt-1 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl p-3 space-y-1.5'>
					<div className='flex items-center gap-2'>
						<Store className='w-4 h-4 text-emerald-600' />
						<span className='text-sm font-semibold text-emerald-700 dark:text-emerald-400'>
							{review.reply.store.name}
						</span>
						<span className='text-xs text-neutral-400 ml-auto'>
							{formatDistanceToNow(new Date(review.reply.createdAt), {
								addSuffix: true,
							})}
						</span>
					</div>
					<p className='text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed'>
						{review.reply.body}
					</p>
				</div>
			)}
		</div>
	);
}

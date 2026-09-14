'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Minus, Plus, Star } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export interface RatingFacet {
	rating: number;
	count: number;
}

export default function RatingFilter({
	ratings,
}: {
	ratings: RatingFacet[];
}) {
	const [show, setShow] = useState(true);
	const searchParams = useSearchParams();
	const pathname = usePathname();
	const { replace } = useRouter();

	const activeRating = searchParams.get('rating');

	const handleRatingToggle = (tier: number) => {
		const params = new URLSearchParams(searchParams.toString());
		if (activeRating === String(tier)) {
			params.delete('rating');
		} else {
			params.set('rating', String(tier));
		}
		const queryString = params.toString();
		replace(queryString ? `${pathname}?${queryString}` : pathname);
	};

	return (
		<div className='pt-5 pb-4 border-b border-border'>
			<div
				className='relative cursor-pointer flex items-center justify-between select-none'
				onClick={() => setShow((prev) => !prev)}
			>
				<h3 className='text-sm font-bold capitalize text-main-primary'>
					Customer Rating
				</h3>
				<span className='absolute right-0'>
					{show ? <Minus className='w-3 h-3' /> : <Plus className='w-3 h-3' />}
				</span>
			</div>

			<AnimatePresence initial={false}>
				{show && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.2, ease: 'easeInOut' }}
						className='overflow-hidden mt-2.5 space-y-1.5'
					>
						{ratings.map((tier) => {
							const isSelected = activeRating === String(tier.rating);
							return (
								<button
									key={tier.rating}
									type='button'
									onClick={() => handleRatingToggle(tier.rating)}
									className={`w-full flex items-center justify-between py-1 px-1.5 rounded text-xs transition-colors cursor-pointer select-none text-left ${
										isSelected
											? 'bg-primary/10 text-primary font-semibold'
											: 'hover:bg-muted/50 text-muted-foreground'
									}`}
								>
									<div className='flex items-center gap-1.5'>
										<div className='flex items-center text-amber-500'>
											{[1, 2, 3, 4, 5].map((star) => (
												<Star
													key={star}
													className={`w-3.5 h-3.5 ${
														star <= tier.rating
															? 'fill-amber-400 text-amber-400'
															: 'text-muted-foreground/30'
													}`}
												/>
											))}
										</div>
										<span className='text-xs'>& above</span>
									</div>
									<span className='text-[10px] text-muted-foreground/70 bg-muted px-1.5 py-0.5 rounded'>
										{tier.count}
									</span>
								</button>
							);
						})}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

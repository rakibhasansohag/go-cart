'use client';
import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OfferTag } from '@prisma/client';
import { AnimatePresence, motion } from 'framer-motion';
import OfferLink from './offer-link';

export default function OfferFilter({ offers }: { offers: OfferTag[] }) {
	const [show, setShow] = useState<boolean>(true);
	return (
		<div className='pt-5 pb-4'>
			{/* Header */}
			<div
				className='relative cursor-pointer flex items-center justify-between select-none'
				onClick={() => setShow((prev) => !prev)}
			>
				<h3 className='text-sm font-bold overflow-ellipsis capitalize line-clamp-1 text-main-primary'>
					Offer
				</h3>
				<span className='absolute right-0'>
					{show ? <Minus className='w-3' /> : <Plus className='w-3' />}
				</span>
			</div>
			{/* Filter */}
			<AnimatePresence initial={false}>
				{show && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.22, ease: 'easeInOut' }}
						className='overflow-hidden mt-2.5'
					>
						<div className='flex flex-wrap gap-2'>
							{offers.map((offer) => (
								<OfferLink key={offer.id} offer={offer} />
							))}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

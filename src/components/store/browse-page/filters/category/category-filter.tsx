'use client';
import { useState } from 'react';
import { CatgegoryWithSubsType } from '@/lib/types';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import CategoryLink from './category-link';

export default function CategoryFilter({
	categories,
}: {
	categories: CatgegoryWithSubsType[];
}) {
	const [show, setShow] = useState<boolean>(true);
	return (
		<div className='pt-5 pb-4'>
			{/* Header */}
			<div
				className='relative cursor-pointer flex items-center justify-between select-none'
				onClick={() => setShow((prev) => !prev)}
			>
				<h3 className='text-sm font-bold overflow-ellipsis capitalize line-clamp-1 text-main-primary'>
					Category
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
						{categories.map((category) => (
							<CategoryLink key={category.id} category={category} />
						))}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

'use client';
import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FiltersQueryType } from '@/lib/types';
import { getFilteredSizes } from '@/queries/size';
import SizeLink from './size-link';
import { useSuspenseQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

import { AnimatePresence, motion } from 'framer-motion';

export default function SizeFilter({
	queries,
	storeUrl,
}: {
	queries: FiltersQueryType;
	storeUrl?: string;
}) {
	const { category, subCategory, offer, search } = queries;
	const [show, setShow] = useState<boolean>(true);
	const take = 10;

	const { data } = useSuspenseQuery<{ sizes: { size: string }[]; count: number }>({
		queryKey: queryKeys.sizes.filtered({ category, offer, subCategory, storeUrl }),
		queryFn: () => getFilteredSizes({ category, offer, subCategory, storeUrl }, take),
	});

	const sizes = data.sizes;
	return (
		<div className='pt-5 pb-4'>
			{/* Header */}
			<div
				className='relative cursor-pointer flex items-center justify-between select-none'
				onClick={() => setShow((prev) => !prev)}
			>
				<h3 className='text-sm font-bold overflow-ellipsis capitalize line-clamp-1 text-main-primary'>
					Size
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
						<div className='space-y-2'>
							{sizes.map((size) => (
								<SizeLink key={size.size} size={size.size} />
							))}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

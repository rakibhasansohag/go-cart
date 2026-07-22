'use client';
import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FiltersQueryType } from '@/lib/types';
import { getFilteredColors } from '@/queries/color';
import ColorCircle from './color';
import { useSuspenseQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

import { AnimatePresence, motion } from 'framer-motion';

export default function ColorFilter({
	queries,
	storeUrl,
}: {
	queries: FiltersQueryType;
	storeUrl?: string;
}) {
	const { category, subCategory, offer, search } = queries;
	const [show, setShow] = useState<boolean>(true);
	const take = 10;
	const { data } = useSuspenseQuery<{ colors: { name: string }[]; count: number }>({
		queryKey: queryKeys.colors.filtered({ category, offer, subCategory, storeUrl }),
		queryFn: () => getFilteredColors({ category, offer, subCategory, storeUrl }, take),
	});

	const colors = data.colors;
	return (
		<div className='pt-5 pb-4'>
			{/* Header */}
			<div
				className='relative cursor-pointer flex items-center justify-between select-none'
				onClick={() => setShow((prev) => !prev)}
			>
				<h3 className='text-sm font-bold overflow-ellipsis capitalize line-clamp-1 text-main-primary'>
					Color
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
						<div className='grid grid-cols-6 gap-4'>
							{colors.map((color) => (
								<ColorCircle key={color.name} color={color.name} />
							))}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

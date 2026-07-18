'use client';
import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FiltersQueryType } from '@/lib/types';
import { getFilteredColors } from '@/queries/color';
import ColorCircle from './color';
import { useSuspenseQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

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
			<div
				className={cn('mt-2.5 grid grid-cols-6 gap-4', {
					hidden: !show,
				})}
			>
				{colors.map((color) => (
					<ColorCircle key={color.name} color={color.name} />
				))}
			</div>
		</div>
	);
}

'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

const sortArray = [
	{
		name: 'Most Popular',
		query: 'most-popular',
	},
	{
		name: 'New Arrivals',
		query: 'new-arrivals',
	},
	{
		name: 'Top Rated',
		query: 'top-rated',
	},
	{
		name: 'Price low to high',
		query: 'price-low-to-high',
	},
	{
		name: 'Price High to low',
		query: 'price-high-to-low',
	},
];

export default function ProductSort() {
	const searchParams = useSearchParams();
	const pathname = usePathname();
	const { replace } = useRouter();

	const sortQuery = searchParams.get('sort') || 'most-popular';

	const handleSort = (newSort: string) => {
		const params = new URLSearchParams(searchParams.toString());
		if (newSort === 'most-popular') {
			params.delete('sort');
		} else {
			params.set('sort', newSort);
		}
		const queryString = params.toString();
		replace(queryString ? `${pathname}?${queryString}` : pathname);
	};

	return (
		<div className='flex items-center gap-2'>
			<Select value={sortQuery} onValueChange={handleSort}>
				<SelectTrigger
					className='w-[190px] sm:w-[220px] h-9 bg-background border-border text-xs font-semibold cursor-pointer shadow-none'
					aria-label='Sort products'
				>
					<div className='flex items-center gap-1.5 truncate'>
						<span className='text-muted-foreground font-normal text-xs'>Sort by:</span>
						<SelectValue placeholder='Most Popular' />
					</div>
				</SelectTrigger>
				<SelectContent
					align='end'
					sideOffset={6}
					className='z-[99999] min-w-[200px] bg-background dark:bg-slate-900 border border-border shadow-xl'
				>
					{sortArray.map((option) => (
						<SelectItem
							key={option.query}
							value={option.query}
							className='text-xs cursor-pointer'
						>
							{option.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

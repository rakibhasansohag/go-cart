import { cn } from '@/lib/utils';
import { MoveLeft, MoveRight } from 'lucide-react';
import { Dispatch, FC, SetStateAction } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
	page: number;
	totalPages: number;
	setPage: Dispatch<SetStateAction<number>>;
	pageSize?: number;
	setPageSize?: Dispatch<SetStateAction<number>>;
}

const Pagination: FC<Props> = ({ page, setPage, totalPages, pageSize, setPageSize }) => {
	const hasMultiplePages = !!(totalPages && totalPages > 1);
	const hasPageSizeSelector = !!(pageSize && setPageSize);
	const effectivePageSize = [5, 10, 20, 50].includes(pageSize ?? 10) ? pageSize ?? 10 : 10;
	const visiblePages: Array<number | 'ellipsis'> = totalPages <= 7
		? Array.from({ length: totalPages }, (_, index) => index + 1)
		: (() => {
			const pages: Array<number | 'ellipsis'> = [1];
			if (page > 3) pages.push('ellipsis');
			for (let value = Math.max(2, page - 1); value <= Math.min(totalPages - 1, page + 1); value += 1) pages.push(value);
			if (page < totalPages - 2) pages.push('ellipsis');
			pages.push(totalPages);
			return pages;
		})();

	if (!hasMultiplePages && !hasPageSizeSelector) return null;

	const handlePrevious = () => {
		if (page > 1) {
			setPage((prev) => prev - 1);
		}
	};

	const handleNext = () => {
		if (page < totalPages) {
			setPage((prev) => prev + 1);
		}
	};
	return (
		<div className='w-full lg:px-0 sm:px-6 px-4'>
			<div className='w-full flex min-h-11 items-center justify-end gap-x-3 border-t border-gray-200 py-1'>
				{hasPageSizeSelector && (
					<div className='flex items-center gap-x-2 text-xs text-gray-500 mr-auto'>
						<span>Items per page:</span>
						<Select value={String(effectivePageSize)} onValueChange={(value) => { setPageSize(Number(value)); setPage(1); }}>
							<SelectTrigger size='sm' className='w-16 bg-secondary text-xs'><SelectValue /></SelectTrigger>
							<SelectContent>
								{[5, 10, 20, 50].map((size) => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}
							</SelectContent>
						</Select>
					</div>
				)}

				{hasMultiplePages && (
					<>
						<div
							onClick={() => handlePrevious()}
							className='flex items-center text-gray-600 hover:text-orange-background cursor-pointer'
						>
							<MoveLeft className='w-3' />
							<p className='text-sm ml-3 font-medium leading-none'>Previous</p>
						</div>
						<div className='flex items-center gap-1' aria-label='Pagination'>
							{visiblePages.map((value, index) => value === 'ellipsis' ? (
								<span key={`ellipsis-${index}`} className='px-1 text-sm text-muted-foreground' aria-hidden='true'>…</span>
							) : (
								<button
									type='button'
									key={value}
									aria-label={`Go to page ${value}`}
									aria-current={value === page ? 'page' : undefined}
									onClick={() => setPage(value)}
									className={cn('min-w-8 rounded-md px-2 py-1 text-sm font-medium transition-colors cursor-pointer', value === page ? 'bg-orange-background text-white' : 'text-gray-600 hover:bg-secondary hover:text-orange-background')}
								>
									{value}
								</button>
							))}
						</div>
						<div
							onClick={() => handleNext()}
							className='flex items-center text-gray-600 hover:text-orange-background cursor-pointer'
						>
							<p className='text-sm font-medium leading-none mr-3'>Next</p>
							<MoveRight className='w-3' />
						</div>
					</>
				)}
			</div>
		</div>
	);
};

export default Pagination;

import { cn } from '@/lib/utils';
import { MoveLeft, MoveRight, ChevronDown } from 'lucide-react';
import { Dispatch, FC, SetStateAction } from 'react';

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
		<div className='w-full py-0 lg:px-0 sm:px-6 px-4'>
			<div className='w-full flex items-center justify-end gap-x-4 border-t border-gray-200'>
				{hasPageSizeSelector && (
					<div className='flex items-center gap-x-2 text-xs text-gray-500 mr-auto pt-3'>
						<span>Items per page:</span>
						<div className='relative w-16 h-7 flex items-center'>
							<select
								value={pageSize}
								onChange={(e) => {
									setPageSize(Number(e.target.value));
									setPage(1);
								}}
								className='h-7 pl-2 pr-6 appearance-none outline-none cursor-pointer border border-border rounded-md bg-secondary text-xs text-main-primary transition-all duration-200 hover:border-gray-400 focus:border-orange-background focus:ring-1 focus:ring-orange-background shadow-sm w-full'
							>
								<option value={5}>5</option>
								<option value={10}>10</option>
								<option value={20}>20</option>
								<option value={50}>50</option>
							</select>
							<span className='absolute inset-y-0 right-0 flex items-center pr-1.5 pointer-events-none text-main-secondary'>
								<ChevronDown className='w-3.5 h-3.5' />
							</span>
						</div>
					</div>
				)}

				{hasMultiplePages && (
					<>
						<div
							onClick={() => handlePrevious()}
							className='flex items-center pt-3 text-gray-600 hover:text-orange-background cursor-pointer'
						>
							<MoveLeft className='w-3' />
							<p className='text-sm ml-3 font-medium leading-none'>Previous</p>
						</div>
						<div className='flex flex-wrap'>
							{Array.from({ length: totalPages }).map((_, i) => (
								<span
									key={i}
									className={cn(
										'text-sm font-medium leading-none cursor-pointer text-gray-600  hover:text-orange-background  border-t border-transparent pt-3 mr-4 px-2',
										{
											'text-orange-background border-orange-background':
												i + 1 === page,
										},
									)}
									onClick={() => setPage(i + 1)}
								>
									{i + 1}
								</span>
							))}
						</div>
						<div
							onClick={() => handleNext()}
							className='flex items-center pt-3 text-gray-600 hover:text-orange-background cursor-pointer'
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

import { OrderTableDateFilter, OrderTableFilter } from '@/lib/types';
import { cn } from '@/lib/utils';

import { useRouter } from 'next/navigation';
import { Dispatch, FC, SetStateAction, useEffect, useState } from 'react';
import { DeleteIcon, SearchIcon } from '../../icons';

interface Props {
	filter: OrderTableFilter;
	setFilter: Dispatch<SetStateAction<OrderTableFilter>>;
	period: OrderTableDateFilter;
	setPeriod: Dispatch<SetStateAction<OrderTableDateFilter>>;
	search: string;
	setSearch: Dispatch<SetStateAction<string>>;
}

const OrderTableHeader: FC<Props> = ({
	filter,
	setFilter,
	search,
	setSearch,
	period,
	setPeriod,
}) => {
	const router = useRouter();

	// Handle debounced search input
	const [debouncedSearch, setDebouncedSearch] = useState<string>(search);

	// Update parent search state when the debounced search changes
	useEffect(() => {
		const handler = setTimeout(() => {
			if (debouncedSearch.length >= 3) {
				// Start searching after 3 characters
				setSearch(debouncedSearch);
			}
		}, 500); // Debounce time, adjust as needed
		return () => clearTimeout(handler);
	}, [debouncedSearch, setSearch]);

	return (
		<div className='pt-4 px-6 bg-background'>
			<div className='flex items-center justify-between'>
				<div className='-ml-3 text-main-primary text-sm'>
					<div className='relative overflow-x-hidden'>
						<div className='py-4 inline-flex items-center bg-background justify-center relative'>
							{filters.map((f, i) => (
								<div
									key={f.filter}
									className={cn(
										'relative px-4 text-main-primary whitespace-nowrap cursor-pointer leading-6',
										{
											'user-orders-table-tr font-bold': f.filter === filter,
										},
									)}
									onClick={() => {
										if (f.filter === '') {
											router.refresh();
											setFilter(f.filter);
										} else {
											setFilter(f.filter);
										}
									}}
								>
									{f.title}
								</div>
							))}
						</div>
					</div>
				</div>
				<div
					className='mt-0.5 text-xs cursor-pointer'
					onClick={() => {
						setFilter('');
						setDebouncedSearch('');
						setSearch('');
					}}
				>
					<span className='mx-1.5 inline-block translate-y-0.5'>
						<DeleteIcon />
					</span>
					Remove all filters
				</div>
			</div>
			{/* Search form - Date filter */}
			<div className='flex items-center justify-between mt-3'>
				<div className='w-[500px] text-main-primary text-sm leading-6 relative flex'>
					{/* Select */}
					<div className='relative mb-4 w-fit'>
						<select className='h-8 px-4 w-24 appearance-none outline-none cursor-pointer hover:border-[1px] hover:border-orange-background border rounded-l-md'>
							<option
								className='flex h-8 text-left text-sm overflow-hidden'
								value=''
							>
								Orders
							</option>
						</select>
						<span className='absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none'>
							<svg
								viewBox='0 0 1024 1024'
								width='1em'
								height='1em'
								fill='currentColor'
								aria-hidden='false'
								focusable='false'
							>
								<path d='M97.6 308.032a35.925333 35.925333 0 0 0-4.128 49.813333l1.408 1.632 355.232 371.914667a85.333333 85.333333 0 0 0 123.381333 0.032l355.626667-371.946667a35.936 35.936 0 0 0-2.730667-51.445333 37.674667 37.674667 0 0 0-50.944 1.130667l-1.504 1.546666L527.253333 674.986667a21.333333 21.333333 0 0 1-30.922666 0L150.058667 310.698667a37.653333 37.653333 0 0 0-52.448-2.666667z' />
							</svg>
						</span>
					</div>
					{/* Input */}
					<input
						type='text'
						placeholder='Order ID, product or store name'
						className='h-8 border text-sm relative inline-block w-full py-[3px] px-3 text-main-primary leading-6 bg-background  transition-all duration-75 placeholder:text-xs'
						value={debouncedSearch}
						onChange={(e) => setDebouncedSearch(e.target.value)}
					/>
					{/* Search icon */}
					<span className='-ml-[1px] rounded-r-md relative bg-background text-center'>
						<button className='rounded-r-md min-w-[52px] h-8 text-white bg-[linear-gradient(90deg,_#ff640e,_#ff3000)] grid place-items-center'>
							<span className='text-2xl inline-block '>
								<SearchIcon />
							</span>
						</button>
					</span>
				</div>
				{/* Filter by date */}
				<div className='flex items-center'>
					{/* Select */}
					<div className='relative mb-4 w-fit'>
						<select
							className='h-8 px-4 w-40 appearance-none outline-none cursor-pointer hover:border-[1px] hover:border-orange-background border rounded-md'
							value={period}
							onChange={(e) =>
								setPeriod(e.target.value as OrderTableDateFilter)
							}
						>
							{date_filters.map((filter) => (
								<option
									key={filter.value}
									value={filter.value}
									className='flex h-8 text-left text-sm overflow-hidden bg-background'
								>
									{filter.title}
								</option>
							))}
						</select>
						<span className='absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none'>
							<svg
								viewBox='0 0 1024 1024'
								width='1em'
								height='1em'
								fill='currentColor'
								aria-hidden='false'
								focusable='false'
							>
								<path d='M97.6 308.032a35.925333 35.925333 0 0 0-4.128 49.813333l1.408 1.632 355.232 371.914667a85.333333 85.333333 0 0 0 123.381333 0.032l355.626667-371.946667a35.936 35.936 0 0 0-2.730667-51.445333 37.674667 37.674667 0 0 0-50.944 1.130667l-1.504 1.546666L527.253333 674.986667a21.333333 21.333333 0 0 1-30.922666 0L150.058667 310.698667a37.653333 37.653333 0 0 0-52.448-2.666667z' />
							</svg>
						</span>
					</div>
				</div>
			</div>
		</div>
	);
};

export default OrderTableHeader;

const filters: { title: string; filter: OrderTableFilter }[] = [
	{
		title: 'View all',
		filter: '',
	},
	{
		title: 'To pay',
		filter: 'unpaid',
	},
	{
		title: 'To ship',
		filter: 'toShip',
	},
	{
		title: 'Shipped',
		filter: 'shipped',
	},
	{
		title: 'Delivered',
		filter: 'delivered',
	},
];

const date_filters: { title: string; value: OrderTableDateFilter }[] = [
	{
		title: 'All time',
		value: '',
	},
	{
		title: 'last 6 months',
		value: 'last-6-months',
	},
	{
		title: 'last 1 year',
		value: 'last-1-year',
	},
	{
		title: 'last 2 years',
		value: 'last-2-years',
	},
];

import SearchInput from '@/components/store/ui/search-input';
import SelectDropdown from '@/components/store/ui/select-dropdown';
import ClearFiltersButton from '@/components/store/ui/clear-filters-button';
import Tabs from '@/components/store/ui/tabs';
import { useRouter } from 'next/navigation';
import { Dispatch, FC, SetStateAction, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { getUserOrders } from '@/queries/profile';
import { OrderTableDateFilter, OrderTableFilter } from '@/lib/types';

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
	const queryClient = useQueryClient();

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

	const hasActiveFilters = filter !== '' || debouncedSearch !== '' || period !== '';

	return (
		<div className='pt-4 pb-3 px-6 bg-background'>
			<div className='flex items-center justify-between'>
				<div className='-ml-3 text-main-primary text-sm'>
					<div className='relative overflow-x-hidden'>
						<Tabs
							items={filters.map((f) => ({ title: f.title, value: f.filter }))}
							value={filter}
							onChange={(val) => {
								if (val === '') {
									router.refresh();
									setFilter(val);
								} else {
									setFilter(val);
								}
							}}
							onHover={(val) => {
								queryClient.prefetchQuery({
									queryKey: queryKeys.profile.orders({ filter: val, period, search, page: 1, pageSize: 10 }),
									queryFn: () => getUserOrders(val, period, search, 1, 10),
								});
							}}
							layoutId="order-tabs"
						/>
					</div>
				</div>
				{hasActiveFilters && (
					<ClearFiltersButton
						onClick={() => {
							setFilter('');
							setDebouncedSearch('');
							setSearch('');
							setPeriod('');
						}}
					/>
				)}
			</div>
			{/* Search form - Date filter */}
			<div className='flex items-center justify-between gap-4 mt-3'>
				<SearchInput
					placeholder='Order ID, product or store name'
					value={debouncedSearch}
					onChange={setDebouncedSearch}
					categoryLabel='Orders'
				/>
				<SelectDropdown
					options={date_filters}
					value={period}
					onChange={(val) => setPeriod(val as OrderTableDateFilter)}
				/>
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

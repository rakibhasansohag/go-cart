'use client';

import { PaymentTableDateFilter, PaymentTableFilter } from '@/lib/types';
import Tabs from '@/components/store/ui/tabs';
import { useRouter } from 'next/navigation';
import { Dispatch, FC, SetStateAction, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { getUserPayments } from '@/queries/profile';
import SearchInput from '@/components/store/ui/search-input';
import SelectDropdown from '@/components/store/ui/select-dropdown';
import ClearFiltersButton from '@/components/store/ui/clear-filters-button';

interface Props {
	filter: PaymentTableFilter;
	setFilter: Dispatch<SetStateAction<PaymentTableFilter>>;
	period: PaymentTableDateFilter;
	setPeriod: Dispatch<SetStateAction<PaymentTableDateFilter>>;
	search: string;
	setSearch: Dispatch<SetStateAction<string>>;
}

const PaymentTableHeader: FC<Props> = ({
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
		<div className='pt-4 pb-3 px-6 bg-background rounded-xl'>
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
									queryKey: queryKeys.profile.payments({ filter: val, period, search, page: 1, pageSize: 10 }),
									queryFn: () => getUserPayments(val, period, search, 1, 10),
								});
							}}
							layoutId="payment-tabs"
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
					placeholder='Search payment method...'
					value={debouncedSearch}
					onChange={setDebouncedSearch}
					onSubmit={() => setSearch(debouncedSearch)}
					categoryLabel='Payments'
				/>
				<SelectDropdown
					options={date_filters}
					value={period}
					onChange={(val) => setPeriod(val as PaymentTableDateFilter)}
				/>
			</div>
		</div>
	);
};

export default PaymentTableHeader;

const filters: { title: string; filter: PaymentTableFilter }[] = [
	{
		title: 'View all',
		filter: '',
	},
	{
		title: 'Paypal',
		filter: 'paypal',
	},
	{
		title: 'Credit card',
		filter: 'credit-card',
	},
];

const date_filters = [
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

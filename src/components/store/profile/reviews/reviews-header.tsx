'use client';

import { ReviewDateFilter, ReviewFilter } from '@/lib/types';
import Tabs from '@/components/store/ui/tabs';
import { useRouter } from 'next/navigation';
import { Dispatch, FC, SetStateAction, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { getUserReviews } from '@/queries/profile';
import SearchInput from '@/components/store/ui/search-input';
import SelectDropdown from '@/components/store/ui/select-dropdown';
import ClearFiltersButton from '@/components/store/ui/clear-filters-button';

interface Props {
	filter: ReviewFilter;
	setFilter: Dispatch<SetStateAction<ReviewFilter>>;
	period: ReviewDateFilter;
	setPeriod: Dispatch<SetStateAction<ReviewDateFilter>>;
	search: string;
	setSearch: Dispatch<SetStateAction<string>>;
}

const ReviewsHeader: FC<Props> = ({
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
		<div className='pt-1 bg-background'>
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
									queryKey: queryKeys.profile.reviews({ filter: val, period, search, page: 1, pageSize: 10 }),
									queryFn: () => getUserReviews(val, period, search, 1, 10),
								});
							}}
							layoutId="review-tabs"
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
					placeholder='Search reviews...'
					value={debouncedSearch}
					onChange={setDebouncedSearch}
					categoryLabel='Reviews'
				/>
				<SelectDropdown
					options={date_filters}
					value={period}
					onChange={(val) => setPeriod(val as ReviewDateFilter)}
				/>
			</div>
		</div>
	);
};

export default ReviewsHeader;

const filters: { title: string; filter: ReviewFilter }[] = [
	{
		title: 'View all',
		filter: '',
	},
	{
		title: '5 stars',
		filter: '5',
	},
	{
		title: '4 stars',
		filter: '4',
	},
	{
		title: '3 stars',
		filter: '3',
	},
	{
		title: '2 stars',
		filter: '2',
	},
	{
		title: '1 stars',
		filter: '1',
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

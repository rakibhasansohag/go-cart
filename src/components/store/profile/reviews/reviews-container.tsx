'use client';

import {
	ReviewDateFilter,
	ReviewFilter,
	ReviewWithImageType,
} from '@/lib/types';
import { useEffect, useState, Suspense } from 'react';
import Pagination from '../../shared/pagination';
import { getUserReviews } from '@/queries/profile';
import ReviewCard from '../../cards/review';
import ReviewsHeader from './reviews-header';

import { useSuspenseQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

export default function ReviewsContainer() {
	// Pagination
	const [page, setPage] = useState<number>(1);

	// Filter
	const [filter, setFilter] = useState<ReviewFilter>('');

	// Date period filter
	const [period, setPeriod] = useState<ReviewDateFilter>('');

	// Search filter
	const [search, setSearch] = useState<string>('');

	useEffect(() => {
		// Reset to page 1 when filters or search changes
		setPage(1);
	}, [filter, period, search]);

	return (
		<div>
			<div className=''>
				{/* Header */}
				<ReviewsHeader
					filter={filter}
					setFilter={setFilter}
					period={period}
					setPeriod={setPeriod}
					search={search}
					setSearch={setSearch}
				/>
				{/* Table wrapped in Suspense */}
				<Suspense fallback={<div className="flex items-center justify-center p-8 text-sm text-gray-500">Loading reviews...</div>}>
					<ReviewsContainerContent
						filter={filter}
						period={period}
						search={search}
						page={page}
						setPage={setPage}
					/>
				</Suspense>
			</div>
		</div>
	);
}

function ReviewsContainerContent({
	filter,
	period,
	search,
	page,
	setPage,
}: {
	filter: ReviewFilter;
	period: ReviewDateFilter;
	search: string;
	page: number;
	setPage: React.Dispatch<React.SetStateAction<number>>;
}) {
	const { data: res } = useSuspenseQuery({
		queryKey: queryKeys.profile.reviews({ filter, period, search, page }),
		queryFn: () => getUserReviews(filter, period, search, page),
	});

	const data = res.reviews;
	const totalDataPages = res.totalPages;

	return (
		<>
			{/* Table */}
			<div className='space-y-2'>
				{data.map((review) => (
					<ReviewCard key={review.id} review={review} />
				))}
			</div>
			<div className='mt-2'>
				<Pagination page={page} setPage={setPage} totalPages={totalDataPages} />
			</div>
		</>
	);
}

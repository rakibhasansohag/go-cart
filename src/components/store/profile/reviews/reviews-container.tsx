'use client';
import {
	ReviewDateFilter,
	ReviewFilter,
	ReviewWithImageType,
} from '@/lib/types';
import { useEffect, useState } from 'react';
import Pagination from '../../shared/pagination';
import { getUserReviews } from '@/queries/profile';
import ReviewCard from '../../cards/review';
import ReviewsHeader from './reviews-header';

import { useSuspenseQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

export default function ReviewsContainer({
	reviews,
	totalPages,
}: {
	reviews?: ReviewWithImageType[];
	totalPages?: number;
}) {
	// Pagination
	const [page, setPage] = useState<number>(1);

	// Filter
	const [filter, setFilter] = useState<ReviewFilter>('');

	// Date period filter
	const [period, setPeriod] = useState<ReviewDateFilter>('');

	// Search filter
	const [search, setSearch] = useState<string>('');

	const { data: res } = useSuspenseQuery({
		queryKey: queryKeys.profile.reviews({ filter, period, search, page }),
		queryFn: () => getUserReviews(filter, period, search, page),
	});

	const data = res.reviews;
	const totalDataPages = res.totalPages;

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
				{/* Table */}
				<div className='space-y-2'>
					{data.map((review) => (
						<ReviewCard key={review.id} review={review} />
					))}
				</div>
			</div>
			<div className='mt-2'>
				<Pagination page={page} setPage={setPage} totalPages={totalDataPages} />
			</div>
		</div>
	);
}

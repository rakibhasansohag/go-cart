'use client';

import {
	ReviewDateFilter,
	ReviewFilter,
	ReviewWithImageType,
} from '@/lib/types';
import { useEffect, useState, Suspense } from 'react';
import Pagination from '../../shared/pagination';
import ReviewCard from '../../cards/review';
import ReviewsHeader from './reviews-header';

import { useSuspenseQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

export default function ReviewsContainer() {
	// Pagination
	const [page, setPage] = useState<number>(1);
	const [pageSize, setPageSize] = useState<number>(10);

	// Filter
	const [filter, setFilter] = useState<ReviewFilter>('');

	// Date period filter
	const [period, setPeriod] = useState<ReviewDateFilter>('');

	// Search filter
	const [search, setSearch] = useState<string>('');

	useEffect(() => {
		// Reset to page 1 when filters, search or page size changes
		setPage(1);
	}, [filter, period, search, pageSize]);

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
						pageSize={pageSize}
						setPageSize={setPageSize}
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
	pageSize,
	setPageSize,
}: {
	filter: ReviewFilter;
	period: ReviewDateFilter;
	search: string;
	page: number;
	setPage: React.Dispatch<React.SetStateAction<number>>;
	pageSize: number;
	setPageSize: React.Dispatch<React.SetStateAction<number>>;
}) {
	const { data: res } = useSuspenseQuery({
		queryKey: queryKeys.profile.reviews({ filter, period, search, page, pageSize }),
		queryFn: async () => {
			const res = await fetch(`/api/profile/reviews?filter=${filter}&period=${period}&search=${search}&page=${page}&pageSize=${pageSize}`);
			if (!res.ok) throw new Error('Failed to fetch reviews');
			return res.json() as Promise<{
				reviews: ReviewWithImageType[];
				totalPages: number;
				currentPage: number;
				pageSize: number;
				totalCount: number;
			}>;
		},
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
				<Pagination
					page={page}
					setPage={setPage}
					totalPages={totalDataPages}
					pageSize={pageSize}
					setPageSize={setPageSize}
				/>
			</div>
		</>
	);
}

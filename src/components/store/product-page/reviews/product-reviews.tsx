'use client';
import {
	ProductVariantDataType,
	RatingStatisticsType,
	ReviewsFiltersType,
	ReviewsOrderType,
	ReviewWithImageType,
} from '@/lib/types';
import { FC, useEffect, useRef, useState } from 'react';
import RatingCard from '../../cards/product-rating';
import RatingStatisticsCard from '../../cards/rating-statistics';
import ReviewCard from '../../cards/review';
import ReviewsFilters from './filters';
import ReviewsSort from './sort';
import Pagination from '../../shared/pagination';
import ReviewDetails from '../../forms/review-details';
import { getProductFilteredReviews } from '@/queries/product-optimized';
import ProductPageReviewsSkeletonLoader from '../../skeletons/product-page/reviews';
import { DotLoader } from 'react-spinners';

interface Props {
	productId: string;
	rating: number;
	variantsInfo: ProductVariantDataType[];
	numReviews: number;
}

const defaultData = {
	ratingStatistics: [
		{ rating: 1, numReviews: 0, percentage: 0 },
		{ rating: 2, numReviews: 0, percentage: 0 },
		{ rating: 3, numReviews: 0, percentage: 0 },
		{ rating: 4, numReviews: 0, percentage: 0 },
		{ rating: 5, numReviews: 0, percentage: 0 },
	],
	reviewsWithImagesCount: 0,
	totalReviews: 0,
};

const ProductReviews: FC<Props> = ({
	productId,
	rating,
	variantsInfo,
	numReviews,
}) => {
	const [loading, setLoading] = useState<boolean>(true);
	const [filterLoading, setFilterLoading] = useState<boolean>(true);
	const [data, setData] = useState<ReviewWithImageType[]>([]);
	const [statistics, setStatistics] =
		useState<RatingStatisticsType>(defaultData);
	const [averageRating, setAverageRating] = useState<number>(rating);

	const half = Math.ceil(data.length / 2);

	// Filtering
	const filtered_data = {
		rating: undefined,
		hasImages: undefined,
	};
	const [filters, setFilters] = useState<ReviewsFiltersType>(filtered_data);

	// Sorting
	const [sort, setSort] = useState<ReviewsOrderType>();

	// Pagination
	const [page, setPage] = useState<number>(1);
	const [pageSize, setPageSize] = useState<number>(4);

	// Guard to avoid double-fetch on initial mount
	const isFirstLoad = useRef<boolean>(true);

	// main fetch function
	const fetchReviews = async (pageToFetch = 1) => {
		try {
			setFilterLoading(true);

			const res = await getProductFilteredReviews(
				productId,
				filters,
				sort,
				pageToFetch,
				pageSize,
			);

			// Expecting res = { reviews: ReviewWithImageType[], statistics: { totalReviews, ratingStatistics... } }
			setData(res.reviews ?? []);
			setStatistics(res.statistics ?? defaultData);
			setLoading(false);
			setFilterLoading(false);
		} catch (error) {
			console.error('fetchReviews error:', error);
			setLoading(false);
			setFilterLoading(false);
		}
	};

	// When filters or sort change: reset to page 1 and fetch page 1
	useEffect(() => {
		setPage(1);
		(async () => {
			await fetchReviews(1);
			// ensure next page-change triggers fetch
			isFirstLoad.current = false;
		})();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filters, sort, pageSize, productId]);

	// When page changes (user clicked), fetch that page
	useEffect(() => {
		// Skip the initial page effect if we already fetched via the filters effect on mount
		if (isFirstLoad.current) {
			// initial page fetch already handled by the filters effect on mount
			isFirstLoad.current = false;
			return;
		}
		fetchReviews(page);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [page, pageSize]);

	// total pages calculation (prefer server-provided totalReviews)
	const totalItems =
		typeof statistics?.totalReviews === 'number'
			? statistics.totalReviews
			: data.length;

	const totalPages = totalItems > 0 ? Math.ceil(totalItems / pageSize) : 0;

	return (
		<div className='pt-6' id='reviews'>
			{loading ? (
				<ProductPageReviewsSkeletonLoader numReviews={numReviews} />
			) : (
				<div>
					{/* Title */}
					<div className='h-12'>
						<h2 className='text-main-primary text-2xl font-bold'>
							Custom Reviews ({statistics.totalReviews ?? data.length})
						</h2>
					</div>

					{/* Statistics */}
					<div className='w-full'>
						<div className='flex flex-col md:flex-row items-center gap-4'>
							<RatingCard rating={averageRating} />
							<RatingStatisticsCard statistics={statistics.ratingStatistics} />
						</div>
					</div>

					<>
						<div className='space-y-6'>
							<ReviewsFilters
								filters={filters}
								setFilters={setFilters}
								setSort={setSort}
								stats={statistics}
							/>
							<ReviewsSort sort={sort} setSort={setSort} />
						</div>

						{/* Reviews */}
						{!filterLoading ? (
							<div className='mt-6  grid md:grid-cols-2 gap-4'>
								{data.length > 0 ? (
									<>
										<div className='flex flex-col gap-3'>
											{data.slice(0, half).map((review) => (
												<ReviewCard key={review.id} review={review} />
											))}
										</div>
										<div className='flex flex-col gap-3'>
											{data.slice(half).map((review) => (
												<ReviewCard key={review.id} review={review} />
											))}
										</div>
									</>
								) : (
									<>No Reviews yet.</>
								)}
							</div>
						) : (
							<div className='h-24 w-full flex items-center justify-center'>
								<DotLoader color='#f5f5f5' />
							</div>
						)}

						{/* Pagination */}
						{!filterLoading && totalPages > 1 && (
							<Pagination
								page={page}
								totalPages={totalPages}
								setPage={setPage}
							/>
						)}
					</>
				</div>
			)}

			<div className='mt-10'>
				<ReviewDetails
					productId={productId}
					variantsInfo={variantsInfo}
					setReviews={setData}
					reviews={data}
					setStatistics={setStatistics}
					setAverageRating={setAverageRating}
				/>
			</div>
		</div>
	);
};

export default ProductReviews;

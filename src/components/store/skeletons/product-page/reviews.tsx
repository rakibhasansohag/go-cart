'use client';
import ForkedContentLoader from '../../cards/skeleton';
import ReviewsSort from '../../product-page/reviews/sort';
export default function ProductPageReviewsSkeletonLoader({
	numReviews,
}: {
	numReviews: number;
}) {
	const ratingStatistics = [
		{ index: 0, width: 43 },
		{ index: 1, width: 150 },
		{ index: 2, width: 70 },
		{ index: 3, width: 75 },
		{ index: 4, width: 75 },
		{ index: 5, width: 75 },
		{ index: 6, width: 75 },
	];
	const arrayLength = numReviews > 4 ? 4 : numReviews;
	const reviews = Array.from({ length: arrayLength }, (_, index) => index + 1);

	return (
		<div>
			{/* Title */}
			<div className='h-12'>
				<h2 className='text-main-primary text-2xl font-bold'>
					Custom Reviews ({numReviews})
				</h2>
			</div>
			{/* Statistics */}
			<div className='w-full'>
				<div className='w-full grid md:grid-cols-2 items-center gap-4'>
					<ForkedContentLoader
						height={176}
						width='100%'
						backgroundColor='#f5f5f5'
						className='rounded-md'
					>
						<rect x='0' y='0' width='100%' height='176' />
					</ForkedContentLoader>
					<ForkedContentLoader
						height={176}
						width='100%'
						backgroundColor='#f5f5f5'
						className='rounded-md'
					>
						<rect x='0' y='0' width='100%' height='176' />
					</ForkedContentLoader>
				</div>
			</div>
			<div className='space-y-6'>
				<div className='mt-8 relative'>
					<div className='flex flex-wrap gap-4'>
						{ratingStatistics.map((r) => (
							<div
								key={r.index}
								className='bg-f5 text-main-primary border border-transparent rounded-full cursor-pointer py-1.5 px-4'
							>
								<ForkedContentLoader
									height={25}
									width={r.width}
									backgroundColor='#f5f5f5'
									className='rounded-md'
								>
									<rect x='0' y='0' />
								</ForkedContentLoader>
							</div>
						))}
					</div>
				</div>
				<ReviewsSort setSort={() => {}} />
			</div>
			<div className='w-full mt-6 grid md:grid-cols-2 gap-4'>
				{reviews.length > 0 ? (
					reviews.map((review) => (
						<ForkedContentLoader
							key={review}
							height='100%'
							width='100%'
							backgroundColor='#f5f5f5'
							className='rounded-md'
						>
							<rect x='0' y='0' height={176} width='100%' />
						</ForkedContentLoader>
					))
				) : (
					<>No Reviews.</>
				)}
			</div>
		</div>
	);
}

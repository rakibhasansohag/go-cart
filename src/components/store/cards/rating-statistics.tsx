'use client';
import { StatisticsCardType } from '@/lib/types';
import StarRating from '@/components/StarRating';

export default function RatingStatisticsCard({
	statistics,
}: {
	statistics: StatisticsCardType;
}) {
	return (
		<div className='w-full h-44 flex-1'>
			<div className='py-5 px-7 bg-f5 border border-border/40 flex flex-col gap-y-2 h-full justify-center overflow-hidden rounded-lg transition-colors'>
				{statistics
					.slice()
					.reverse()
					.map((rating) => (
						<div key={rating.rating} className='flex items-center h-4'>
							<StarRating
								count={5}
								value={rating.rating}
								size={15}
								color='#e2dfdf'
								activeColor='#FFD804'
								isHalf
								edit={false}
							/>
							<div className='relative w-full flex-1 h-1.5 mx-2.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden'>
								<div
									className='absolute left-0 h-full rounded-full bg-amber-400 dark:bg-amber-400 shadow-xs'
									style={{ width: `${rating.percentage}%` }}
								/>
							</div>
							<div className='text-xs w-12 leading-4 text-muted-foreground font-mono'>{rating.numReviews}</div>
						</div>
					))}
			</div>
		</div>
	);
}

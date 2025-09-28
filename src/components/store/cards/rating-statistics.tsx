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
			<div className='py-5 px-7 bg-f5 flex flex-col gap-y-2 h-full justify-center overflow-hidden rounded-lg'>
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
							<div className='relative w-full flex-1 h-1.5 mx-2.5 bg-[#e2dfdf] rounded-full'>
								<div
									className='absolute left-0 h-full rounded-full bg-[#ffc50A]'
									style={{ width: `${rating.percentage}%` }}
								/>
							</div>
							<div className='text-xs w-12 leading-4'>{rating.numReviews}</div>
						</div>
					))}
			</div>
		</div>
	);
}

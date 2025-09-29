'use client';
import StarRating from '@/components/StarRating';

export default function RatingCard({ rating }: { rating: number }) {
	const fixed_rating = Number(rating.toFixed(2));
	return (
		<div className='w-full h-44 flex-1'>
			<div className='p-6 bg-f5 flex flex-col h-full justify-center overflow-hidden rounded-lg'>
				<div className='text-6xl font-bold'>{fixed_rating}</div>
				<div className='py-1.5'>
					<StarRating
						count={5}
						value={fixed_rating}
						size={24}
						color='#e2dfdf'
						activeColor='#FFD804'
						isHalf
						edit={false}
					/>
				</div>
				<div className='text-[#03c97a] leading-5 mt-2'>
					All from verified purchases
				</div>
			</div>
		</div>
	);
}

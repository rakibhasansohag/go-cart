'use client';
import { StoreDetailsType } from '@/lib/types';
import { CircleCheckBig } from 'lucide-react';
import Image from 'next/image';
import FollowStore from '../cards/follow-store';
import { useState } from 'react';

export default function StoreDetails({
	details,
}: {
	details: StoreDetailsType;
}) {
	const { averageRating, cover, description, logo, name, numReviews } = details;
	const numOfReviews = new Intl.NumberFormat().format(numReviews);
	const [followersCount, setFollowersCount] = useState<number>(
		details._count.followers,
	);

	console.log({
		averageRating,
		description,
		numOfReviews,
	});

	return (
		<div className='relative w-full pb-4 md:pb-44'>
			<div className='relative flex flex-col'>
				<Image
					src={cover}
					alt={name}
					width={2000}
					height={500}
					className='w-full h-44 md:h-96 object-cover object-top rounded-b-2xl'
				/>
				<div className='relative -mt-14 md:mt-0 md:absolute md:-bottom-[140px] left-0 md:left-2 flex flex-col md:flex-row w-full md:w-[calc(100%-1rem)] justify-between items-center px-4 md:px-0 md:gap-y-0 text-center md:text-left'>
					<div className='flex flex-col md:flex-row items-center gap-y-3 md:gap-y-0'>
						<Image
							src={logo}
							alt={name}
							width={200}
							height={200}
							className='w-28 h-28 md:h-44 md:w-44 object-cover rounded-full shadow-2xl border-4 border-background bg-background shrink-0'
						/>
						<div className='mb-2 md:mb-0 md:mt-14 ml-0 md:ml-6 flex flex-col items-center md:items-start'>
							<div className='flex items-center gap-x-1 justify-center md:justify-start'>
								<h1 className='font-bold text-lg md:text-xl capitalize leading-5 line-clamp-1 text-main-primary'>
									{name.toLowerCase()}
								</h1>
								<CircleCheckBig className='stroke-green-400 w-5 h-5 shrink-0' />
							</div>
							<div className='flex items-center gap-x-1 mt-1 justify-center md:justify-start'>
								<div className='text-xs md:text-sm leading-5 text-main-secondary'>
									<strong>100%</strong>
									<span> Positive Feedback</span> <br />
									<strong>{followersCount}</strong>
									<span>
										{followersCount > 1 ? ' Followers' : ' Follower'}
									</span>
								</div>
							</div>
						</div>
					</div>
					<div className='w-full md:w-fit flex justify-center md:justify-end mt-2 md:mt-0'>
						<FollowStore
							id={details.id}
							isUserFollowingStore={details.isUserFollowingStore}
							setFollowersCount={setFollowersCount}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}

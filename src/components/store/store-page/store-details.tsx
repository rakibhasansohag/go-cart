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
		<div className='relative w-full pb-28'>
			<div className='relative'>
				<Image
					src={cover}
					alt={name}
					width={2000}
					height={500}
					className='w-full h-44 md:h-96 object-cover rounded-b-2xl'
				/>
				<div className='absolute -bottom-[140px] left-2 flex flex-col md:flex-row md:w-[calc(100%-1rem)] md:justify-between md:items-center '>
					<div className='flex'>
						<Image
							src={logo}
							alt={name}
							width={200}
							height={200}
							className='w-28 h-28 md:h-44 md:w-44 object-cover rounded-full shadow-2xl'
						/>
						<div className='mt-9 md:mt-14 ml-1'>
							<div className='flex items-center gap-x-1'>
								<h1 className='font-bold text-md capitalize leading-5 line-clamp-1'>
									{name.toLowerCase()}
								</h1>
								<CircleCheckBig className='stroke-green-400 mt-0.5' />
							</div>
							<div className='flex items-center gap-x-1'>
								<div className='text-sm leading-5'>
									<strong>100%</strong>
									<span> Positive Feedback</span> <br />
									<strong>{followersCount}</strong>
									<strong>
										{followersCount > 1 ? ' Followers' : ' Follower'}
									</strong>
								</div>
							</div>
							{/* <div className='text-sm leading-5 md:max-w-6/12'>
								<strong>{description}</strong>
							</div> */}
						</div>
					</div>
					<div className='w-full md:w-fit flex justify-end ml-5 md:ml-0'>
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

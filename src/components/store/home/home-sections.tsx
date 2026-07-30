'use client';

import React from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { SimpleProduct } from '@/lib/types';
import { getHomeDataDynamic } from '@/queries/home';
import { queryKeys } from '@/lib/query-keys';
import HomeMainSwiper from './main/home-swiper';
import Featured from './main/featured';
import HomeUserCard from './main/user/user';
import AnimatedDeals from './animated-deals';
import MainSwiper from '../shared/swiper';

export function HomeMainAndDeals({
	user,
}: {
	user: {
		imageUrl: string;
		fullName: string | null;
		role?: string;
	} | null;
}) {
	const { data } = useSuspenseQuery({
		queryKey: queryKeys.home.dynamic(['best-deals', 'super-deals', 'user-card', 'featured']),
		queryFn: () =>
			getHomeDataDynamic([
				{ property: 'offer', value: 'best-deals', type: 'simple' },
				{ property: 'offer', value: 'super-deals', type: 'full' },
				{ property: 'offer', value: 'user-card', type: 'simple' },
				{ property: 'offer', value: 'featured', type: 'simple' },
			]),
	});

	const products_featured = (data.products_featured || []) as SimpleProduct[];
	const products_user_card = (data.products_user_card || []) as SimpleProduct[];
	const products_best_deals = (data.products_best_deals || []) as SimpleProduct[];
	const products_super_deals = data.products_super_deals || [];

	return (
		<>
			{/* Main Grid */}
			<section aria-label='Featured hero products and promotions' className='w-full grid gap-2 min-[1170px]:grid-cols-[1fr_350px] min-[1465px]:grid-cols-[200px_1fr_350px]'>
				{/* Left Ad */}
				<div
					className='cursor-pointer hidden min-[1465px]:block bg-cover bg-no-repeat rounded-md'
					style={{
						backgroundImage: 'url(/assets/images/ads/winter-sports-clothing.webp)',
					}}
				/>
				{/* Middle Swiper & Featured */}
				<div className='space-y-2 h-fit'>
					<HomeMainSwiper />
					<Featured
						products={products_featured.filter(
							(product): product is SimpleProduct => 'variantSlug' in product,
						)}
					/>
				</div>
				{/* Right User Card */}
				<div className='h-full'>
					<HomeUserCard
						products={products_user_card.filter(
							(product): product is SimpleProduct => 'variantSlug' in product,
						)}
						user={user}
					/>
				</div>
			</section>

			{/* Animated deals */}
			<section aria-label='Live flash deals' className='mt-2 hidden min-[915px]:block'>
				<AnimatedDeals
					products={products_best_deals.filter(
						(product): product is SimpleProduct => 'variantSlug' in product,
					)}
				/>
			</section>

			{/* Super Deals Swiper */}
			<section aria-label='Super deals carousel' className='mt-10 bg-background rounded-md'>
				<MainSwiper products={products_super_deals} type='curved'>
					<div className='mb-4 pl-4 flex items-center justify-between'>
						<Image src='/assets/images/ads/super-deals.avif' alt='Super deals' width={200} height={50} style={{ width: 200, height: 50 }} />
					</div>
				</MainSwiper>
			</section>
		</>
	);
}

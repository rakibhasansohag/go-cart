'use client';

import React from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { SimpleProduct } from '@/lib/types';
import { getHomeDataDynamic } from '@/queries/home';
import { queryKeys } from '@/lib/query-keys';
import { HomepageSectionConfig } from '@/lib/homepage-types';
import HomeMainSwiper from './main/home-swiper';
import Featured from './main/featured';
import HomeUserCard from './main/user/user';
import AnimatedDeals from './animated-deals';

export interface UserMetadataType {
	imageUrl: string;
	fullName: string | null;
	role?: string;
}

export function HeroGridSection({
	user,
	title,
	subtitle,
	config,
}: {
	user: UserMetadataType | null;
	title?: string | null;
	subtitle?: string | null;
	config?: HomepageSectionConfig | null;
}) {
	const { data } = useSuspenseQuery({
		queryKey: queryKeys.home.dynamic(['best-deals', 'super-deals', 'user-card', 'featured']),
		queryFn: () =>
			getHomeDataDynamic([
				{ property: 'offer', value: 'best-deals', type: 'simple' },
				{ property: 'offer', value: 'super-deals', type: 'simple' },
				{ property: 'offer', value: 'user-card', type: 'simple' },
				{ property: 'offer', value: 'featured', type: 'simple' },
			]),
	});

	const products_featured = (data.products_featured || []) as SimpleProduct[];
	const products_user_card = (data.products_user_card || []) as SimpleProduct[];

	const showSideAd = config?.showSideAd !== false;
	const showUserCard = config?.showUserCard !== false;

	return (
		<section
			aria-label={title || 'Featured hero products and promotions'}
			className='w-full grid gap-2 min-[1170px]:grid-cols-[1fr_350px] min-[1465px]:grid-cols-[200px_1fr_350px]'
		>
			{/* Left Ad */}
			{showSideAd && (
				<div
					className='cursor-pointer hidden min-[1465px]:block bg-cover bg-no-repeat rounded-md'
					style={{
						backgroundImage: 'url(/assets/images/ads/winter-sports-clothing.webp)',
					}}
				/>
			)}
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
			{showUserCard && (
				<div className='h-full'>
					<HomeUserCard
						products={products_user_card.filter(
							(product): product is SimpleProduct => 'variantSlug' in product,
						)}
						user={user}
					/>
				</div>
			)}
		</section>
	);
}

export function SuperDealsSection({
	title,
	subtitle,
	config,
}: {
	title?: string | null;
	subtitle?: string | null;
	config?: HomepageSectionConfig | null;
}) {
	const { data } = useSuspenseQuery({
		queryKey: queryKeys.home.dynamic(['best-deals', 'super-deals', 'user-card', 'featured']),
		queryFn: () =>
			getHomeDataDynamic([
				{ property: 'offer', value: 'best-deals', type: 'simple' },
				{ property: 'offer', value: 'super-deals', type: 'simple' },
				{ property: 'offer', value: 'user-card', type: 'simple' },
				{ property: 'offer', value: 'featured', type: 'simple' },
			]),
	});

	const products_best_deals = (data.products_best_deals || []) as SimpleProduct[];
	const products_super_deals = (data.products_super_deals || []) as SimpleProduct[];
	const combined = [...products_best_deals, ...products_super_deals];
	const uniqueDeals = Array.from(
		new Map(combined.map((p) => [p.slug || p.variantSlug, p])).values()
	);

	const maxItems = typeof config?.itemsLimit === 'number' ? config.itemsLimit : 10;
	const countdownEnd = typeof config?.countdownEnd === 'string' ? config.countdownEnd : undefined;
	const badgeText = typeof config?.badge === 'string' ? config.badge : undefined;

	return (
		<AnimatedDeals
			products={uniqueDeals.slice(0, maxItems).filter(
				(product): product is SimpleProduct => 'variantSlug' in product,
			)}
			title={title}
			subtitle={subtitle}
			targetDate={countdownEnd}
			badgeText={badgeText}
		/>
	);
}

// Backward-compatible compound export
export function HomeMainAndDeals({
	user,
}: {
	user: UserMetadataType | null;
}) {
	return (
		<>
			<HeroGridSection user={user} />
			<div className='mt-6'>
				<SuperDealsSection />
			</div>
		</>
	);
}

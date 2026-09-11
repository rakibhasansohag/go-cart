import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import { currentUser } from '@clerk/nextjs/server';
import { queryKeys } from '@/lib/query-keys';
import { getProducts } from '@/queries/product';
import { getHomeDataDynamic, getHomeFeaturedCategories } from '@/queries/home';
import { getHomepageLayout } from '@/queries/homepage-config';
import Header from '@/components/store/layout/header/header';
import CategoriesHeader from '@/components/store/layout/categories-header/categories-header';
import Sideline from '@/components/store/home/sideline/sideline';
import Footer from '@/components/store/layout/footer/footer';

import { HeroGridSection, SuperDealsSection } from '@/components/store/home/home-sections';
import FeaturedCategories from '@/components/store/home/featured-categories';
import MoreToLoveSection from '@/components/store/home/more-to-love';

import {
	HomeMainSkeleton,
	SuperDealsSkeleton,
	FeaturedCategoriesSkeleton,
	ProductsGridSkeleton,
} from '@/components/store/skeletons/home-skeletons';

export default async function HomePage() {
	const queryClient = getQueryClient();
	const user = await currentUser();

	const userMetadata = user
		? {
				imageUrl: user.imageUrl,
				fullName: user.fullName,
				role: user.privateMetadata?.role as string | undefined,
		  }
		: null;

	// Initiate parallel non-blocking prefetching on the server
	const prefetchPromises = [
		queryClient.prefetchQuery({
			queryKey: queryKeys.home.layout(),
			queryFn: getHomepageLayout,
		}),
		queryClient.prefetchQuery({
			queryKey: queryKeys.products.list({ sort: 'most-popular' }, 'most-popular', null),
			queryFn: () => getProducts({}, 'most-popular', null, 12),
		}),
		queryClient.prefetchQuery({
			queryKey: queryKeys.home.featuredCategories(),
			queryFn: getHomeFeaturedCategories,
		}),
		queryClient.prefetchQuery({
			queryKey: queryKeys.home.dynamic(['best-deals', 'super-deals', 'user-card', 'featured']),
			queryFn: () =>
				getHomeDataDynamic([
					{ property: 'offer', value: 'best-deals', type: 'simple' },
					{ property: 'offer', value: 'super-deals', type: 'simple' },
					{ property: 'offer', value: 'user-card', type: 'simple' },
					{ property: 'offer', value: 'featured', type: 'simple' },
				]),
		}),
	];

	// Non-blocking parallel execution
	await Promise.allSettled(prefetchPromises);
	const layoutSections = await getHomepageLayout();

	return (
		<>
			<Header />
			<CategoriesHeader />
			<div className='relative w-full'>
				<Sideline />
				<main id='main-content' className='relative w-[calc(100%-40px)] h-full bg-secondary'>
					<h1 className='sr-only'>
						GoCart - Discover Exclusive Deals, Top Categories & Trending Products
					</h1>
					<div className='max-w-[1600px] mx-auto min-h-screen p-4 space-y-10'>
						<HydrationBoundary state={dehydrate(queryClient)}>
							{layoutSections.map((section) => {
								if (!section.isActive) return null;

								if (section.sectionKey === 'HERO_GRID') {
									return (
										<Suspense key={section.id} fallback={<HomeMainSkeleton />}>
											<HeroGridSection
												user={userMetadata}
												title={section.title}
												subtitle={section.subtitle}
												config={section.config}
											/>
										</Suspense>
									);
								}

								if (section.sectionKey === 'SUPER_DEALS') {
									return (
										<Suspense key={section.id} fallback={<SuperDealsSkeleton />}>
											<SuperDealsSection
												title={section.title}
												subtitle={section.subtitle}
												config={section.config}
											/>
										</Suspense>
									);
								}

								if (section.sectionKey === 'FEATURED_CATEGORIES') {
									return (
										<Suspense key={section.id} fallback={<FeaturedCategoriesSkeleton />}>
											<FeaturedCategories title={section.title} />
										</Suspense>
									);
								}

								if (section.sectionKey === 'MORE_TO_LOVE') {
									return (
										<Suspense key={section.id} fallback={<ProductsGridSkeleton />}>
											<MoreToLoveSection
												title={section.title}
												itemsLimit={
													typeof section.config?.itemsLimit === 'number'
														? section.config.itemsLimit
														: 12
												}
											/>
										</Suspense>
									);
								}

								return null;
							})}
						</HydrationBoundary>
					</div>
				</main>
			</div>
			<Footer />
		</>
	);
}

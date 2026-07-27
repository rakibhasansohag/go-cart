import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import { currentUser } from '@clerk/nextjs/server';
import { queryKeys } from '@/lib/query-keys';
import { getProducts } from '@/queries/product';
import { getHomeDataDynamic, getHomeFeaturedCategories } from '@/queries/home';
import Header from '@/components/store/layout/header/header';
import CategoriesHeader from '@/components/store/layout/categories-header/categories-header';
import Sideline from '@/components/store/home/sideline/sideline';
import Footer from '@/components/store/layout/footer/footer';

import { HomeMainAndDeals } from '@/components/store/home/home-sections';
import FeaturedCategories from '@/components/store/home/featured-categories';
import MoreToLoveSection from '@/components/store/home/more-to-love';

import {
	HomeMainSkeleton,
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

	// Initiate parallel non-blocking prefetching on the server so sections can stream independently via React Suspense
	const prefetchPromises = [
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
					{ property: 'offer', value: 'super-deals', type: 'full' },
					{ property: 'offer', value: 'user-card', type: 'simple' },
					{ property: 'offer', value: 'featured', type: 'simple' },
				]),
		}),
	];

	// Non-blocking parallel execution: await settlement without holding back page HTML streaming
	await Promise.allSettled(prefetchPromises);

	return (
		<>
			<Header />
			<CategoriesHeader />
			<div className='relative w-full'>
				<Sideline />
				<div className='relative w-[calc(100%-40px)] h-full bg-secondary'>
					<div className='max-w-[1600px] mx-auto min-h-screen p-4 space-y-10'>
						<HydrationBoundary state={dehydrate(queryClient)}>
							{/* Main sections & Animated deals */}
							<Suspense fallback={<HomeMainSkeleton />}>
								<HomeMainAndDeals user={userMetadata} />
							</Suspense>

							{/* Featured Categories */}
							<Suspense fallback={<FeaturedCategoriesSkeleton />}>
								<FeaturedCategories />
							</Suspense>

							{/* More to Love products (Max 2 rows / Top popular) */}
							<Suspense fallback={<ProductsGridSkeleton />}>
								<MoreToLoveSection />
							</Suspense>
						</HydrationBoundary>
					</div>
				</div>
			</div>
			<Footer />
		</>
	);
}

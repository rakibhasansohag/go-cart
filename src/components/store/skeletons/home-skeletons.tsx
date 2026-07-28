import React from 'react';

// Skeleton for the "More to love" product card grid
export function ProductsGridSkeleton() {
	return (
		<div className='w-full'>
			{/* Grid matching MoreToLoveSection responsive grid */}
			<div className='mt-7 bg-background p-4 pb-16 rounded-md w-full grid grid-cols-1 min-[576px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 animate-pulse'>
				{Array.from({ length: 12 }).map((_, i) => (
					<div
						key={i}
						className='w-full bg-secondary/50 rounded-3xl p-4 space-y-4'
					>
						{/* Image placeholder */}
						<div className='w-full aspect-square rounded-2xl bg-neutral-300 dark:bg-neutral-800' />
						{/* Title placeholder */}
						<div className='h-4 w-3/4 rounded bg-neutral-300 dark:bg-neutral-800' />
						{/* Rating & Sales placeholder */}
						<div className='h-3 w-1/2 rounded bg-neutral-300 dark:bg-neutral-800' />
						{/* Price placeholder */}
						<div className='h-5 w-1/3 rounded bg-neutral-300 dark:bg-neutral-800' />
					</div>
				))}
			</div>
		</div>
	);
}

// Skeleton for Featured Categories list
export function FeaturedCategoriesSkeleton() {
	return (
		<div className='w-full mx-auto mt-10 animate-pulse'>
			{/* Title placeholder */}
			<div className='h-8 w-64 mx-auto rounded bg-neutral-300 dark:bg-neutral-800' />
			{/* Grid list */}
			<div className='grid min-[770px]:grid-cols-2 min-[1120px]:grid-cols-3 gap-4 w-full mt-7'>
				{Array.from({ length: 6 }).map((_, i) => (
					<div
						key={i}
						className='h-[160px] w-full rounded-md bg-neutral-300 dark:bg-neutral-800'
					/>
				))}
			</div>
		</div>
	);
}

// Skeleton for Animated Deals section
export function AnimatedDealsSkeleton() {
	return (
		<div className='mt-2 hidden min-[915px]:block w-full h-[220px] rounded-md bg-neutral-300 dark:bg-neutral-800 animate-pulse' />
	);
}

// Skeleton for Featured Section / Middle & Right columns
export function HomeMainSkeleton() {
	return (
		<div className='w-full grid gap-2 min-[1170px]:grid-cols-[1fr_350px] min-[1465px]:grid-cols-[200px_1fr_350px] animate-pulse'>
			{/* Left Column (Ad) */}
			<div className='hidden min-[1465px]:block h-[420px] rounded-md bg-neutral-300 dark:bg-neutral-800' />
			{/* Middle Column (Swiper & Featured Card) */}
			<div className='space-y-2 h-[420px] bg-neutral-300 dark:bg-neutral-800 rounded-md' />
			{/* Right Column (User Card) */}
			<div className='h-[420px] bg-neutral-300 dark:bg-neutral-800 rounded-md' />
		</div>
	);
}

// Skeleton for Super Deals Swiper
export function SuperDealsSkeleton() {
	return (
		<div className='mt-10 h-[280px] w-full rounded-md bg-neutral-300 dark:bg-neutral-800 animate-pulse' />
	);
}

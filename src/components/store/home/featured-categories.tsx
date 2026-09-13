'use client';
import { FeaturedCategoryType } from '@/lib/types';
import CategoryCard from './category-card';
import { useSuspenseQuery } from '@tanstack/react-query';
import { getHomeFeaturedCategories } from '@/queries/home';
import { queryKeys } from '@/lib/query-keys';

export default function FeaturedCategories({
	title,
}: {
	title?: string | null;
}) {
	const { data: categories } = useSuspenseQuery<FeaturedCategoryType[]>({
		queryKey: queryKeys.home.featuredCategories(),
		queryFn: getHomeFeaturedCategories,
	});

	const gridColsClass =
		categories.length === 4
			? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 w-full mt-7'
			: categories.length === 2
			? 'grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mt-7'
			: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full mt-7';

	return (
		<section id='featured-categories' aria-labelledby='featured-categories-heading' className='w-full mx-auto'>
			{/* Header */}
			<div className='relative text-center h-[32px] leading-[32px] flex items-center justify-center'>
				<div className='absolute inset-0 flex items-center' aria-hidden='true'>
					<div className='w-full border-t border-border/40 dark:border-border/60' />
				</div>
				<div className='relative flex justify-center'>
					<h2 id='featured-categories-heading' className='px-4 bg-secondary z-10 text-foreground font-extrabold text-2xl'>
						{title || 'Featured Categories'}
					</h2>
				</div>
			</div>
			{/* List */}
			<div className={gridColsClass}>
				{categories.map((category) => (
					<CategoryCard key={category.id} category={category} />
				))}
			</div>
		</section>
	);
}

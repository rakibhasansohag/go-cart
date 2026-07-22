'use client';
import { FeaturedCategoryType } from '@/lib/types';
import CategoryCard from './category-card';
import { useSuspenseQuery } from '@tanstack/react-query';
import { getHomeFeaturedCategories } from '@/queries/home';
import { queryKeys } from '@/lib/query-keys';

export default function FeaturedCategories() {
	const { data: categories } = useSuspenseQuery<FeaturedCategoryType[]>({
		queryKey: queryKeys.home.featuredCategories(),
		queryFn: getHomeFeaturedCategories,
	});

	return (
		<div className='w-full mx-auto'>
			{/* Header */}
			<div className='text-center h-[32px] leading-[32px] text-[24px] font-extrabold text-foreground flex justify-center'>
				<div className='h-[1px] flex-1 border-t-[2px] border-t-[hsla(0,0%,59.2%,.3)] my-4 mx-[14px]' />
				<span className=''>Featured Categories</span>
				<div className='h-[1px] flex-1 border-t-[2px] border-t-[hsla(0,0%,59.2%,.3)] my-4 mx-[14px]' />
			</div>
			{/* List */}
			<div className='grid min-[770px]:grid-cols-2 min-[1120px]:grid-cols-3  gap-4 w-full mt-7'>
				{categories.map((category) => (
					<CategoryCard key={category.id} category={category} />
				))}
			</div>
		</div>
	);
}

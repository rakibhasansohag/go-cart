import { FiltersQueryType } from '@/lib/types';
import { getAllCategories } from '@/queries/category';
import { getAllOfferTags } from '@/queries/offer-tag';
import CategoryFilter from './filters/category/category-filter';
import OfferFilter from './filters/offer/offer-filter';
import SizeFilter from './filters/size/size-filter';
import FiltersHeader from './filters/header';
import PriceFilter from './filters/price/price';
import ColorFilter from './filters/color/color-filter';
import { Suspense } from 'react';

export default async function ProductFilters({
	queries,
	storeUrl,
}: {
	queries: FiltersQueryType;
	storeUrl?: string;
}) {
	const categories = await getAllCategories(storeUrl);
	const offers = await getAllOfferTags(storeUrl);

	return (
		<div className='h-full w-full overflow-y-auto pb-4 pr-1 scrollbar'>
			<FiltersHeader queries={queries} />
			{/* Filters */}
			<div className='border-t border-border w-full mt-2'>
				<PriceFilter />
				<CategoryFilter categories={categories} />
				<Suspense fallback={<div className='h-20 w-full animate-pulse bg-neutral-100 dark:bg-neutral-800/50 rounded-md mt-4' />}>
					<ColorFilter queries={queries} storeUrl={storeUrl} />
				</Suspense>
				<OfferFilter offers={offers} />
				<Suspense fallback={<div className='h-20 w-full animate-pulse bg-neutral-100 dark:bg-neutral-800/50 rounded-md mt-4' />}>
					<SizeFilter queries={queries} storeUrl={storeUrl} />
				</Suspense>
			</div>
		</div>
	);
}

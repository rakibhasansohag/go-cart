import { FiltersQueryType } from '@/lib/types';
import { getAllCategories } from '@/queries/category';
import { getAllOfferTags } from '@/queries/offer-tag';
import { getSearchFacets } from '@/queries/search';
import CategoryFilter from './filters/category/category-filter';
import OfferFilter from './filters/offer/offer-filter';
import SizeFilter from './filters/size/size-filter';
import FiltersHeader from './filters/header';
import PriceFilter from './filters/price/price';
import ColorFilter from './filters/color/color-filter';
import BrandFilter from './filters/brand/brand-filter';
import RatingFilter from './filters/rating/rating-filter';
import { Suspense } from 'react';

export default async function ProductFilters({
	queries,
	storeUrl,
}: {
	queries: FiltersQueryType;
	storeUrl?: string;
}) {
	const [categories, offers, facets] = await Promise.all([
		getAllCategories(storeUrl),
		getAllOfferTags(storeUrl),
		getSearchFacets({
			search: queries.search,
			category: queries.category,
			subCategory: queries.subCategory,
			offer: queries.offer,
			store: storeUrl,
		}),
	]);

	return (
		<div className='w-full h-auto pb-4'>
			<FiltersHeader queries={queries} />
			{/* Filters */}
			<div className='border-t border-border w-full mt-2'>
				<PriceFilter />
				<CategoryFilter categories={categories} />
				<BrandFilter brands={facets.brands} />
				<RatingFilter ratings={facets.ratings} />
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

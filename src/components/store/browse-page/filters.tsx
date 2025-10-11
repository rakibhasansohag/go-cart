import { FiltersQueryType } from '@/lib/types';
import { getAllCategories } from '@/queries/category';
import { getAllOfferTags } from '@/queries/offer-tag';
import CategoryFilter from './filters/category/category-filter';
import OfferFilter from './filters/offer/offer-filter';
import SizeFilter from './filters/size/size-filter';
import FiltersHeader from './filters/header';
import PriceFilter from './filters/price/price';

import ColorFilter from './filters/color/color-filter';

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
		<div className='h-full w-48 transition-transform overflow-auto pr-6 pb-2.5 flex-none basis-[196px] overflow-x-hidden scrollbar'>
			<FiltersHeader queries={queries} />
			{/* Filters */}
			<div className='border-t w-40 md:w-44'>
				<PriceFilter />
				<CategoryFilter categories={categories} />
				<ColorFilter queries={queries} storeUrl={storeUrl} />
				<OfferFilter offers={offers} />
				<SizeFilter queries={queries} storeUrl={storeUrl} />
			</div>
		</div>
	);
}

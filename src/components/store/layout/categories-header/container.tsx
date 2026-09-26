'use client';
import { useState } from 'react';
import { Category, OfferTag } from '@prisma/client';
import CategoriesMenu from './categories-menu';
import OfferTagsLinks from './offerTags-links';

export default function CategoriesHeaderContainer({
	categories,
	offerTags,
}: {
	categories: Category[];
	offerTags: OfferTag[];
}) {
	const [open, setOpen] = useState<boolean>(false);

	return (
		<div className='w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 flex items-center gap-x-2 sm:gap-x-3'>
			{/* Category menu */}
			<div className='shrink-0 relative'>
				<CategoriesMenu categories={categories} open={open} setOpen={setOpen} />
			</div>
			{/* Offer tags links */}
			<div className='min-w-0 flex-1 overflow-x-auto no-scrollbar py-0.5'>
				<OfferTagsLinks offerTags={offerTags} open={open} />
			</div>
		</div>
	);
}

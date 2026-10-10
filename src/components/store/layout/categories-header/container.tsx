'use client';
import { useState } from 'react';
import { Category, OfferTag } from '@prisma/client';
import CategoriesMenu from './categories-menu';
import OfferTagsLinks from './offerTags-links';
import Link from 'next/link';
import { Store } from 'lucide-react';

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
			<Link href='/stores' className='inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20'><Store className='size-4' />Browse stores</Link>
			<div className='min-w-0 flex-1 overflow-x-auto no-scrollbar py-0.5'>
				<OfferTagsLinks offerTags={offerTags} open={open} />
			</div>
		</div>
	);
}

'use client';

import React from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { getProducts } from '@/queries/product';
import { queryKeys } from '@/lib/query-keys';
import ProductCard from '@/components/store/cards/product/product-card';

export default function MoreToLoveSection({
	title,
	itemsLimit = 12,
}: {
	title?: string | null;
	itemsLimit?: number;
}) {
	const { data: productsData } = useSuspenseQuery({
		queryKey: queryKeys.products.list({ sort: 'most-popular' }, 'most-popular', null),
		queryFn: () => getProducts({}, 'most-popular', null, 24),
	});

	const { products } = productsData;
	// Limit to configured count (default 12)
	const topPopularProducts = (products || []).slice(0, itemsLimit);

	return (
		<section id='more-to-love' aria-labelledby='more-to-love-heading'>
			{/* Header */}
			<div className='relative text-center h-[32px] leading-[32px] flex items-center justify-center'>
				<div className='absolute inset-0 flex items-center' aria-hidden='true'>
					<div className='w-full border-t border-border/40 dark:border-border/60' />
				</div>
				<div className='relative flex justify-center'>
					<h2 id='more-to-love-heading' className='px-4 bg-secondary z-10 text-foreground font-extrabold text-2xl'>
						{title || 'More to love'}
					</h2>
				</div>
			</div>
			{/* Products grid (2 columns on mobile, scaling up to 6 on 2xl) */}
			<div className='mt-5 sm:mt-7 bg-background p-2.5 sm:p-4 pb-16 rounded-xl sm:rounded-md w-full grid grid-cols-2 min-[576px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5 sm:gap-4'>
				{topPopularProducts.map((product) => (
					<ProductCard key={product.id + product.slug} product={product} className='w-full' />
				))}
			</div>
		</section>
	);
}

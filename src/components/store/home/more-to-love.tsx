'use client';

import React from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { getProducts } from '@/queries/product';
import { queryKeys } from '@/lib/query-keys';
import ProductCard from '@/components/store/cards/product/product-card';

export default function MoreToLoveSection() {
	const { data: productsData } = useSuspenseQuery({
		queryKey: queryKeys.products.list({ sort: 'most-popular' }, 'most-popular', null),
		queryFn: () => getProducts({}, 'most-popular', null, 12),
	});

	const { products } = productsData;
	// Limit to max 2 rows of products (12 products max across responsive grid)
	const topPopularProducts = (products || []).slice(0, 12);

	return (
		<div>
			{/* Header */}
			<div className='text-center h-[32px] leading-[32px] text-[24px] font-extrabold text-foreground flex justify-center'>
				<div className='h-[1px] flex-1 border-t-[2px] border-t-[hsla(0,0%,59.2%,.3)] my-4 mx-[14px]' />
				<span>More to love</span>
				<div className='h-[1px] flex-1 border-t-[2px] border-t-[hsla(0,0%,59.2%,.3)] my-4 mx-[14px]' />
			</div>
			{/* Products grid (1 column < 576px, 2 columns >= 576px) */}
			<div className='mt-7 bg-background p-4 pb-16 rounded-md w-full grid grid-cols-1 min-[576px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4'>
				{topPopularProducts.map((product) => (
					<ProductCard key={product.id + product.slug} product={product} className='w-full' />
				))}
			</div>
		</div>
	);
}

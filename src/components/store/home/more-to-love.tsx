'use client';

import React from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { getProducts } from '@/queries/product';
import { queryKeys } from '@/lib/query-keys';
import ProductCard from '@/components/store/cards/product/product-card';

export default function MoreToLoveSection() {
	const { data: productsData } = useSuspenseQuery({
		queryKey: queryKeys.products.list({}, '', 1),
		queryFn: () => getProducts({}, '', 1, 100),
	});

	const { products } = productsData;

	return (
		<div>
			{/* Header */}
			<div className='text-center h-[32px] leading-[32px] text-[24px] font-extrabold text-foreground flex justify-center'>
				<div className='h-[1px] flex-1 border-t-[2px] border-t-[hsla(0,0%,59.2%,.3)] my-4 mx-[14px]' />
				<span>More to love</span>
				<div className='h-[1px] flex-1 border-t-[2px] border-t-[hsla(0,0%,59.2%,.3)] my-4 mx-[14px]' />
			</div>
			{/* Products grid */}
			<div className='mt-7 bg-background justify-center flex flex-wrap gap-4 min-[1530px]:grid min-[1530px]:grid-cols-6 min-[1530px]:gap-4 p-4 pb-16 rounded-md'>
				{products.map((product) => (
					<ProductCard key={product.id + product.slug} product={product} />
				))}
			</div>
		</div>
	);
}

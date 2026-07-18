'use client';
import { ProductType } from '@/lib/types';
import React from 'react';
import ProductList from '../shared/product-list';
import { getRelatedProducts } from '@/queries/product-optimized';
import { useSuspenseQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

export default function RelatedProducts({
	productId,
	categoryId,
	subCategoryId,
}: {
	productId: string;
	categoryId: string;
	subCategoryId: string;
}) {
	const { data: products } = useSuspenseQuery<ProductType[]>({
		queryKey: queryKeys.products.related(productId),
		queryFn: () => getRelatedProducts(productId, categoryId, subCategoryId),
	});

	return (
		<div className='pt-6' id='reviews'>
			{/* Title */}
			<div className='h-12'>
				<h2 className='text-main-primary text-2xl font-bold'>
					You Might Also Like
				</h2>
			</div>
			{/* Products */}
			<ProductList products={products} />
		</div>
	);
}

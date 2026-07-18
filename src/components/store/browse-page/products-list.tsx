'use client';

import React from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { getProducts } from '@/queries/product';
import { queryKeys } from '@/lib/query-keys';
import { FiltersQueryType } from '@/lib/types';
import ProductCard from '@/components/store/cards/product/product-card';

export default function BrowseProductsList({
	queries,
}: {
	queries: FiltersQueryType;
}) {
	const {
		category,
		offer,
		search,
		size,
		sort,
		subCategory,
		maxPrice,
		minPrice,
		color,
	} = queries;

	// Call useSuspenseQuery using our query key and getProducts query action
	const { data: productsData } = useSuspenseQuery({
		queryKey: queryKeys.products.list(
			{
				search,
				minPrice: Number(minPrice) || 0,
				maxPrice: Number(maxPrice) || Number.MAX_SAFE_INTEGER,
				category,
				subCategory,
				offer,
				size: Array.isArray(size) ? size : size ? [size] : undefined,
				color: Array.isArray(color) ? color : color ? [color] : undefined,
			},
			sort || '',
			1, // default page
		),
		queryFn: () =>
			getProducts(
				{
					search,
					minPrice: Number(minPrice) || 0,
					maxPrice: Number(maxPrice) || Number.MAX_SAFE_INTEGER,
					category,
					subCategory,
					offer,
					size: Array.isArray(size) ? size : size ? [size] : undefined,
					color: Array.isArray(color) ? color : color ? [color] : undefined,
				},
				sort,
			),
	});

	const { products } = productsData;

	return (
		<div className='mt-4 px-4 w-full overflow-y-auto max-h-[calc(100vh-155px)] pb-28 scrollbar flex flex-wrap gap-4'>
			{products.map((product) => (
				<ProductCard key={product.id + product.slug} product={product} />
			))}
			{products.length === 0 && (
				<div className='w-full text-center text-neutral-400 py-20'>
					No products found matching your filters.
				</div>
			)}
		</div>
	);
}

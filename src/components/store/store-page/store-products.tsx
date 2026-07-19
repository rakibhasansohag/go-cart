'use client';

import { FiltersQueryType } from '@/lib/types';
import { getProducts } from '@/queries/product';
import { useSuspenseQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import ProductCard from '../cards/product/product-card';

export default function StoreProducts({
	searchParams,
	store,
}: {
	searchParams: FiltersQueryType;
	store: string;
}) {
	const { category, offer, search, size, sort, subCategory, color, minPrice, maxPrice } = searchParams;

	const filterOptions = {
		search,
		minPrice: Number(minPrice) || 0,
		maxPrice: Number(maxPrice) || Number.MAX_SAFE_INTEGER,
		category,
		subCategory,
		offer,
		size: Array.isArray(size) ? size : size ? [size] : undefined,
		color: Array.isArray(color) ? color : color ? [color] : undefined,
		store,
	};

	// Fetch store products using useSuspenseQuery for instant caching and updates
	const { data: productsData } = useSuspenseQuery({
		queryKey: queryKeys.products.list(filterOptions, sort || '', 1),
		queryFn: () => getProducts(filterOptions, sort),
	});

	const { products } = productsData;

	return (
		<div className='bg-background w-full grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 p-4 pb-16 rounded-xl border border-border/10 shadow-sm'>
			{products.map((product) => (
				<ProductCard key={product.id + product.slug} product={product} className='w-full' />
			))}
			{products.length === 0 && (
				<div className='w-full text-center text-neutral-400 py-20'>
					No products found matching your filters.
				</div>
			)}
		</div>
	);
}

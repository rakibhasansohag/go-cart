'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { getProducts } from '@/queries/product';
import { queryKeys } from '@/lib/query-keys';
import { FiltersQueryType } from '@/lib/types';
import ProductCard from '@/components/store/cards/product/product-card';

export function BrowseProductsSkeleton() {
	return (
		<div className='w-full grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 animate-pulse'>
			{Array.from({ length: 10 }).map((_, i) => (
				<div
					key={i}
					className='w-full bg-card/60 border border-border rounded-2xl p-3.5 space-y-3'
				>
					<div className='w-full aspect-square rounded-xl bg-muted' />
					<div className='h-4 w-3/4 rounded bg-muted' />
					<div className='h-3 w-1/2 rounded bg-muted/60' />
					<div className='h-5 w-1/3 rounded bg-muted' />
				</div>
			))}
		</div>
	);
}

export default function BrowseProductsList({
	queries: _initialQueries,
}: {
	queries?: FiltersQueryType;
}) {
	const searchParams = useSearchParams();

	const category = searchParams.get('category') || undefined;
	const subCategory = searchParams.get('subCategory') || undefined;
	const offer = searchParams.get('offer') || undefined;
	const search = searchParams.get('search') || undefined;
	const sort = searchParams.get('sort') || 'most-popular';
	const minPrice = searchParams.get('minPrice') || undefined;
	const maxPrice = searchParams.get('maxPrice') || undefined;
	const color = searchParams.get('color') || undefined;
	const size = searchParams.get('size') || undefined;
	const brand = searchParams.get('brand') || undefined;
	const rating = searchParams.get('rating') || undefined;

	const brandArray = brand
		? brand.split(',').map((b) => b.trim()).filter(Boolean)
		: undefined;
	const ratingNumber = rating ? Number(rating) || undefined : undefined;
	const sizeArray = size
		? size.split(',').map((s) => s.trim()).filter(Boolean)
		: undefined;
	const colorArray = color
		? color.split(',').map((c) => c.trim()).filter(Boolean)
		: undefined;

	const filterOptions = {
		search,
		minPrice: Number(minPrice) || 0,
		maxPrice: Number(maxPrice) || Number.MAX_SAFE_INTEGER,
		category,
		subCategory,
		offer,
		size: sizeArray,
		color: colorArray,
		brand: brandArray,
		rating: ratingNumber,
	};

	const { data: productsData, isFetching } = useQuery({
		queryKey: queryKeys.products.list(filterOptions, sort || '', null),
		queryFn: () => getProducts(filterOptions, sort, null),
	});

	if (isFetching || !productsData) {
		return <BrowseProductsSkeleton />;
	}

	const { products } = productsData;

	return (
		<div className='w-full grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4'>
			{products.map((product) => (
				<ProductCard key={product.id + product.slug} product={product} className='w-full' />
			))}
			{products.length === 0 && (
				<div className='col-span-full w-full text-center text-neutral-400 py-20'>
					No products found matching your filters.
				</div>
			)}
		</div>
	);
}

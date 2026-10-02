'use client';

import { FiltersQueryType } from '@/lib/types';
import { getProducts } from '@/queries/product';
import { useSuspenseQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import ProductCard from '../cards/product/product-card';
import { UrlPagination } from '@/components/ui/url-pagination';
import { getStoreProductFilters } from '@/lib/store-product-filters';
import Link from 'next/link';

export default function StoreProducts({
	searchParams,
	store,
}: {
	searchParams: FiltersQueryType;
	store: string;
}) {
	const { sort } = searchParams;
	const filterOptions = getStoreProductFilters(searchParams, store);

	// Fetch store products using useSuspenseQuery for instant caching and updates
	const { data: productsData } = useSuspenseQuery({
		queryKey: queryKeys.products.list(filterOptions, sort || '', null),
		queryFn: () => getProducts(filterOptions, sort, null),
	});

	const { products, currentPage, totalPages, totalCount } = productsData;
	const firstPageParams = new URLSearchParams();
	for (const [key, value] of Object.entries(searchParams)) {
		if (key === 'page' || value === undefined) continue;
		for (const entry of Array.isArray(value) ? value : [value]) {
			firstPageParams.append(key, entry);
		}
	}

	return (
		<div className='bg-background w-full rounded-xl border border-border/10 shadow-sm'>
		<div className='grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 p-4'>
			{products.map((product) => (
				<ProductCard key={product.id + product.slug} product={product} className='w-full' />
			))}
			{products.length === 0 && (
				<div className='col-span-full text-center text-neutral-400 py-20'>
					No products found matching your filters.
					{currentPage > totalPages && (
						<Link className='block mt-3 text-primary underline' href={`/store/${store}?${firstPageParams.toString()}`}>
							Return to the first page
						</Link>
					)}
				</div>
			)}
		</div>
		{currentPage <= totalPages && <UrlPagination label='Store products pagination' page={currentPage} totalPages={totalPages} total={totalCount} param='page' />}
		</div>
	);
}

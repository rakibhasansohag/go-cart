'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { getProducts } from '@/queries/product';
import { queryKeys } from '@/lib/query-keys';
import { FiltersQueryType } from '@/lib/types';
import ProductCard from '@/components/store/cards/product/product-card';
import { UrlPagination } from '@/components/ui/url-pagination';
import OfferBanner from './offer-banner';

export function BrowseProductsSkeleton() {
	return (
		<div className='w-full space-y-6'>
			<div className='h-4 w-44 rounded bg-muted animate-pulse' />
			<div className='w-full grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 animate-pulse'>
				{Array.from({ length: 12 }).map((_, i) => (
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

	const page = Math.max(1, Number(searchParams.get('page')) || 1);
	const limit = Math.min(48, Math.max(12, Number(searchParams.get('limit')) || 24));

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
		page,
	};

	const { data: productsData, isFetching } = useQuery({
		queryKey: queryKeys.products.list(filterOptions, sort || '', null),
		queryFn: () => getProducts(filterOptions, sort, null, limit, page),
	});

	if (isFetching || !productsData) {
		return <BrowseProductsSkeleton />;
	}

	const { products, totalCount = 0, totalPages = 1, currentPage = page } = productsData;

	const startItem = totalCount === 0 ? 0 : (currentPage - 1) * limit + 1;
	const endItem = Math.min(totalCount, currentPage * limit);

	return (
		<div className='w-full space-y-5'>
			{/* Dynamic Offer Banner when filtered by offer */}
			{offer && <OfferBanner offer={offer} />}

			{/* Products Range Summary Header */}
			<div className='flex items-center justify-between text-xs text-muted-foreground pb-1'>
				<div>
					{totalCount > 0 ? (
						<span>
							Showing <strong className='text-foreground'>{startItem}–{endItem}</strong> of{' '}
							<strong className='text-foreground'>{totalCount}</strong> products
						</span>
					) : (
						<span>0 products found</span>
					)}
				</div>
				<div className='hidden sm:block text-[11px] text-muted-foreground'>
					Page {currentPage} of {totalPages}
				</div>
			</div>

			{/* Product Cards Grid */}
			<div className='w-full grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4'>
				{products.map((product) => (
					<ProductCard key={product.id + product.slug} product={product} className='w-full' />
				))}
				{products.length === 0 && (
					<div className='col-span-full w-full text-center text-muted-foreground py-20 bg-card/40 rounded-2xl border border-dashed border-border'>
						<p className='text-base font-medium'>No products found matching your filters.</p>
						<p className='text-xs text-muted-foreground mt-1'>Try resetting price range, categories, or offer tags.</p>
					</div>
				)}
			</div>

			{/* Bottom Pagination Controls */}
			{totalPages > 1 && (
				<div className='mt-8 pt-2 border-t border-border'>
					<UrlPagination
						label='Browse products pagination'
						page={currentPage}
						totalPages={totalPages}
						total={totalCount}
						param='page'
					/>
				</div>
			)}
		</div>
	);
}

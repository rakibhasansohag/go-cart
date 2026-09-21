'use server';

import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { SearchFacetsType } from '@/lib/types';
import { ProductFilterParams } from './product';

export async function getSearchFacets(
	filters: ProductFilterParams = {},
): Promise<SearchFacetsType> {
	// Performance Optimization: Fetch store, category, subCategory, and offerTag lookups
	// in parallel using Promise.all instead of sequential await calls.
	// Reduces DB latency from up to 4 sequential round-trips to 1 concurrent batch.
	const [store, category, subCategory, offerTag] = await Promise.all([
		filters.store
			? db.store.findUnique({
					where: { url: filters.store },
					select: { id: true },
				})
			: null,
		filters.category
			? db.category.findUnique({
					where: { url: filters.category },
					select: { id: true },
				})
			: null,
		filters.subCategory
			? db.subCategory.findUnique({
					where: { url: filters.subCategory },
					select: { id: true },
				})
			: null,
		filters.offer
			? db.offerTag.findUnique({
					where: { url: filters.offer },
					select: { id: true },
				})
			: null,
	]);

	const storeId = store?.id;
	const categoryId = category?.id;
	const subCategoryId = subCategory?.id;
	const offerTagId = offerTag?.id;

	// Base context conditions (scope of search/category/store/offer)
	const baseConditions: Prisma.ProductWhereInput[] = [];

	if (storeId) baseConditions.push({ storeId });
	if (filters.productId) baseConditions.push({ id: { not: filters.productId } });
	if (categoryId) baseConditions.push({ categoryId });
	if (subCategoryId) baseConditions.push({ subCategoryId });
	if (offerTagId) baseConditions.push({ offerTagId });

	if (filters.search?.trim()) {
		const term = filters.search.trim();
		baseConditions.push({
			OR: [
				{ name: { contains: term, mode: 'insensitive' } },
				{ brand: { contains: term, mode: 'insensitive' } },
				{ description: { contains: term, mode: 'insensitive' } },
				{
					variants: {
						some: {
							OR: [
								{ variantName: { contains: term, mode: 'insensitive' } },
								{ keywords: { contains: term, mode: 'insensitive' } },
							],
						},
					},
				},
			],
		});
	}

	const baseWhere: Prisma.ProductWhereInput = {
		AND: baseConditions,
	};

	// Performance Optimization: Batch all facet aggregation queries (brands, star ratings,
	// price bounds, color distribution, size distribution, total count) into a single
	// concurrent Promise.all batch to execute DB queries in parallel instead of serially.
	const [
		brandGroups,
		count4,
		count3,
		count2,
		count1,
		totalCount,
		priceAggregate,
		colorGroups,
		sizeGroups,
	] = await Promise.all([
		// 1. Brands aggregation
		db.product.groupBy({
			by: ['brand'],
			where: {
				...baseWhere,
				brand: { not: '' },
			},
			_count: {
				id: true,
			},
			orderBy: {
				_count: {
					id: 'desc',
				},
			},
			take: 30,
		}),
		// 2. Star ratings distribution & total count
		db.product.count({ where: { ...baseWhere, rating: { gte: 4 } } }),
		db.product.count({ where: { ...baseWhere, rating: { gte: 3 } } }),
		db.product.count({ where: { ...baseWhere, rating: { gte: 2 } } }),
		db.product.count({ where: { ...baseWhere, rating: { gte: 1 } } }),
		db.product.count({ where: baseWhere }),
		// 3. Price bounds
		db.size.aggregate({
			_min: { price: true },
			_max: { price: true },
			where: {
				productVariant: {
					product: baseWhere,
				},
			},
		}),
		// 4. Colors aggregation
		db.color.groupBy({
			by: ['name'],
			where: {
				productVariant: {
					product: baseWhere,
				},
			},
			_count: {
				id: true,
			},
			orderBy: {
				_count: {
					id: 'desc',
				},
			},
			take: 20,
		}),
		// 5. Sizes aggregation
		db.size.groupBy({
			by: ['size'],
			where: {
				productVariant: {
					product: baseWhere,
				},
			},
			_count: {
				id: true,
			},
			orderBy: {
				_count: {
					id: 'desc',
				},
			},
			take: 20,
		}),
	]);

	const brands = brandGroups
		.filter((group) => group.brand && group.brand.trim().length > 0)
		.map((group) => ({
			name: group.brand,
			count: group._count.id,
		}));

	const ratings = [
		{ rating: 4, count: count4 },
		{ rating: 3, count: count3 },
		{ rating: 2, count: count2 },
		{ rating: 1, count: count1 },
	];

	const priceRange = {
		min: Math.floor(priceAggregate._min.price ?? 0),
		max: Math.ceil(priceAggregate._max.price ?? 500),
	};

	const colors = colorGroups.map((group) => ({
		name: group.name,
		count: group._count.id,
	}));

	const sizes = sizeGroups.map((group) => ({
		size: group.size,
		count: group._count.id,
	}));

	return {
		brands,
		ratings,
		priceRange,
		colors,
		sizes,
		totalCount,
	};
}

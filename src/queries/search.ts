'use server';

import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { SearchFacetsType } from '@/lib/types';
import { ProductFilterParams } from './product';

export async function getSearchFacets(
	filters: ProductFilterParams = {},
): Promise<SearchFacetsType> {
	let storeId: string | undefined;
	let categoryId: string | undefined;
	let subCategoryId: string | undefined;
	let offerTagId: string | undefined;

	if (filters.store) {
		const store = await db.store.findUnique({
			where: { url: filters.store },
			select: { id: true },
		});
		if (store) storeId = store.id;
	}

	if (filters.category) {
		const category = await db.category.findUnique({
			where: { url: filters.category },
			select: { id: true },
		});
		if (category) categoryId = category.id;
	}

	if (filters.subCategory) {
		const subCategory = await db.subCategory.findUnique({
			where: { url: filters.subCategory },
			select: { id: true },
		});
		if (subCategory) subCategoryId = subCategory.id;
	}

	if (filters.offer) {
		const offer = await db.offerTag.findUnique({
			where: { url: filters.offer },
			select: { id: true },
		});
		if (offer) offerTagId = offer.id;
	}

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

	// 1. Brands aggregation
	const brandGroups = await db.product.groupBy({
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
	});

	const brands = brandGroups
		.filter((group) => group.brand && group.brand.trim().length > 0)
		.map((group) => ({
			name: group.brand,
			count: group._count.id,
		}));

	// 2. Star ratings distribution (4★+, 3★+, 2★+, 1★+)
	const [count4, count3, count2, count1, totalCount] = await Promise.all([
		db.product.count({ where: { ...baseWhere, rating: { gte: 4 } } }),
		db.product.count({ where: { ...baseWhere, rating: { gte: 3 } } }),
		db.product.count({ where: { ...baseWhere, rating: { gte: 2 } } }),
		db.product.count({ where: { ...baseWhere, rating: { gte: 1 } } }),
		db.product.count({ where: baseWhere }),
	]);

	const ratings = [
		{ rating: 4, count: count4 },
		{ rating: 3, count: count3 },
		{ rating: 2, count: count2 },
		{ rating: 1, count: count1 },
	];

	// 3. Price bounds
	const priceAggregate = await db.size.aggregate({
		_min: { price: true },
		_max: { price: true },
		where: {
			productVariant: {
				product: baseWhere,
			},
		},
	});

	const priceRange = {
		min: Math.floor(priceAggregate._min.price ?? 0),
		max: Math.ceil(priceAggregate._max.price ?? 500),
	};

	// 4. Colors aggregation
	const colorGroups = await db.color.groupBy({
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
	});

	const colors = colorGroups.map((group) => ({
		name: group.name,
		count: group._count.id,
	}));

	// 5. Sizes aggregation
	const sizeGroups = await db.size.groupBy({
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
	});

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

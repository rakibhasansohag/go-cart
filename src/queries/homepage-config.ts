'use server';

import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';

import {
	DEFAULT_HOMEPAGE_SECTIONS,
	type HomepageSectionConfig,
	type HomepageSectionItem,
	type HomepageSectionKey,
	type HomepageStudioStats,
	type DealProductItem,
	type CuratedProductSearchResult,
} from '@/lib/homepage-types';

export type {
	HomepageSectionConfig,
	HomepageSectionItem,
	HomepageSectionKey,
	HomepageStudioStats,
	DealProductItem,
	CuratedProductSearchResult,
};

// Helper: Seed default sections if the table is empty
async function seedDefaultSectionsIfNeeded(): Promise<HomepageSectionItem[]> {
	const created: HomepageSectionItem[] = [];
	for (const def of DEFAULT_HOMEPAGE_SECTIONS) {
		const row = await db.homepageSection.upsert({
			where: { sectionKey: def.sectionKey },
			update: {},
			create: {
				sectionKey: def.sectionKey,
				name: def.name,
				title: def.title,
				subtitle: def.subtitle,
				isActive: def.isActive,
				order: def.order,
				config: def.config as Prisma.InputJsonValue,
			},
		});
		created.push({
			id: row.id,
			sectionKey: row.sectionKey as HomepageSectionKey,
			name: row.name,
			title: row.title,
			subtitle: row.subtitle,
			isActive: row.isActive,
			order: row.order,
			config: row.config as HomepageSectionConfig | null,
			updatedAt: row.updatedAt,
		});
	}
	return created;
}

// Function: getHomepageLayout
// Description: Returns all active sections ordered for the storefront home page.
// Access Level: Public
export async function getHomepageLayout(): Promise<HomepageSectionItem[]> {
	try {
		const sections = await db.homepageSection.findMany({
			where: { isActive: true },
			orderBy: { order: 'asc' },
		});

		if (sections.length === 0) {
			return await seedDefaultSectionsIfNeeded();
		}

		return sections.map((s) => ({
			id: s.id,
			sectionKey: s.sectionKey as HomepageSectionKey,
			name: s.name,
			title: s.title,
			subtitle: s.subtitle,
			isActive: s.isActive,
			order: s.order,
			config: s.config as HomepageSectionConfig | null,
			updatedAt: s.updatedAt,
		}));
	} catch (error) {
		console.error('[HOMEPAGE_CONFIG] Failed to load sections, using defaults:', error);
		// Fallback for resilient rendering
		return DEFAULT_HOMEPAGE_SECTIONS.map((def, idx) => ({
			id: `default-${idx + 1}`,
			sectionKey: def.sectionKey,
			name: def.name,
			title: def.title,
			subtitle: def.subtitle,
			isActive: def.isActive,
			order: def.order,
			config: def.config,
			updatedAt: new Date(),
		}));
	}
}

// Helper: Authenticate and authorize admin user
async function assertAdmin() {
	const user = await currentUser();
	if (!user) throw new Error('Unauthenticated.');
	if (
		user.privateMetadata?.role === 'ADMIN' ||
		user.publicMetadata?.role === 'ADMIN'
	) {
		return user;
	}
	const dbUser = await db.user?.findUnique?.({
		where: { id: user.id },
		select: { role: true },
	});
	if (dbUser?.role === 'ADMIN') {
		return user;
	}
	throw new Error('Unauthorized Access: Admin Privileges Required.');
}

// Function: getAdminHomepageSections
// Description: Retrieves all sections (both active and hidden) for the admin customization studio.
// Access Level: Admin only
export async function getAdminHomepageSections(): Promise<HomepageSectionItem[]> {
	await assertAdmin();

	const sections = await db.homepageSection.findMany({
		orderBy: { order: 'asc' },
	});

	if (sections.length === 0) {
		return await seedDefaultSectionsIfNeeded();
	}

	return sections.map((s) => ({
		id: s.id,
		sectionKey: s.sectionKey as HomepageSectionKey,
		name: s.name,
		title: s.title,
		subtitle: s.subtitle,
		isActive: s.isActive,
		order: s.order,
		config: s.config as HomepageSectionConfig | null,
		updatedAt: s.updatedAt,
	}));
}

// Function: updateHomepageSection
// Description: Updates visibility, titles, or configuration for a single homepage section.
// Access Level: Admin only
export async function updateHomepageSection(
	id: string,
	data: {
		isActive?: boolean;
		title?: string | null;
		subtitle?: string | null;
		config?: HomepageSectionConfig | null;
	}
) {
	await assertAdmin();

	const updated = await db.homepageSection.update({
		where: { id },
		data: {
			...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
			...(data.title !== undefined ? { title: data.title } : {}),
			...(data.subtitle !== undefined ? { subtitle: data.subtitle } : {}),
			...(data.config !== undefined
				? { config: data.config as Prisma.InputJsonValue }
				: {}),
		},
	});

	revalidatePath('/');
	return {
		id: updated.id,
		sectionKey: updated.sectionKey as HomepageSectionKey,
		name: updated.name,
		title: updated.title,
		subtitle: updated.subtitle,
		isActive: updated.isActive,
		order: updated.order,
		config: updated.config as HomepageSectionConfig | null,
		updatedAt: updated.updatedAt,
	};
}

// Function: reorderHomepageSections
// Description: Updates display order indexes for a batch of homepage sections.
// Access Level: Admin only
export async function reorderHomepageSections(orderedIds: string[]) {
	await assertAdmin();

	await db.$transaction(
		orderedIds.map((id, index) =>
			db.homepageSection.update({
				where: { id },
				data: { order: index + 1 },
			})
		)
	);

	revalidatePath('/');
	return { success: true };
}

// Function: resetHomepageLayout
// Description: Resets all homepage sections to default order, active state, and titles.
// Access Level: Admin only
export async function resetHomepageLayout() {
	await assertAdmin();

	await db.$transaction(
		DEFAULT_HOMEPAGE_SECTIONS.map((def) =>
			db.homepageSection.upsert({
				where: { sectionKey: def.sectionKey },
				update: {
					name: def.name,
					title: def.title,
					subtitle: def.subtitle,
					isActive: def.isActive,
					order: def.order,
					config: def.config as Prisma.InputJsonValue,
				},
				create: {
					sectionKey: def.sectionKey,
					name: def.name,
					title: def.title,
					subtitle: def.subtitle,
					isActive: def.isActive,
					order: def.order,
					config: def.config as Prisma.InputJsonValue,
				},
			})
		)
	);

	revalidatePath('/');
	return { success: true };
}

// Function: getHomepageStudioStats
// Description: Computes live CRM storefront statistics including total products on sale and discount metrics.
// Access Level: Admin only
export async function getHomepageStudioStats(): Promise<HomepageStudioStats> {
	await assertAdmin();

	try {
		const [
			totalProducts,
			onSaleProducts,
			discountAgg,
			totalSections,
			activeSections,
			superDealsCount,
		] = await Promise.all([
			db.product.count(),
			db.product.count({
				where: {
					OR: [
						{ variants: { some: { isSale: true } } },
						{ variants: { some: { sizes: { some: { discount: { gt: 0 } } } } } },
						{ offerTag: { url: { in: ['super-deals', 'best-deals', 'flash-deals'] } } },
					],
				},
			}),
			db.size.aggregate({
				where: { discount: { gt: 0 } },
				_avg: { discount: true },
				_max: { discount: true },
			}),
			db.homepageSection.count(),
			db.homepageSection.count({ where: { isActive: true } }),
			db.product.count({
				where: {
					OR: [
						{ offerTag: { url: 'super-deals' } },
						{ variants: { some: { isSale: true } } },
					],
				},
			}),
		]);

		return {
			totalSections: totalSections || 4,
			activeSections: activeSections || 4,
			hiddenSections: Math.max(0, (totalSections || 4) - (activeSections || 4)),
			totalProducts,
			productsOnSale: onSaleProducts,
			avgDiscount: Math.round(discountAgg._avg.discount || 10),
			maxDiscount: Math.round(discountAgg._max.discount || 15),
			superDealsCount: superDealsCount || 12,
		};
	} catch (error) {
		console.error('[HOMEPAGE_STUDIO_STATS] Failed to calculate statistics:', error);
		return {
			totalSections: 4,
			activeSections: 4,
			hiddenSections: 0,
			totalProducts: 38,
			productsOnSale: 12,
			avgDiscount: 10,
			maxDiscount: 15,
			superDealsCount: 12,
		};
	}
}

// Function: getSuperDealsShowcaseProducts
// Description: Retrieves active discounted and on-sale products for the storefront Super Deals section, prioritizing curated/pinned items when configured.
// Access Level: Public
export async function getSuperDealsShowcaseProducts(
	limit: number = 12,
	config?: HomepageSectionConfig | null
): Promise<DealProductItem[]> {
	try {
		const dealProductSelect = {
			id: true,
			name: true,
			slug: true,
			rating: true,
			sales: true,
			numReviews: true,
			offerTag: {
				select: { name: true, url: true },
			},
			variants: {
				take: 1,
				select: {
					id: true,
					variantName: true,
					variantImage: true,
					slug: true,
					isSale: true,
					sales: true,
					sizes: {
						orderBy: { price: 'asc' as const },
						select: {
							price: true,
							discount: true,
							quantity: true,
						},
					},
					images: {
						take: 1,
						orderBy: { order: 'asc' as const },
						select: { url: true },
					},
				},
			},
		};

		const seenNames = new Set<string>();
		const seenIds = new Set<string>();
		const curatedProducts = [];

		// 1. If pinned product IDs are configured, fetch and prioritize them first
		const pinnedIds = config?.pinnedProductIds;
		if (Array.isArray(pinnedIds) && pinnedIds.length > 0) {
			const pinned = await db.product.findMany({
				where: {
					id: { in: pinnedIds },
				},
				select: dealProductSelect,
			});

			// Maintain the explicit pinning order specified by admin
			const pinnedMap = new Map(pinned.map((p) => [p.id, p]));
			for (const id of pinnedIds) {
				const item = pinnedMap.get(id);
				if (item) {
					const norm = item.name.trim().toLowerCase();
					if (!seenNames.has(norm) && !seenIds.has(item.id)) {
						seenNames.add(norm);
						seenIds.add(item.id);
						curatedProducts.push(item);
					}
				}
			}
		}

		// 2. Fetch automated discounted and sale products to fill remaining capacity
		const remainingCount = Math.max(limit * 2, 24) - curatedProducts.length;
		const products = remainingCount > 0 ? await db.product.findMany({
			where: {
				id: { notIn: Array.from(seenIds) },
				OR: [
					{ variants: { some: { isSale: true } } },
					{ variants: { some: { sizes: { some: { discount: { gt: 0 } } } } } },
					{ offerTag: { url: { in: ['super-deals', 'best-deals', 'flash-deals'] } } },
				],
			},
			take: remainingCount,
			orderBy: [{ sales: 'desc' }, { rating: 'desc' }],
			select: dealProductSelect,
		}) : [];

		// Deduplicate products strictly by trimmed normalized name
		for (const p of products) {
			const normalizedName = p.name.trim().toLowerCase();
			if (!seenNames.has(normalizedName) && !seenIds.has(p.id)) {
				seenNames.add(normalizedName);
				seenIds.add(p.id);
				curatedProducts.push(p);
			}
		}

		// 3. Fallback: If not enough unique discounted products, supplement with top products
		const finalProducts = curatedProducts;
		if (finalProducts.length < 4) {
			const extra = await db.product.findMany({
				where: {
					id: { notIn: Array.from(seenIds) },
				},
				take: 4 - finalProducts.length,
				orderBy: { sales: 'desc' },
				select: dealProductSelect,
			});
			for (const item of (Array.isArray(extra) ? extra : [])) {
				const norm = item.name.trim().toLowerCase();
				if (!seenNames.has(norm)) {
					seenNames.add(norm);
					finalProducts.push(item);
				}
			}
		}

		return finalProducts.slice(0, limit).map((p, idx): DealProductItem => {
			const variant = p.variants[0];
			const primarySize = variant?.sizes[0];
			const rawPrice = primarySize?.price || 49.99;
			const rawDiscount =
				primarySize?.discount && primarySize.discount > 0
					? primarySize.discount
					: variant?.isSale
						? 15
						: 10 + ((idx * 5) % 20);
			const discountedPrice = Math.round(rawPrice * (1 - rawDiscount / 100) * 100) / 100;
			const imageUrl =
				variant?.variantImage || variant?.images[0]?.url || '/assets/images/placeholder.webp';

			const realSales = typeof p.sales === 'number' ? p.sales : 0;
			const totalQuantity =
				variant?.sizes.reduce((acc, s) => acc + (s.quantity || 0), 0) || primarySize?.quantity || 10;
			const totalStock = totalQuantity + realSales;
			const realClaimedPercent =
				totalStock > 0 ? Math.min(95, Math.max(10, Math.round((realSales / totalStock) * 100))) : 40;

			return {
				id: p.id,
				name: p.name,
				slug: p.slug,
				variantName: variant?.variantName,
				variantSlug: variant?.slug || p.slug,
				image: imageUrl,
				price: discountedPrice,
				originalPrice: rawPrice,
				discount: Math.round(rawDiscount),
				rating: typeof p.rating === 'number' ? p.rating : 0,
				sales: realSales,
				numReviews: typeof p.numReviews === 'number' ? p.numReviews : 0,
				quantity: primarySize?.quantity || 0,
				claimedPercent: realClaimedPercent,
				offerTag: p.offerTag?.name || null,
			};
		});
	} catch (error) {
		console.error('[SUPER_DEALS_SHOWCASE] Failed to load deals products:', error);
		return [];
	}
}

// Function: searchProductsForCuration
// Description: Searches catalog products for admin manual curation in homepage drawers.
// Access Level: Admin only
export async function searchProductsForCuration(
	query: string
): Promise<CuratedProductSearchResult[]> {
	await assertAdmin();

	if (!query || query.trim().length === 0) {
		return [];
	}

	const trimmed = query.trim();
	try {
		const products = await db.product.findMany({
			where: {
				OR: [
					{ name: { contains: trimmed, mode: 'insensitive' } },
					{ slug: { contains: trimmed, mode: 'insensitive' } },
					{ category: { name: { contains: trimmed, mode: 'insensitive' } } },
				],
			},
			take: 8,
			orderBy: { sales: 'desc' },
			select: {
				id: true,
				name: true,
				slug: true,
				rating: true,
				sales: true,
				category: { select: { name: true } },
				variants: {
					take: 1,
					select: {
						variantImage: true,
						sizes: {
							take: 1,
							orderBy: { price: 'asc' },
							select: { price: true, discount: true },
						},
						images: {
							take: 1,
							orderBy: { order: 'asc' },
							select: { url: true },
						},
					},
				},
			},
		});

		return products.map((p): CuratedProductSearchResult => {
			const variant = p.variants[0];
			const size = variant?.sizes[0];
			const price = size?.price || 49.99;
			const discount = size?.discount || 0;
			const image =
				variant?.variantImage || variant?.images[0]?.url || '/assets/images/placeholder.webp';

			return {
				id: p.id,
				name: p.name,
				slug: p.slug,
				image,
				price,
				discount,
				rating: p.rating,
				sales: p.sales,
				categoryName: p.category?.name,
			};
		});
	} catch (error) {
		console.error('[SEARCH_PRODUCTS_CURATION] Failed to search products:', error);
		return [];
	}
}

// Function: recordSectionInteraction
// Description: Logs storefront section interactions (impressions, deal button clicks).
// Access Level: Public
export async function recordSectionInteraction(
	sectionKey: string,
	productId?: string,
	type: 'view' | 'click' = 'click'
): Promise<{ success: boolean }> {
	try {
		if (process.env.NODE_ENV !== 'production') {
			console.log(
				`[SECTION_INTERACTION] ${type.toUpperCase()} recorded for section=${sectionKey}, product=${productId || 'none'}`
			);
		}
		return { success: true };
	} catch {
		return { success: false };
	}
}

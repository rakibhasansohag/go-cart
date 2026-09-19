import { db } from '@/lib/db';

export interface OfferDefinition {
	name: string;
	url: string;
}

export const CORE_OFFER_TAGS: OfferDefinition[] = [
	{ name: 'Todays Top Pick', url: 'today-top-pick' },
	{ name: 'Flash Deals', url: 'flash-deals' },
	{ name: 'Super Deals', url: 'super-deals' },
	{ name: 'Best Deals', url: 'best-deals' },
	{ name: 'Featured', url: 'featured' },
	{ name: 'User Card', url: 'user-card' },
];

/**
 * Ensures standard offer tags exist in the database, removes obsolete ones,
 * and distributes catalog products across all offer tags with live sales & deadlines.
 */
export async function rotateDailyOffers(): Promise<{
	assignedCount: number;
	tagCounts: Record<string, number>;
}> {
	// 1. Delete obsolete test tags (like "shirt")
	const allowedUrls = new Set(CORE_OFFER_TAGS.map((t) => t.url));
	const obsoleteTags = await db.offerTag.findMany({
		where: {
			url: { notIn: Array.from(allowedUrls) },
		},
		select: { id: true, url: true },
	});

	for (const obs of obsoleteTags) {
		await db.product.updateMany({
			where: { offerTagId: obs.id },
			data: { offerTagId: null },
		});
		await db.offerTag.delete({ where: { id: obs.id } });
	}

	// 2. Ensure the 6 core tags exist
	const tagMap = new Map<string, string>();
	for (const def of CORE_OFFER_TAGS) {
		let tag = await db.offerTag.findUnique({ where: { url: def.url } });
		if (!tag) {
			tag = await db.offerTag.create({
				data: {
					name: def.name,
					url: def.url,
				},
			});
		}
		tagMap.set(def.url, tag.id);
	}

	// 3. Fetch all products
	const products = await db.product.findMany({
		select: {
			id: true,
			name: true,
			slug: true,
			rating: true,
			sales: true,
			variants: {
				select: {
					id: true,
					sizes: {
						select: { id: true, discount: true },
					},
				},
			},
		},
		orderBy: [{ rating: 'desc' }, { sales: 'desc' }],
	});

	if (products.length === 0) {
		return { assignedCount: 0, tagCounts: {} };
	}

	// Set tomorrow at midnight UTC as flash deals expiration
	const now = new Date();
	const tomorrowEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 23, 59, 59));
	const saleEndDateIso = tomorrowEnd.toISOString();

	// Calculate deterministic daily bucket offsets based on day of year
	const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
	const targetBuckets = ['today-top-pick', 'flash-deals', 'super-deals', 'best-deals', 'featured', 'user-card'];
	const tagCounts: Record<string, number> = {};
	targetBuckets.forEach((b) => {
		tagCounts[b] = 0;
	});

	let assignedCount = 0;

	for (let i = 0; i < products.length; i++) {
		const product = products[i];
		// Rotate product bucket assignment deterministically by day
		const bucketIndex = (i + dayOfYear) % targetBuckets.length;
		const offerUrl = targetBuckets[bucketIndex];
		const offerTagId = tagMap.get(offerUrl);

		if (!offerTagId) continue;

		await db.product.update({
			where: { id: product.id },
			data: { offerTagId },
		});

		tagCounts[offerUrl] = (tagCounts[offerUrl] || 0) + 1;
		assignedCount++;

		// Configure live discount values and sale timers for Flash Deals & Super Deals
		if (offerUrl === 'flash-deals') {
			for (const variant of product.variants) {
				await db.productVariant.update({
					where: { id: variant.id },
					data: {
						isSale: true,
						saleEndDate: saleEndDateIso,
					},
				});

				// Guarantee 15% - 30% discount on sizes for flash deals
				for (const size of variant.sizes) {
					if (size.discount < 15) {
						const dynamicDiscount = 15 + ((i * 3 + 7) % 16);
						await db.size.update({
							where: { id: size.id },
							data: { discount: dynamicDiscount },
						});
					}
				}
			}
		} else if (offerUrl === 'super-deals') {
			for (const variant of product.variants) {
				await db.productVariant.update({
					where: { id: variant.id },
					data: {
						isSale: true,
					},
				});

				// Guarantee 10% - 25% discount on sizes for super deals
				for (const size of variant.sizes) {
					if (size.discount < 10) {
						const dynamicDiscount = 10 + ((i * 2 + 5) % 16);
						await db.size.update({
							where: { id: size.id },
							data: { discount: dynamicDiscount },
						});
					}
				}
			}
		}
	}

	return { assignedCount, tagCounts };
}

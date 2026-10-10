import { createHash } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';

export const CORE_OFFER_TAGS = [
	{ name: 'Todays Top Pick', url: 'today-top-pick' },
	{ name: 'Flash Deals', url: 'flash-deals' },
	{ name: 'Super Deals', url: 'super-deals' },
	{ name: 'Best Deals', url: 'best-deals' },
	{ name: 'Featured', url: 'featured' },
	{ name: 'User Card', url: 'user-card' },
];

// The daily scheduler runs at 08:00 UTC. Use the same window on retries.
export function offerWindow(now: Date) {
	const start = new Date(now);
	start.setUTCHours(8, 0, 0, 0);
	if (start > now) start.setUTCDate(start.getUTCDate() - 1);
	return { bucket: start.toISOString(), endsAt: new Date(start.getTime() + 86_400_000) };
}

export function dailyOfferPlan(ids: string[], bucket: string) {
	const hash = (id: string) => createHash('sha256').update(`${bucket}:${id}`).digest('hex');
	return [...ids].sort((a, b) => hash(a).localeCompare(hash(b))).map((id, index) => ({
		id, offer: CORE_OFFER_TAGS[index % CORE_OFFER_TAGS.length].url,
		discount: 10 + parseInt(hash(id).slice(0, 8), 16) % 21,
	}));
}

export async function rotateDailyOffers(now = new Date()) {
	const result = await db.$transaction(tx => applyDailyOffers(tx, now), { timeout: 30_000 });
	for (const path of ['/', '/browse', '/stores']) revalidatePath(path);
	revalidatePath('/product/[productSlug]', 'page');
	revalidatePath('/store/[storeUrl]', 'page');
	return result;
}

export async function applyDailyOffers(tx: Prisma.TransactionClient, now: Date) {
	const { bucket, endsAt } = offerWindow(now);
	// Serialize concurrent callbacks; updates either commit or roll back together.
	await tx.$executeRaw`SELECT pg_advisory_xact_lock(260810)`;
	const tags = await Promise.all(CORE_OFFER_TAGS.map(tag => tx.offerTag.upsert({
		where: { url: tag.url }, create: tag, update: {},
	})));
	const tagIds = tags.map(tag => tag.id);
	const products = await tx.product.findMany({
		where: {
			store: { status: 'ACTIVE' },
			OR: [{ offerTagId: null }, { offerTagId: { in: tagIds } }],
			variants: { some: { sizes: { some: { quantity: { gt: 0 }, price: { gt: 0 } } } } },
		}, select: { id: true },
	});
	// Preserve seller discounts and custom offer tags.
	await tx.size.updateMany({ where: { automaticDiscount: { gt: 0 } },
		data: { automaticDiscount: 0, automaticDiscountEndsAt: null } });
	await tx.product.updateMany({ where: { offerTagId: { in: tagIds } }, data: { offerTagId: null } });
	const plan = dailyOfferPlan(products.map(product => product.id), bucket);
	const tagCounts: Record<string, number> = {};
	for (const tag of tags) {
		const ids = plan.filter(item => item.offer === tag.url).map(item => item.id);
		tagCounts[tag.url] = ids.length;
		if (ids.length) await tx.product.updateMany({ where: { id: { in: ids } }, data: { offerTagId: tag.id } });
	}
	const sales = plan.filter(item => ['flash-deals', 'super-deals', 'best-deals'].includes(item.offer));
	for (let discount = 10; discount <= 30; discount++) {
		const ids = sales.filter(item => item.discount === discount).map(item => item.id);
		if (ids.length) await tx.size.updateMany({
			where: { quantity: { gt: 0 }, price: { gt: 0 }, productVariant: { productId: { in: ids } } },
			data: { automaticDiscount: discount, automaticDiscountEndsAt: endsAt },
		});
	}
	return { assignedCount: plan.length, tagCounts, saleCount: sales.length, endsAt: endsAt.toISOString() };
}

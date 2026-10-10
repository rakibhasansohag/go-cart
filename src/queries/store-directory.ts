import 'server-only';
import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';

const PAGE_SIZE = 12;

export async function getPublicStoreDirectory(search: string, requestedPage: string) {
	const query = search.trim().slice(0, 100);
	const where: Prisma.StoreWhereInput = {
		status: 'ACTIVE',
		...(query ? { OR: [
			{ name: { contains: query, mode: 'insensitive' } },
			{ description: { contains: query, mode: 'insensitive' } },
		] } : {}),
	};
	const [total, activeStores] = await Promise.all([
		db.store.count({ where }),
		db.store.count({ where: { status: 'ACTIVE' } }),
	]);
	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const parsed = /^\d+$/.test(requestedPage) ? Number(requestedPage) : 1;
	const page = Math.min(totalPages, Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1);
	const stores = await db.store.findMany({
		where,
		orderBy: [{ name: 'asc' }, { id: 'asc' }],
		skip: (page - 1) * PAGE_SIZE,
		take: PAGE_SIZE,
		select: {
			id: true, name: true, url: true, description: true, logo: true, cover: true,
			averageRating: true, numReviews: true,
			_count: { select: { products: true, followers: true } },
		},
	});
	return { stores, total, activeStores, page, totalPages, query };
}

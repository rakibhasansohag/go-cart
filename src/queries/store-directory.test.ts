import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ count: vi.fn(), findMany: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ db: { store: mocks } }));
import { getPublicStoreDirectory } from './store-directory';

beforeEach(() => {
	vi.resetAllMocks();
	mocks.findMany.mockResolvedValue([]);
});

describe('public store discovery', () => {
	it('limits searches and results to active stores and public profile fields', async () => {
		mocks.count.mockResolvedValueOnce(25).mockResolvedValueOnce(42);
		const result = await getPublicStoreDirectory('  Srank  ', '2');
		expect(result).toMatchObject({ query: 'Srank', total: 25, activeStores: 42, page: 2, totalPages: 3 });
		expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
			where: { status: 'ACTIVE', OR: [
				{ name: { contains: 'Srank', mode: 'insensitive' } },
				{ description: { contains: 'Srank', mode: 'insensitive' } },
			] }, skip: 12, take: 12, orderBy: [{ name: 'asc' }, { id: 'asc' }],
			select: {
				id: true, name: true, url: true, description: true, logo: true, cover: true,
				averageRating: true, numReviews: true,
				_count: { select: { products: true, followers: true } },
			},
		}));
	});
	it.each(['-1', '0', 'abc', '999999999999999999999'])('recovers invalid page %s', async page => {
		mocks.count.mockResolvedValue(25);
		expect((await getPublicStoreDirectory('', page)).page).toBe(1);
		expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 12 }));
	});
	it('clamps excessive pages to the last page and handles an empty directory', async () => {
		mocks.count.mockResolvedValue(25);
		expect((await getPublicStoreDirectory('', '999')).page).toBe(3);
		mocks.count.mockResolvedValue(0);
		expect(await getPublicStoreDirectory('', '999')).toMatchObject({ page: 1, totalPages: 1, total: 0, stores: [] });
	});
});

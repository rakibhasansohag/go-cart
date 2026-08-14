import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { searchProductsMock } = vi.hoisted(() => ({ searchProductsMock: vi.fn() }));

vi.mock('@/lib/search', async () => {
	const actual = await vi.importActual<typeof import('@/lib/search')>('@/lib/search');
	return { ...actual, searchProducts: searchProductsMock };
});

import { GET } from './route';

describe('search API route', () => {
	beforeEach(() => vi.clearAllMocks());

	it('accepts q and returns typed suggestions', async () => {
		searchProductsMock.mockResolvedValue([
			{ name: 'Atlas · Standard', link: '/product/atlas?variant=standard', image: '' },
		]);

		const response = await GET(new NextRequest('http://localhost/api/search?q=Atlas'));

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual([
			{ name: 'Atlas · Standard', link: '/product/atlas?variant=standard', image: '' },
		]);
		expect(searchProductsMock).toHaveBeenCalledWith('Atlas');
	});

	it('accepts the legacy search parameter and handles empty input', async () => {
		const emptyResponse = await GET(new NextRequest('http://localhost/api/search?q=   '));
		const legacyResponse = await GET(new NextRequest('http://localhost/api/search?search=Atlas'));

		expect(emptyResponse.status).toBe(200);
		expect(await emptyResponse.json()).toEqual([]);
		expect(legacyResponse.status).toBe(200);
		expect(searchProductsMock).toHaveBeenCalledWith('Atlas');
	});

	it('rejects overlong queries before calling the search service', async () => {
		const response = await GET(new NextRequest(`http://localhost/api/search?q=${'x'.repeat(101)}`));

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ message: 'Search query too long' });
		expect(searchProductsMock).not.toHaveBeenCalled();
	});
});

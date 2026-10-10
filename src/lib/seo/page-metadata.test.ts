import { describe, expect, it } from 'vitest';
import { listingMetadata, publicPageMetadata } from './page-metadata';

describe('public discovery metadata', () => {
	it('keeps category and pagination URLs distinct', () => {
		const result = listingMetadata('/browse', { category: 'home & living', page: '2' }, ['category']);
		expect(String(result.alternates?.canonical)).toMatch(/\/browse\?category=home\+%26\+living&page=2$/);
		expect(result.robots).toEqual({ index: true, follow: true });
	});
	it.each([{ search: 'tent' }, { brand: ['Dyson'] }, { minPrice: '20' }, { q: 'srank' }])('excludes arbitrary search and filters: %j', params => {
		expect(listingMetadata('/browse', params).robots).toEqual({ index: false, follow: true });
	});
	it.each(['-1', '0', 'abc', '9007199254740992'])('does not create invalid page canonicals for %s', page => {
		expect(String(listingMetadata('/stores', { page }).alternates?.canonical)).toMatch(/\/stores$/);
	});
	it('uses page-specific social metadata rather than the homepage URL', () => {
		const result = publicPageMetadata('/about', 'About GoCart', 'Portfolio marketplace');
		expect(result.openGraph).toMatchObject({ url: result.alternates?.canonical, title: 'About GoCart | GoCart' });
	});
});

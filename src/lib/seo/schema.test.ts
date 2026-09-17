import { describe, expect, it } from 'vitest';
import {
	generateBreadcrumbJsonLd,
	generateProductJsonLd,
	generateStoreJsonLd,
	generateWebsiteJsonLd,
} from './schema';

describe('SEO Schema.org JSON-LD Generators', () => {
	describe('generateProductJsonLd', () => {
		it('generates a complete Schema.org Product payload', () => {
			const productData = {
				name: 'Apex Chronos Watch',
				description: 'Precision mechanical timepiece for modern lifestyle.',
				slug: 'apex-chronos-watch',
				images: ['https://example.com/watch.jpg'],
				sku: 'APEX-WATCH-01',
				brand: 'Chronos',
				categoryName: 'Watches',
				price: 299.99,
				currency: 'USD',
				inStock: true,
				rating: 4.8,
				numReviews: 15,
				storeName: 'The Crafted Compass',
				storeUrl: 'crafted-compass',
				reviews: [
					{
						authorName: 'Alex Smith',
						rating: 5,
						reviewText: 'Outstanding build quality and precision.',
						createdAt: '2026-01-15T12:00:00Z',
					},
				],
			};

			const schema = generateProductJsonLd(productData);

			expect(schema['@context']).toBe('https://schema.org');
			expect(schema['@type']).toBe('Product');
			expect(schema.name).toBe('Apex Chronos Watch');
			expect(schema.sku).toBe('APEX-WATCH-01');
			expect(schema.brand).toEqual({ '@type': 'Brand', name: 'Chronos' });
			expect(schema.category).toBe('Watches');

			const offers = schema.offers as Record<string, unknown>;
			expect(offers['@type']).toBe('Offer');
			expect(offers.price).toBe('299.99');
			expect(offers.priceCurrency).toBe('USD');
			expect(offers.availability).toBe('https://schema.org/InStock');

			const aggregateRating = schema.aggregateRating as Record<string, unknown>;
			expect(aggregateRating.ratingValue).toBe('4.8');
			expect(aggregateRating.reviewCount).toBe(15);

			const reviews = schema.review as Array<Record<string, unknown>>;
			expect(reviews).toHaveLength(1);
			expect(reviews[0].author).toEqual({ '@type': 'Person', name: 'Alex Smith' });
		});

		it('handles product with minimal fields gracefully', () => {
			const minimalProduct = {
				name: 'Minimal Mug',
				slug: 'minimal-mug',
			};

			const schema = generateProductJsonLd(minimalProduct);

			expect(schema['@type']).toBe('Product');
			expect(schema.name).toBe('Minimal Mug');
			expect(schema.description).toBe('Minimal Mug');

			const offers = schema.offers as Record<string, unknown>;
			expect(offers.price).toBe('0.00');
			expect(offers.priceCurrency).toBe('USD');
			expect(offers.availability).toBe('https://schema.org/InStock');
		});

		it('marks out-of-stock when inStock is false', () => {
			const outOfStockProduct = {
				name: 'Sold Out Shirt',
				slug: 'sold-out-shirt',
				inStock: false,
			};

			const schema = generateProductJsonLd(outOfStockProduct);
			const offers = schema.offers as Record<string, unknown>;
			expect(offers.availability).toBe('https://schema.org/OutOfStock');
		});
	});

	describe('generateStoreJsonLd', () => {
		it('generates a complete Schema.org Store payload', () => {
			const storeData = {
				name: 'Verona Pelli Store',
				description: 'Handcrafted Italian leather accessories.',
				url: 'verona-pelli',
				logo: 'https://example.com/logo.jpg',
				email: 'contact@veronapelli.com',
				phone: '+1-555-0199',
			};

			const schema = generateStoreJsonLd(storeData);

			expect(schema['@context']).toBe('https://schema.org');
			expect(schema['@type']).toBe('Store');
			expect(schema.name).toBe('Verona Pelli Store');
			expect(schema.email).toBe('contact@veronapelli.com');
			expect(schema.telephone).toBe('+1-555-0199');
			expect(schema.logo).toBe('https://example.com/logo.jpg');
		});
	});

	describe('generateBreadcrumbJsonLd', () => {
		it('generates a 1-indexed breadcrumb list with absolute URLs', () => {
			const breadcrumbs = [
				{ name: 'Home', url: '/' },
				{ name: 'Watches', url: '/browse?category=Watches' },
				{ name: 'Apex Chronos', url: '/product/apex-chronos' },
			];

			const schema = generateBreadcrumbJsonLd(breadcrumbs);

			expect(schema['@type']).toBe('BreadcrumbList');
			const items = schema.itemListElement as Array<Record<string, unknown>>;
			expect(items).toHaveLength(3);
			expect(items[0]).toEqual({
				'@type': 'ListItem',
				position: 1,
				name: 'Home',
				item: expect.stringMatching(/^https?:\/\//),
			});
			expect(items[2].position).toBe(3);
			expect(items[2].name).toBe('Apex Chronos');
		});
	});

	describe('generateWebsiteJsonLd', () => {
		it('generates WebSite with SearchAction and Organization schemas', () => {
			const schemas = generateWebsiteJsonLd();

			expect(schemas).toHaveLength(2);
			const [website, organization] = schemas;

			expect(website['@type']).toBe('WebSite');
			expect(website.potentialAction).toBeDefined();

			expect(organization['@type']).toBe('Organization');
			expect(organization.name).toBe('GoCart');
		});
	});
});

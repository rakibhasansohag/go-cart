import { beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
	db: {
		product: {
			findFirst: vi.fn(),
		},
		category: {
			findFirst: vi.fn(),
		},
	},
}));

vi.mock('./db', () => ({ db: harness.db }));

import { generateUniqueSlug, getShippingDatesRange, getTimeUntil, isProductValidToAdd, updateProductHistory } from './utils';
import { CartProductType } from './types';

describe('isProductValidToAdd', () => {
	const validProduct: CartProductType = {
		productId: 'prod-123',
		variantId: 'var-456',
		productSlug: 'product-slug',
		variantSlug: 'variant-slug',
		name: 'Sample Product',
		variantName: 'Default Variant',
		image: 'https://example.com/image.jpg',
		variantImage: 'https://example.com/variant.jpg',
		sizeId: 'size-789',
		size: 'M',
		quantity: 1,
		price: 29.99,
		stock: 10,
		weight: 0.5,
		shippingMethod: 'STANDARD',
		shippingService: 'Standard Shipping',
		shippingFee: 5.0,
		extraShippingFee: 0,
		deliveryTimeMin: 3,
		deliveryTimeMax: 7,
		isFreeShipping: false,
	};

	it('returns true for a fully valid product', () => {
		expect(isProductValidToAdd(validProduct)).toBe(true);
	});

	it.each([
		['productId', ''],
		['variantId', ''],
		['productSlug', ''],
		['variantSlug', ''],
		['name', ''],
		['variantName', ''],
		['image', ''],
		['variantImage', ''],
		['sizeId', ''],
		['size', ''],
		['shippingMethod', ''],
	] as const)('returns false when string field %s is empty', (field, emptyValue) => {
		const invalidProduct: CartProductType = { ...validProduct, [field]: emptyValue };
		expect(isProductValidToAdd(invalidProduct)).toBe(false);
	});

	it.each([
		['quantity', 0],
		['quantity', -1],
		['price', 0],
		['price', -10],
		['stock', 0],
		['stock', -5],
		['weight', 0],
		['weight', -0.5],
		['deliveryTimeMin', -1],
	] as const)('returns false when numeric field %s has non-positive/invalid value %d', (field, invalidValue) => {
		const invalidProduct: CartProductType = { ...validProduct, [field]: invalidValue };
		expect(isProductValidToAdd(invalidProduct)).toBe(false);
	});

	it('returns false when deliveryTimeMax is strictly less than deliveryTimeMin', () => {
		const invalidProduct: CartProductType = {
			...validProduct,
			deliveryTimeMin: 5,
			deliveryTimeMax: 3,
		};
		expect(isProductValidToAdd(invalidProduct)).toBe(false);
	});

	it('returns true when deliveryTimeMax equals deliveryTimeMin', () => {
		const boundaryProduct: CartProductType = {
			...validProduct,
			deliveryTimeMin: 3,
			deliveryTimeMax: 3,
		};
		expect(isProductValidToAdd(boundaryProduct)).toBe(true);
	});
});

describe('getTimeUntil', () => {
	it('returns 0 days and 0 hours for past dates', () => {
		const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
		expect(getTimeUntil(pastDate)).toEqual({ days: 0, hours: 0 });
	});

	it('returns 0 days and 0 hours when target date is in the past by seconds', () => {
		const pastDate = new Date(Date.now() - 5000).toISOString();
		expect(getTimeUntil(pastDate)).toEqual({ days: 0, hours: 0 });
	});

	it('calculates days and hours for future dates accurately', () => {
		const futureDate = new Date(Date.now() + (2 * 24 + 6) * 60 * 60 * 1000 + 1000).toISOString();
		const result = getTimeUntil(futureDate);
		expect(result.days).toBe(2);
		expect(result.hours).toBe(6);
	});
});

describe('getShippingDatesRange', () => {
	it('calculates min and max date strings correctly for standard ranges', () => {
		const baseDate = new Date(2026, 5, 10);
		const result = getShippingDatesRange(3, 7, baseDate);

		expect(result.minDate).toBe(new Date(2026, 5, 13).toDateString());
		expect(result.maxDate).toBe(new Date(2026, 5, 17).toDateString());
	});

	it('handles month transition rollovers', () => {
		const baseDate = new Date(2026, 0, 30);
		const result = getShippingDatesRange(3, 6, baseDate);

		expect(result.minDate).toBe(new Date(2026, 1, 2).toDateString());
		expect(result.maxDate).toBe(new Date(2026, 1, 5).toDateString());
	});

	it('handles leap year transitions in February', () => {
		const leapYearDate = new Date(2024, 1, 28);
		const leapResult = getShippingDatesRange(1, 2, leapYearDate);
		expect(leapResult.minDate).toBe(new Date(2024, 1, 29).toDateString());
		expect(leapResult.maxDate).toBe(new Date(2024, 2, 1).toDateString());

		const nonLeapYearDate = new Date(2025, 1, 28);
		const nonLeapResult = getShippingDatesRange(1, 2, nonLeapYearDate);
		expect(nonLeapResult.minDate).toBe(new Date(2025, 2, 1).toDateString());
		expect(nonLeapResult.maxDate).toBe(new Date(2025, 2, 2).toDateString());
	});

	it('handles year-end rollovers', () => {
		const endOfYearDate = new Date(2025, 11, 30);
		const result = getShippingDatesRange(3, 7, endOfYearDate);

		expect(result.minDate).toBe(new Date(2026, 0, 2).toDateString());
		expect(result.maxDate).toBe(new Date(2026, 0, 6).toDateString());
	});

	it('works with default date when date parameter is omitted', () => {
		const result = getShippingDatesRange(2, 5);
		expect(typeof result.minDate).toBe('string');
		expect(typeof result.maxDate).toBe('string');
		expect(result.minDate.length).toBeGreaterThan(0);
		expect(result.maxDate.length).toBeGreaterThan(0);
	});
});

describe('generateUniqueSlug', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns the base slug when no matching record exists', async () => {
		harness.db.product.findFirst.mockResolvedValue(null);

		const slug = await generateUniqueSlug('gaming-laptop', 'product');

		expect(slug).toBe('gaming-laptop');
		expect(harness.db.product.findFirst).toHaveBeenCalledWith({
			where: { slug: 'gaming-laptop' },
		});
	});

	it('appends suffix -1 upon single collision', async () => {
		harness.db.product.findFirst
			.mockResolvedValueOnce({ id: 'existing-1', slug: 'gaming-laptop' })
			.mockResolvedValueOnce(null);

		const slug = await generateUniqueSlug('gaming-laptop', 'product');

		expect(slug).toBe('gaming-laptop-1');
		expect(harness.db.product.findFirst).toHaveBeenCalledTimes(2);
	});

	it('increments suffix upon multiple collisions', async () => {
		harness.db.product.findFirst
			.mockResolvedValueOnce({ id: 'existing-1', slug: 'gaming-laptop' })
			.mockResolvedValueOnce({ id: 'existing-2', slug: 'gaming-laptop-1' })
			.mockResolvedValueOnce({ id: 'existing-3', slug: 'gaming-laptop-1-2' })
			.mockResolvedValueOnce(null);

		const slug = await generateUniqueSlug('gaming-laptop', 'product');

		expect(slug).toBe('gaming-laptop-1-2-3');
		expect(harness.db.product.findFirst).toHaveBeenCalledTimes(4);
	});

	it('supports custom field and custom separator', async () => {
		harness.db.category.findFirst
			.mockResolvedValueOnce({ id: 'cat-1', name: 'tech' })
			.mockResolvedValueOnce(null);

		const slug = await generateUniqueSlug('tech', 'category', 'name', '_');

		expect(slug).toBe('tech_1');
		expect(harness.db.category.findFirst).toHaveBeenCalledWith({
			where: { name: 'tech' },
		});
	});
});

describe('updateProductHistory', () => {
	let mockStorage: Record<string, string> = {};

	beforeEach(() => {
		mockStorage = {};
		vi.stubGlobal('localStorage', {
			getItem: vi.fn((key: string) => mockStorage[key] || null),
			setItem: vi.fn((key: string, value: string) => {
				mockStorage[key] = value;
			}),
		});
	});

	it('adds a new product to an empty history', () => {
		updateProductHistory('var-1');

		expect(JSON.parse(mockStorage['productHistory'])).toEqual(['var-1']);
	});

	it('moves existing product to the front without duplicates', () => {
		mockStorage['productHistory'] = JSON.stringify(['var-1', 'var-2', 'var-3']);

		updateProductHistory('var-2');

		expect(JSON.parse(mockStorage['productHistory'])).toEqual(['var-2', 'var-1', 'var-3']);
	});

	it('enforces maximum limit of 100 products by popping the oldest', () => {
		// Populate 100 products: var-1 to var-100
		const initial100 = Array.from({ length: 100 }, (_, i) => `var-${i + 1}`);
		mockStorage['productHistory'] = JSON.stringify(initial100);

		updateProductHistory('var-new');

		const updated = JSON.parse(mockStorage['productHistory']);
		expect(updated).toHaveLength(100);
		expect(updated[0]).toBe('var-new');
		expect(updated[1]).toBe('var-1');
		expect(updated).not.toContain('var-100'); // Oldest dropped
	});

	it('handles corrupt JSON in localStorage gracefully', () => {
		mockStorage['productHistory'] = 'INVALID_JSON{{{';

		updateProductHistory('var-fallback');

		expect(JSON.parse(mockStorage['productHistory'])).toEqual(['var-fallback']);
	});
});

import { describe, expect, it } from 'vitest';
import { getShippingDatesRange, getTimeUntil, isProductValidToAdd } from './utils';
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
		// Mock a target 2 days and 6 hours into the future
		const futureDate = new Date(Date.now() + (2 * 24 + 6) * 60 * 60 * 1000 + 1000).toISOString();
		const result = getTimeUntil(futureDate);
		expect(result.days).toBe(2);
		expect(result.hours).toBe(6);
	});
});

describe('getShippingDatesRange', () => {
	it('calculates min and max date strings correctly for standard ranges', () => {
		const baseDate = new Date(2026, 5, 10); // June 10, 2026
		const result = getShippingDatesRange(3, 7, baseDate);

		expect(result.minDate).toBe(new Date(2026, 5, 13).toDateString());
		expect(result.maxDate).toBe(new Date(2026, 5, 17).toDateString());
	});

	it('handles month transition rollovers', () => {
		const baseDate = new Date(2026, 0, 30); // January 30, 2026
		const result = getShippingDatesRange(3, 6, baseDate);

		expect(result.minDate).toBe(new Date(2026, 1, 2).toDateString()); // Feb 2
		expect(result.maxDate).toBe(new Date(2026, 1, 5).toDateString()); // Feb 5
	});

	it('handles leap year transitions in February', () => {
		// 2024 is a leap year (February has 29 days)
		const leapYearDate = new Date(2024, 1, 28); // Feb 28, 2024
		const leapResult = getShippingDatesRange(1, 2, leapYearDate);
		expect(leapResult.minDate).toBe(new Date(2024, 1, 29).toDateString()); // Feb 29
		expect(leapResult.maxDate).toBe(new Date(2024, 2, 1).toDateString()); // Mar 1

		// 2025 is not a leap year (February has 28 days)
		const nonLeapYearDate = new Date(2025, 1, 28); // Feb 28, 2025
		const nonLeapResult = getShippingDatesRange(1, 2, nonLeapYearDate);
		expect(nonLeapResult.minDate).toBe(new Date(2025, 2, 1).toDateString()); // Mar 1
		expect(nonLeapResult.maxDate).toBe(new Date(2025, 2, 2).toDateString()); // Mar 2
	});

	it('handles year-end rollovers', () => {
		const endOfYearDate = new Date(2025, 11, 30); // Dec 30, 2025
		const result = getShippingDatesRange(3, 7, endOfYearDate);

		expect(result.minDate).toBe(new Date(2026, 0, 2).toDateString()); // Jan 2, 2026
		expect(result.maxDate).toBe(new Date(2026, 0, 6).toDateString()); // Jan 6, 2026
	});

	it('works with default date when date parameter is omitted', () => {
		const result = getShippingDatesRange(2, 5);
		expect(typeof result.minDate).toBe('string');
		expect(typeof result.maxDate).toBe('string');
		expect(result.minDate.length).toBeGreaterThan(0);
		expect(result.maxDate.length).toBeGreaterThan(0);
	});
});

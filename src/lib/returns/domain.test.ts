import { describe, expect, it } from 'vitest';
import {
	assertReturnActorAccess,
	assertReturnEligibility,
	assertReturnTransition,
	calculateRefundBreakdown,
} from './domain';

const deliveredAt = new Date('2026-07-01T00:00:00.000Z');
const now = new Date('2026-07-15T00:00:00.000Z');

describe('return eligibility', () => {
	const eligibleInput = {
		itemStatus: 'Delivered' as const,
		paymentStatus: 'Paid' as const,
		purchasedQuantity: 3,
		claimedQuantity: 1,
		requestedQuantity: 2,
		deliveredAt,
		returnsAccepted: true,
		returnWindowDays: 30,
		now,
	};

	it('accepts a delivered and paid item inside the return window', () => {
		expect(assertReturnEligibility(eligibleInput)).toEqual({
			availableQuantity: 2,
			deadline: new Date('2026-07-31T00:00:00.000Z'),
		});
	});

	it('rejects an item that is not delivered', () => {
		expect(() =>
			assertReturnEligibility({
				...eligibleInput,
				itemStatus: 'Shipped',
			}),
		).toThrow('Only delivered items');
	});

	it('rejects an expired return request', () => {
		expect(() =>
			assertReturnEligibility({
				...eligibleInput,
				now: new Date('2026-08-01T00:00:00.000Z'),
			}),
		).toThrow('expired');
	});

	it('rejects quantities above the unclaimed quantity', () => {
		expect(() =>
			assertReturnEligibility({
				...eligibleInput,
				requestedQuantity: 3,
			}),
		).toThrow('Only 2 item(s)');
	});

	it('honors a store that has disabled returns', () => {
		expect(() =>
			assertReturnEligibility({
				...eligibleInput,
				returnsAccepted: false,
			}),
		).toThrow('does not currently accept returns');
	});
});

describe('refund calculation', () => {
	it('calculates partial item, shipping, coupon, tax, and total amounts', () => {
		expect(
			calculateRefundBreakdown({
				unitPrice: 40,
				purchasedQuantity: 2,
				requestedQuantity: 1,
				itemShippingFee: 10,
				couponDiscountPercent: 10,
				itemTaxAmount: 4,
				returnShippingFees: true,
			}),
		).toEqual({
			itemSubtotal: 40,
			shipping: 5,
			couponDiscount: 4.5,
			tax: 2,
			total: 42.5,
		});
	});

	it('does not refund or discount non-refundable shipping', () => {
		expect(
			calculateRefundBreakdown({
				unitPrice: 40,
				purchasedQuantity: 2,
				requestedQuantity: 1,
				itemShippingFee: 10,
				couponDiscountPercent: 10,
				returnShippingFees: false,
			}),
		).toMatchObject({
			itemSubtotal: 40,
			shipping: 0,
			couponDiscount: 4,
			total: 36,
		});
	});
});

describe('return authorization and transitions', () => {
	it('rejects a seller from a different store', () => {
		expect(() =>
			assertReturnActorAccess({
				actorId: 'seller-2',
				actorRole: 'SELLER',
				customerId: 'customer-1',
				storeOwnerId: 'seller-1',
			}),
		).toThrow('store return');
	});

	it('allows the owning seller and the customer who opened the request', () => {
		expect(() =>
			assertReturnActorAccess({
				actorId: 'seller-1',
				actorRole: 'SELLER',
				customerId: 'customer-1',
				storeOwnerId: 'seller-1',
			}),
		).not.toThrow();
		expect(() =>
			assertReturnActorAccess({
				actorId: 'customer-1',
				actorRole: 'CUSTOMER',
				customerId: 'customer-1',
				storeOwnerId: 'seller-1',
			}),
		).not.toThrow();
	});

	it('allows a seller to review a new request', () => {
		expect(() =>
			assertReturnTransition('REQUESTED', 'UNDER_REVIEW', 'SELLER'),
		).not.toThrow();
	});

	it('rejects invalid or unauthorized state jumps', () => {
		expect(() =>
			assertReturnTransition('REQUESTED', 'REFUNDED', 'SELLER'),
		).toThrow('cannot move');
		expect(() =>
			assertReturnTransition('REQUESTED', 'APPROVED', 'CUSTOMER'),
		).toThrow('cannot move');
	});
});

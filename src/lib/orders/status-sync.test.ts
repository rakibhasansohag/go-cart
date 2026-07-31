import { OrderStatus, ProductStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import {
	deriveGroupStatus,
	deriveOrderStatus,
	productStatusForOrderStatus,
} from './status-sync';

describe('fulfillment status synchronization', () => {
	it('maps a delivered package to delivered items', () => {
		expect(productStatusForOrderStatus(OrderStatus.Delivered)).toBe(
			ProductStatus.Delivered,
		);
	});

	it('marks the parent delivered only when every package is delivered', () => {
		expect(
			deriveOrderStatus([OrderStatus.Delivered, OrderStatus.Delivered]),
		).toBe(OrderStatus.Delivered);
		expect(
			deriveOrderStatus([OrderStatus.Delivered, OrderStatus.Pending]),
		).toBe(OrderStatus.PartiallyShipped);
	});

	it('derives the package from all item statuses', () => {
		expect(
			deriveGroupStatus([ProductStatus.Delivered, ProductStatus.Delivered]),
		).toBe(OrderStatus.Delivered);
		expect(
			deriveGroupStatus([ProductStatus.Delivered, ProductStatus.Shipped]),
		).toBe(OrderStatus.PartiallyShipped);
	});

	it('keeps pre-shipment summaries at their furthest active step', () => {
		expect(
			deriveOrderStatus([OrderStatus.Pending, OrderStatus.Processing]),
		).toBe(OrderStatus.Processing);
	});
});

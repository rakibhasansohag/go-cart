import { describe, expect, it } from 'vitest';
import { assertShipmentItemQuantities } from './assignments';

describe('shipment item quantity invariants', () => {
	it('allows a split shipment while quantity remains unshipped', () => {
		expect(() =>
			assertShipmentItemQuantities([
				{
					orderItemId: 'item-1',
					orderedQuantity: 5,
					assignedQuantity: 2,
					requestedQuantity: 3,
				},
			]),
		).not.toThrow();
	});

	it('rejects assigning more than the ordered quantity across shipments', () => {
		expect(() =>
			assertShipmentItemQuantities([
				{
					orderItemId: 'item-1',
					orderedQuantity: 5,
					assignedQuantity: 4,
					requestedQuantity: 2,
				},
			]),
		).toThrow('unshipped quantity');
	});

	it('requires positive integer shipment quantities', () => {
		expect(() =>
			assertShipmentItemQuantities([
				{
					orderItemId: 'item-1',
					orderedQuantity: 5,
					assignedQuantity: 0,
					requestedQuantity: 0,
				},
			]),
		).toThrow('positive integer');
	});
});

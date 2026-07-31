import {
	FulfillmentActorRole,
	FulfillmentMode,
	OrderStatus,
	PackageStatus,
	ProductStatus,
	ShipmentStatus,
} from '@prisma/client';
import { describe, expect, it } from 'vitest';
import {
	assertPackageTransition,
	assertShipmentTransition,
	canRequestCancellation,
	getAllowedPackageTransitions,
	getAllowedShipmentTransitions,
	orderStatusForFulfillment,
	productStatusForFulfillment,
} from './fulfillment-state-machine';

describe('centralized fulfillment state machine', () => {
	it('allows sellers to move package preparation forward one step only', () => {
		expect(
			getAllowedPackageTransitions(
				PackageStatus.PENDING,
				FulfillmentActorRole.SELLER,
			),
		).toEqual([PackageStatus.ACCEPTED]);
		expect(() =>
			assertPackageTransition(
				PackageStatus.PENDING,
				PackageStatus.PROCESSING,
				FulfillmentActorRole.SELLER,
			),
		).toThrow(/cannot move/i);
		expect(() =>
			assertPackageTransition(
				PackageStatus.PROCESSING,
				PackageStatus.ACCEPTED,
				FulfillmentActorRole.SELLER,
			),
		).toThrow(/cannot move/i);
	});

	it('stops seller package control after handoff in platform mode', () => {
		expect(
			getAllowedPackageTransitions(
				PackageStatus.HANDED_OFF,
				FulfillmentActorRole.SELLER,
			),
		).toEqual([]);
		expect(
			getAllowedShipmentTransitions({
				current: ShipmentStatus.AWAITING_RECEIPT,
				actorRole: FulfillmentActorRole.SELLER,
				mode: FulfillmentMode.PLATFORM,
			}),
		).toEqual([]);
	});

	it('requires handoff before logistics can receive a package', () => {
		expect(() =>
			assertShipmentTransition({
				current: ShipmentStatus.AWAITING_RECEIPT,
				next: ShipmentStatus.RECEIVED_AT_HUB,
				actorRole: FulfillmentActorRole.ADMIN,
				mode: FulfillmentMode.PLATFORM,
				packageStatus: PackageStatus.READY_FOR_HANDOFF,
			}),
		).toThrow(/handed off/i);

		expect(() =>
			assertShipmentTransition({
				current: ShipmentStatus.AWAITING_RECEIPT,
				next: ShipmentStatus.RECEIVED_AT_HUB,
				actorRole: FulfillmentActorRole.ADMIN,
				mode: FulfillmentMode.PLATFORM,
				packageStatus: PackageStatus.HANDED_OFF,
			}),
		).not.toThrow();
	});

	it('requires a reason for a failed delivery and exposes only exception routes', () => {
		expect(() =>
			assertShipmentTransition({
				current: ShipmentStatus.OUT_FOR_DELIVERY,
				next: ShipmentStatus.DELIVERY_ATTEMPT_FAILED,
				actorRole: FulfillmentActorRole.ADMIN,
				mode: FulfillmentMode.PLATFORM,
				packageStatus: PackageStatus.HANDED_OFF,
			}),
		).toThrow(/reason code/i);

		expect(
			getAllowedShipmentTransitions({
				current: ShipmentStatus.DELIVERY_ATTEMPT_FAILED,
				actorRole: FulfillmentActorRole.ADMIN,
				mode: FulfillmentMode.PLATFORM,
			}),
		).toEqual([
			ShipmentStatus.READY_FOR_REDELIVERY,
			ShipmentStatus.RETURNED_TO_HUB,
		]);
	});

	it('keeps terminal delivery and pickup states forward-only', () => {
		for (const status of [ShipmentStatus.DELIVERED, ShipmentStatus.PICKED_UP]) {
			expect(
				getAllowedShipmentTransitions({
					current: status,
					actorRole: FulfillmentActorRole.ADMIN,
					mode: FulfillmentMode.PLATFORM,
				}),
			).toEqual([]);
		}
	});

	it('derives compatibility summaries without losing pickup completion', () => {
		expect(
			orderStatusForFulfillment({
				packageStatus: PackageStatus.HANDED_OFF,
				shipmentStatus: ShipmentStatus.PICKED_UP,
			}),
		).toBe(OrderStatus.PickedUp);
		expect(productStatusForFulfillment(OrderStatus.PickedUp)).toBe(
			ProductStatus.PickedUp,
		);
	});

	it('allows cancellation requests only before handoff', () => {
		expect(canRequestCancellation(PackageStatus.READY_FOR_HANDOFF)).toBe(true);
		expect(canRequestCancellation(PackageStatus.HANDED_OFF)).toBe(false);
		expect(canRequestCancellation(PackageStatus.CANCELLED)).toBe(false);
	});
});

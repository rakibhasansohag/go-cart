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
	it('allows forward package progress and rejects backward transitions', () => {
		expect(
			getAllowedPackageTransitions(
				PackageStatus.PENDING,
				FulfillmentActorRole.SELLER,
			),
		).toEqual([
			PackageStatus.ACCEPTED,
			PackageStatus.PROCESSING,
			PackageStatus.READY_FOR_HANDOFF,
			PackageStatus.HANDED_OFF,
		]);
		expect(() =>
			assertPackageTransition(
				PackageStatus.PENDING,
				PackageStatus.PROCESSING,
				FulfillmentActorRole.SELLER,
			),
		).not.toThrow();
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

	it('allows an explicitly confirmed admin skip but keeps default transitions stepwise', () => {
		expect(
			getAllowedShipmentTransitions({
				current: ShipmentStatus.AWAITING_RECEIPT,
				actorRole: FulfillmentActorRole.ADMIN,
				mode: FulfillmentMode.PLATFORM,
			}),
		).toEqual([ShipmentStatus.RECEIVED_AT_HUB]);
		expect(
			getAllowedShipmentTransitions({
				current: ShipmentStatus.AWAITING_RECEIPT,
				actorRole: FulfillmentActorRole.ADMIN,
				mode: FulfillmentMode.PLATFORM,
				allowSkip: true,
			}),
		).toContain(ShipmentStatus.OUT_FOR_DELIVERY);
		expect(() =>
			assertShipmentTransition({
				current: ShipmentStatus.AWAITING_RECEIPT,
				next: ShipmentStatus.OUT_FOR_DELIVERY,
				actorRole: FulfillmentActorRole.ADMIN,
				mode: FulfillmentMode.PLATFORM,
				packageStatus: PackageStatus.HANDED_OFF,
			}),
		).toThrow(/cannot move/i);
		expect(() =>
			assertShipmentTransition({
				current: ShipmentStatus.AWAITING_RECEIPT,
				next: ShipmentStatus.OUT_FOR_DELIVERY,
				actorRole: FulfillmentActorRole.ADMIN,
				mode: FulfillmentMode.PLATFORM,
				packageStatus: PackageStatus.HANDED_OFF,
				allowSkip: true,
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
		for (const status of [
			ShipmentStatus.DELIVERED,
			ShipmentStatus.PICKED_UP,
		]) {
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
		expect(canRequestCancellation(PackageStatus.READY_FOR_HANDOFF)).toBe(
			true,
		);
		expect(canRequestCancellation(PackageStatus.HANDED_OFF)).toBe(false);
		expect(canRequestCancellation(PackageStatus.CANCELLED)).toBe(false);
	});
});

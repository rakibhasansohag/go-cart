import { describe, expect, it, vi } from 'vitest';
import { PackageStatus } from '@prisma/client';

const {
	dbMock,
	currentUserMock,
	publishDomainEventMock,
	scheduleEmailOutboxDispatchMock,
	afterMock,
} = vi.hoisted(() => ({
	dbMock: {
		$transaction: vi.fn(),
		store: { findFirst: vi.fn() },
	},
	currentUserMock: vi.fn(),
	publishDomainEventMock: vi.fn(),
	scheduleEmailOutboxDispatchMock: vi.fn(),
	afterMock: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ db: dbMock }));
vi.mock('@clerk/nextjs/server', () => ({ currentUser: currentUserMock }));
vi.mock('@/lib/notifications/domain-events', () => ({
	DOMAIN_EVENT_TYPES: {
		PACKAGE_STATUS_CHANGED: 'package.status_changed',
		SHIPMENT_STATUS_CHANGED: 'shipment.status_changed',
	},
	publishDomainEvent: publishDomainEventMock,
}));
vi.mock('@/lib/email/schedule', () => ({
	scheduleEmailOutboxDispatch: scheduleEmailOutboxDispatchMock,
}));
vi.mock('next/server', () => ({ after: afterMock }));
vi.mock('next/cache', () => ({ updateTag: vi.fn() }));

import { updatePackageStatus } from './fulfillment';

describe('fulfillment status mutation transaction boundaries', () => {
	it('persists the package transition before deferred notification fan-out', async () => {
		const group = {
			id: 'group-1',
			orderId: 'order-1',
			storeId: 'store-1',
			packageStatus: PackageStatus.PENDING,
			shipmentAssignments: [],
			store: { name: 'Demo Store', url: 'demo-store' },
			items: [],
			order: { paymentDetails: { currency: 'USD' } },
			subTotal: 25,
			shippingFees: 0,
			total: 25,
		};
		const tx = {
			fulfillmentTransition: {
				findUnique: vi.fn().mockResolvedValue(null),
				create: vi.fn().mockResolvedValue({}),
			},
			orderGroup: {
				findFirst: vi.fn().mockResolvedValue(group),
				updateMany: vi.fn().mockResolvedValue({ count: 1 }),
				update: vi.fn().mockResolvedValue({}),
				findMany: vi.fn().mockResolvedValue([{ status: 'PROCESSING' }]),
			},
			orderItem: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
			order: {
				update: vi.fn().mockResolvedValue({}),
			},
		};

		currentUserMock.mockResolvedValue({
			id: 'seller-1',
			privateMetadata: { role: 'SELLER' },
		});
		dbMock.store.findFirst.mockResolvedValue({ id: 'store-1' });
		dbMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx));
		publishDomainEventMock
			.mockResolvedValueOnce({ id: 'event-1' })
			.mockResolvedValueOnce({ id: 'event-1' });
		afterMock.mockImplementation((callback: () => Promise<void>) => {
			void callback();
		});

		const result = await updatePackageStatus({
			storeId: 'store-1',
			groupId: group.id,
			nextStatus: PackageStatus.ACCEPTED,
			idempotencyKey: 'transition-1',
		});
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(result).toBe(PackageStatus.ACCEPTED);
		expect(publishDomainEventMock).toHaveBeenNthCalledWith(
			1,
			tx,
			expect.objectContaining({ persistEventOnly: true }),
		);
		expect(publishDomainEventMock).toHaveBeenNthCalledWith(
			2,
			dbMock,
			expect.not.objectContaining({ persistEventOnly: true }),
		);
		expect(afterMock).toHaveBeenCalledOnce();
		expect(scheduleEmailOutboxDispatchMock).toHaveBeenCalledWith(['event-1']);
	});
});

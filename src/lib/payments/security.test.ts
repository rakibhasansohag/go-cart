import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock, findFirstMock, redemptionCountMock, transactionMock, rawMock, executeMock, couponMock } = vi.hoisted(() => ({
	authMock: vi.fn(),
	findFirstMock: vi.fn(),
	redemptionCountMock: vi.fn(), transactionMock: vi.fn(), rawMock: vi.fn(), executeMock: vi.fn(), couponMock: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({
	auth: authMock,
}));

vi.mock('@/lib/db', () => ({
	db: {
		$transaction: transactionMock, $queryRaw: rawMock, $executeRaw: executeMock, coupon: { findUniqueOrThrow: couponMock },
		orderGroup: { count: redemptionCountMock },
		order: {
			findFirst: findFirstMock,
		},
	},
}));

import { db } from '@/lib/db';
import { assertPaymentAmount, requireOwnedOrder } from './security';

const payableOrder = {
	id: 'order-1',
	userId: 'user-1',
	total: 49.99,
	paymentStatus: 'Pending',
	paymentDetails: null,
	groups: [],
};

describe('payment ownership and eligibility', () => {
	beforeEach(() => {
		authMock.mockReset();
		findFirstMock.mockReset();
		vi.clearAllMocks();
		transactionMock.mockImplementation((callback: (tx: typeof db) => Promise<unknown>) => callback(db));
		rawMock.mockImplementation(async (sql: TemplateStringsArray) => sql.join('').includes('COUNT(*)') ? [{ totalUses: 0, userUses: await redemptionCountMock() ?? 0 }] : []);
		couponMock.mockResolvedValue({ id: 'coupon', maxUses: 0, maxUsesPerUser: 1 });
		redemptionCountMock.mockReset();
	});

	it('requires an authenticated customer', async () => {
		authMock.mockResolvedValue({ userId: null });

		await expect(
			requireOwnedOrder('order-1', { requirePayable: true }),
		).rejects.toThrow('Please sign in');
		expect(findFirstMock).not.toHaveBeenCalled();
	});

	it('scopes the lookup to both order and authenticated customer', async () => {
		authMock.mockResolvedValue({ userId: 'user-1' });
		findFirstMock.mockResolvedValue(payableOrder);

		await expect(
			requireOwnedOrder('order-1', { requirePayable: true }),
		).resolves.toEqual(payableOrder);
		expect(findFirstMock).toHaveBeenCalledWith({
			where: { id: 'order-1', userId: 'user-1' },
			include: { paymentDetails: true, groups: { include: { items: true, coupon: true } } },
		});
	});

	it('does not reveal an order owned by another customer', async () => {
		authMock.mockResolvedValue({ userId: 'user-2' });
		findFirstMock.mockResolvedValue(null);

		await expect(
			requireOwnedOrder('order-1', { requirePayable: true }),
		).rejects.toThrow('Order not found');
	});

	it('rejects an old order containing a negative quantity before payment', async () => {
		authMock.mockResolvedValue({ userId: 'user-1' });
		findFirstMock.mockResolvedValue({ ...payableOrder, groups: [{ items: [{ quantity: -1 }], coupon: null }] });
		await expect(requireOwnedOrder('order-1', { requirePayable: true })).rejects.toThrow('positive integer');
	});

	it('preserves paying an ordinary order with positive line quantities', async () => {
		authMock.mockResolvedValue({ userId: 'user-1' });
		const order = { ...payableOrder, groups: [{ items: [{ quantity: 2 }], coupon: null }] };
		findFirstMock.mockResolvedValue(order);
		await expect(requireOwnedOrder('order-1', { requirePayable: true })).resolves.toEqual(order);
	});

	it('rechecks coupon limits for an order prepared before the first redemption', async () => {
		authMock.mockResolvedValue({ userId: 'user-1' });
		findFirstMock.mockResolvedValue({ ...payableOrder, groups: [{ items: [{ quantity: 1 }], coupon: { id: 'coupon', maxUses: 0, maxUsesPerUser: 1 } }] });
		redemptionCountMock.mockResolvedValue(1);
		await expect(requireOwnedOrder('order-1', { requirePayable: true })).rejects.toThrow('per-customer');
		expect(executeMock).not.toHaveBeenCalled();
	});

	it('preserves paying a coupon order while customer capacity remains', async () => {
		authMock.mockResolvedValue({ userId: 'user-1' });
		const order = { ...payableOrder, groups: [{ items: [{ quantity: 1 }], coupon: { id: 'coupon', maxUses: 0, maxUsesPerUser: 1 } }] };
		findFirstMock.mockResolvedValue(order);
		redemptionCountMock.mockResolvedValue(0);
		await expect(requireOwnedOrder('order-1', { requirePayable: true })).resolves.toEqual(order);
	});

	it('prevents paying an already-paid order again', async () => {
		authMock.mockResolvedValue({ userId: 'user-1' });
		findFirstMock.mockResolvedValue({
			...payableOrder,
			paymentStatus: 'Paid',
		});

		await expect(
			requireOwnedOrder('order-1', { requirePayable: true }),
		).rejects.toThrow('already paid');
	});
});

describe('provider amount validation', () => {
	it('accepts the exact server-calculated amount and currency', () => {
		expect(() => assertPaymentAmount(49.99, 49.99, 'usd')).not.toThrow();
	});

	it('rejects amount tampering', () => {
		expect(() => assertPaymentAmount(49.99, 1, 'USD')).toThrow(
			'amount does not match',
		);
	});

	it('rejects currency tampering', () => {
		expect(() => assertPaymentAmount(49.99, 49.99, 'EUR')).toThrow(
			'currency mismatch',
		);
	});
});


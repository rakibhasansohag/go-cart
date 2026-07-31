import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock, findFirstMock } = vi.hoisted(() => ({
	authMock: vi.fn(),
	findFirstMock: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({
	auth: authMock,
}));

vi.mock('@/lib/db', () => ({
	db: {
		order: {
			findFirst: findFirstMock,
		},
	},
}));

import { assertPaymentAmount, requireOwnedOrder } from './security';

const payableOrder = {
	id: 'order-1',
	userId: 'user-1',
	total: 49.99,
	paymentStatus: 'Pending',
	paymentDetails: null,
};

describe('payment ownership and eligibility', () => {
	beforeEach(() => {
		authMock.mockReset();
		findFirstMock.mockReset();
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
			include: { paymentDetails: true },
		});
	});

	it('does not reveal an order owned by another customer', async () => {
		authMock.mockResolvedValue({ userId: 'user-2' });
		findFirstMock.mockResolvedValue(null);

		await expect(
			requireOwnedOrder('order-1', { requirePayable: true }),
		).rejects.toThrow('Order not found');
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


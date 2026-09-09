import { describe, expect, it, vi } from 'vitest';
import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { invalidatePaymentQueries } from '@/lib/payments/query-sync';

describe('Query Invalidation Contracts', () => {
	it('invalidates payment and commerce queries across profile, dashboard, and order detail upon payment settlement', async () => {
		const invalidateQueriesMock = vi.fn().mockResolvedValue(undefined);
		const mockQueryClient = {
			invalidateQueries: invalidateQueriesMock,
		} as unknown as QueryClient;

		const orderId = 'order-xyz-123';
		await invalidatePaymentQueries(mockQueryClient, orderId);

		expect(invalidateQueriesMock).toHaveBeenCalledTimes(6);
		expect(invalidateQueriesMock).toHaveBeenCalledWith({
			queryKey: queryKeys.orders.detail(orderId),
		});
		expect(invalidateQueriesMock).toHaveBeenCalledWith({
			queryKey: ['profile', 'orders'],
		});
		expect(invalidateQueriesMock).toHaveBeenCalledWith({
			queryKey: ['profile', 'payments'],
		});
		expect(invalidateQueriesMock).toHaveBeenCalledWith({
			queryKey: ['dashboard', 'orders'],
		});
		expect(invalidateQueriesMock).toHaveBeenCalledWith({
			queryKey: ['dashboard', 'sellerAnalytics'],
		});
		expect(invalidateQueriesMock).toHaveBeenCalledWith({
			queryKey: ['dashboard', 'adminOrders'],
		});
	});

	it('produces hierarchical query keys that cover prefix invalidation for profile and dashboard scopes', () => {
		const orderListKey = queryKeys.profile.orderLists();
		expect(orderListKey).toEqual(['profile', 'orders']);

		const filteredOrderKey = queryKeys.profile.orders({ status: 'DELIVERED' });
		expect(filteredOrderKey[0]).toBe('profile');
		expect(filteredOrderKey[1]).toBe('orders');

		const dashboardOrderListKey = queryKeys.dashboard.orderLists();
		expect(dashboardOrderListKey).toEqual(['dashboard', 'orders']);

		const storeOrdersKey = queryKeys.dashboard.orders('srank', 1, 10, 'shoes', 'PAID');
		expect(storeOrdersKey[0]).toBe('dashboard');
		expect(storeOrdersKey[1]).toBe('orders');
		expect(storeOrdersKey[2]).toBe('srank');
	});

	it('produces expected query keys for return requests and candidates', () => {
		const returnsListKey = queryKeys.profile.returns({ page: 1 });
		expect(returnsListKey).toEqual(['profile', 'returns', { page: 1 }]);

		const returnDetailKey = queryKeys.profile.returnDetail('ret-123');
		expect(returnDetailKey).toEqual(['profile', 'returns', 'detail', 'ret-123']);

		const returnCandidateKey = queryKeys.profile.returnCandidate('item-456');
		expect(returnCandidateKey).toEqual(['profile', 'returns', 'candidate', 'item-456']);
	});

	it('produces expected query keys for store inventory and admin inventory reconciliation', () => {
		const storeInventoryKey = queryKeys.dashboard.inventory('srank');
		expect(storeInventoryKey).toEqual(['dashboard', 'inventory', 'srank']);

		const adminInventoryKey = queryKeys.dashboard.adminInventory();
		expect(adminInventoryKey).toEqual(['dashboard', 'adminInventory']);
	});
});

import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

export async function invalidatePaymentQueries(
	queryClient: QueryClient,
	orderId: string,
) {
	await Promise.all([
		queryClient.invalidateQueries({
			queryKey: queryKeys.orders.detail(orderId),
		}),
		queryClient.invalidateQueries({ queryKey: ['profile', 'orders'] }),
		queryClient.invalidateQueries({ queryKey: ['profile', 'payments'] }),
		queryClient.invalidateQueries({ queryKey: ['dashboard', 'orders'] }),
		// Reconciled payments affect seller analytics, but not unrelated dashboard
		// resources such as catalog, inventory, or settings queries.
		queryClient.invalidateQueries({ queryKey: ['dashboard', 'sellerAnalytics'] }),
		queryClient.invalidateQueries({
			queryKey: ['dashboard', 'adminOrders'],
		}),
	]);
}


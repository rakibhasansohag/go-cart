'use client';

import { activeOrderStatusSyncOptions } from '@/lib/orders/live-sync';
import { queryKeys } from '@/lib/query-keys';
import { getOrderStatusSnapshots } from '@/queries/order-status';
import { useQuery } from '@tanstack/react-query';

export function useOrderStatusSync({
	orderIds = [],
	groupIds = [],
}: {
	orderIds?: string[];
	groupIds?: string[];
}) {
	const normalizedOrderIds = [...new Set(orderIds)].sort();
	const normalizedGroupIds = [...new Set(groupIds)].sort();

	return useQuery({
		queryKey: queryKeys.orders.statuses(normalizedOrderIds, normalizedGroupIds),
		queryFn: () =>
			getOrderStatusSnapshots({
				orderIds: normalizedOrderIds,
				groupIds: normalizedGroupIds,
			}),
		enabled: normalizedOrderIds.length > 0 || normalizedGroupIds.length > 0,
		...activeOrderStatusSyncOptions,
	});
}

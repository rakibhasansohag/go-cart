"use client";

import { activeOrderStatusSyncOptions } from "@/lib/orders/live-sync";
import { queryKeys } from "@/lib/query-keys";
import { getOrderStatusSnapshots } from "@/queries/order-status";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";

export function useOrderStatusSync({
  orderIds = [],
  groupIds = [],
}: {
  orderIds?: string[];
  groupIds?: string[];
}) {
  const { isLoaded, isSignedIn, user } = useUser();
  const normalizedOrderIds = [...new Set(orderIds)].sort();
  const normalizedGroupIds = [...new Set(groupIds)].sort();

  return useQuery({
    queryKey: queryKeys.orders.statuses(
      normalizedOrderIds,
      normalizedGroupIds,
      user?.id,
    ),
    queryFn: () =>
      getOrderStatusSnapshots({
        orderIds: normalizedOrderIds,
        groupIds: normalizedGroupIds,
      }),
    enabled:
      Boolean(isLoaded && isSignedIn) &&
      (normalizedOrderIds.length > 0 || normalizedGroupIds.length > 0),
    ...activeOrderStatusSyncOptions,
  });
}

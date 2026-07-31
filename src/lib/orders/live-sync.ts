/**
 * Cross-session order updates are refreshed while an order surface is visible.
 * Mutations still update the acting browser immediately; this interval keeps
 * seller, admin, and customer sessions synchronized without paid realtime
 * infrastructure.
 */
export const ACTIVE_ORDER_REFRESH_INTERVAL_MS = 10_000;

export const activeOrderSyncOptions = {
	refetchInterval: ACTIVE_ORDER_REFRESH_INTERVAL_MS,
	refetchIntervalInBackground: false,
	refetchOnWindowFocus: true,
} as const;

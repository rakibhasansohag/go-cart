'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RealtimeSyncResult } from '@/lib/realtime/types';

export interface UseAdaptiveRealtimeSyncOptions {
	storeUrl?: string;
	conversationId?: string | null;
	enabled?: boolean;
	activeIntervalMs?: number;
	idleIntervalMs?: number;
	idleTimeoutMs?: number;
}

export function useAdaptiveRealtimeSync({
	storeUrl,
	conversationId,
	enabled = true,
	activeIntervalMs = 2500,
	idleIntervalMs = 12000,
	idleTimeoutMs = 30000,
}: UseAdaptiveRealtimeSyncOptions = {}) {
	const queryClient = useQueryClient();
	const [isSyncing, setIsSyncing] = useState(false);
	const [isTabVisible, setIsTabVisible] = useState(true);
	const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

	const lastServerTimeRef = useRef<string | null>(null);
	const lastActivityRef = useRef<number>(Date.now());
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);
	const isMountedRef = useRef(true);

	// Record activity to determine whether the user is actively chatting or idle
	const recordActivity = useCallback(() => {
		lastActivityRef.current = Date.now();
	}, []);

	// Execute one sync check
	const performSync = useCallback(async () => {
		if (!enabled || typeof window === 'undefined') return;
		if (document.visibilityState === 'hidden') return;

		setIsSyncing(true);
		try {
			const params = new URLSearchParams();
			if (lastServerTimeRef.current) {
				params.set('lastCheckedAt', lastServerTimeRef.current);
			}
			if (conversationId) {
				params.set('conversationId', conversationId);
			}
			if (storeUrl) {
				params.set('storeUrl', storeUrl);
			}

			const res = await fetch(`/api/realtime/sync?${params.toString()}`, {
				method: 'GET',
				headers: { 'Cache-Control': 'no-cache' },
			});

			if (!res.ok) {
				setIsSyncing(false);
				return;
			}

			const data: RealtimeSyncResult = await res.json();
			if (!isMountedRef.current) return;

			lastServerTimeRef.current = data.serverTime;
			setLastSyncedAt(data.serverTime);

			// 1. If active conversation received new messages, invalidate detail cache
			if (data.hasNewMessages && conversationId) {
				queryClient.invalidateQueries({
					queryKey: ['conversation-detail', conversationId],
				});
			}

			// 2. If conversations list updated, invalidate list cache
			if (data.hasConversationUpdates) {
				if (storeUrl) {
					queryClient.invalidateQueries({
						queryKey: ['seller-conversations', storeUrl],
					});
				} else {
					queryClient.invalidateQueries({
						queryKey: ['buyer-conversations'],
					});
				}
			}

			// 3. Keep unread notification bell synchronized
			queryClient.setQueriesData<{ unreadCount: number }>(
				{ queryKey: ['notifications', 'summary'] },
				(current) => {
					if (!current) return { unreadCount: data.unreadNotificationsCount };
					if (current.unreadCount !== data.unreadNotificationsCount) {
						return { ...current, unreadCount: data.unreadNotificationsCount };
					}
					return current;
				}
			);
		} catch (err) {
			console.warn('[AdaptiveRealtimeSync] Probe error:', err);
		} finally {
			if (isMountedRef.current) {
				setIsSyncing(false);
			}
		}
	}, [enabled, conversationId, storeUrl, queryClient]);

	// Schedule next sync tick based on user activity decay and tab visibility
	const scheduleNextSync = useCallback(() => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}

		if (!enabled || typeof window === 'undefined') return;
		if (document.visibilityState === 'hidden') return;

		const isIdle = Date.now() - lastActivityRef.current > idleTimeoutMs;
		const delay = isIdle ? idleIntervalMs : activeIntervalMs;

		timeoutRef.current = setTimeout(async () => {
			await performSync();
			if (isMountedRef.current) {
				scheduleNextSync();
			}
		}, delay);
	}, [enabled, activeIntervalMs, idleIntervalMs, idleTimeoutMs, performSync]);

	// Instant trigger (e.g. user just sent a message or clicked a conversation)
	const triggerSyncNow = useCallback(async () => {
		recordActivity();
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
		await performSync();
		scheduleNextSync();
	}, [recordActivity, performSync, scheduleNextSync]);

	// Listen for visibility and user activity
	useEffect(() => {
		isMountedRef.current = true;
		if (typeof window === 'undefined') return;

		const handleVisibilityChange = () => {
			const visible = document.visibilityState === 'visible';
			setIsTabVisible(visible);
			if (visible) {
				recordActivity();
				// Immediate sync upon returning to tab
				performSync().then(() => {
					if (isMountedRef.current) scheduleNextSync();
				});
			} else {
				if (timeoutRef.current) {
					clearTimeout(timeoutRef.current);
					timeoutRef.current = null;
				}
			}
		};

		const handleActivity = () => {
			recordActivity();
		};

		document.addEventListener('visibilitychange', handleVisibilityChange);
		window.addEventListener('keydown', handleActivity, { passive: true });
		window.addEventListener('pointerdown', handleActivity, { passive: true });

		// Initial sync and loop start
		performSync().then(() => {
			if (isMountedRef.current) scheduleNextSync();
		});

		return () => {
			isMountedRef.current = false;
			document.removeEventListener('visibilitychange', handleVisibilityChange);
			window.removeEventListener('keydown', handleActivity);
			window.removeEventListener('pointerdown', handleActivity);
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, [performSync, scheduleNextSync, recordActivity]);

	// When conversationId or storeUrl changes, reset cursor and sync immediately
	useEffect(() => {
		lastServerTimeRef.current = null;
		triggerSyncNow();
	}, [conversationId, storeUrl, triggerSyncNow]);

	return {
		isSyncing,
		isTabVisible,
		lastSyncedAt,
		triggerSyncNow,
	};
}

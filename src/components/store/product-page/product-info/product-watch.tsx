'use client';
import { Eye } from 'lucide-react';
import React, { useEffect, useRef, useState, useCallback } from 'react';

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 3000;

export default function ProductWatch({ productId }: { productId: string }) {
	const [watcherCount, setWatcherCount] = useState(0);
	const wsRef = useRef<WebSocket | null>(null);
	const retriesRef = useRef(0);
	const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const unmountedRef = useRef(false);

	const connect = useCallback(() => {
		if (unmountedRef.current) return;

		const host =
			process.env.NEXT_PUBLIC_WATCHER_SERVER ||
			'wss://go-cart-websocket-server.onrender.com';
		const url = `${host}/${productId}`;

		// Guard: don't reconnect if already connecting/open
		if (
			wsRef.current &&
			(wsRef.current.readyState === WebSocket.CONNECTING ||
				wsRef.current.readyState === WebSocket.OPEN)
		) {
			return;
		}

		let ws: WebSocket;
		try {
			ws = new WebSocket(url);
		} catch {
			// If WebSocket constructor itself throws (invalid URL etc.), bail out silently
			return;
		}

		wsRef.current = ws;

		ws.onopen = () => {
			if (unmountedRef.current) return ws.close();
			retriesRef.current = 0;
			try {
				ws.send(JSON.stringify({ type: 'subscribe', productId }));
			} catch { /* ignore send errors */ }
		};

		ws.onmessage = (e) => {
			if (unmountedRef.current) return;
			try {
				const d = JSON.parse(e.data);
				if (d.productId === productId && typeof d.count === 'number') {
					setWatcherCount(d.count);
				}
			} catch { /* ignore parse errors */ }
		};

		ws.onerror = () => {
			// Silently swallow — onerror fires before onclose, onclose handles retry
		};

		ws.onclose = () => {
			if (unmountedRef.current) return;
			wsRef.current = null;

			// Exponential-backoff retry up to MAX_RETRIES
			if (retriesRef.current < MAX_RETRIES) {
				const delay = RETRY_BASE_MS * Math.pow(2, retriesRef.current);
				retriesRef.current += 1;
				retryTimerRef.current = setTimeout(connect, delay);
			}
			// After MAX_RETRIES: give up silently — watcherCount stays at last known value
		};
	}, [productId]);

	useEffect(() => {
		unmountedRef.current = false;
		retriesRef.current = 0;
		connect();

		return () => {
			unmountedRef.current = true;
			if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
			try {
				wsRef.current?.close();
				wsRef.current = null;
			} catch { /* ignore */ }
		};
	}, [connect]);

	// Don't render anything if we never got a count (server unreachable)
	if (watcherCount === 0) return null;

	return (
		<div className='mb-2 text-sm'>
			<p className='flex items-center gap-x-1'>
				<Eye className='w-4 text-main-secondary' />
				<span>
					{watcherCount} {watcherCount > 1 ? 'people are' : 'person is'}{' '}
					watching this product
				</span>
			</p>
		</div>
	);
}

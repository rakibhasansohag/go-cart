'use client';
import { Eye } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

export default function ProductWatch({ productId }: { productId: string }) {
	const [watcherCount, setWatcherCount] = useState(0);
	const [status, setStatus] = useState<
		'idle' | 'connecting' | 'open' | 'closed' | 'error'
	>('idle');
	const [lastRaw, setLastRaw] = useState<string | null>(null);

	// keep socket in ref so re-renders won't recreate it
	const wsRef = useRef<WebSocket | null>(null);

	useEffect(() => {
		const host =
			process.env.NEXT_PUBLIC_WATCHER_SERVER ||
			'wss://go-cart-websocket-server.onrender.com';
		const url = `${host}/${productId}`;
		console.log('Connecting to', url);

		// if there's already a socket and it's CONNECTING(0) or OPEN(1), don't create another
		if (
			wsRef.current &&
			(wsRef.current.readyState === WebSocket.CONNECTING ||
				wsRef.current.readyState === WebSocket.OPEN)
		) {
			console.log('WebSocket already active, skipping create');
			return;
		}

		setStatus('connecting');
		const ws = new WebSocket(url);
		wsRef.current = ws;

		ws.onopen = () => {
			console.log(' WebSocket OPENED for product', productId);
			setStatus('open');
			// optional subscribe ping
			try {
				ws.send(JSON.stringify({ type: 'subscribe', productId }));
			} catch {}
		};

		ws.onmessage = (e) => {
			setLastRaw(String(e.data));
			try {
				const d = JSON.parse(e.data);
				if (d.productId === productId && typeof d.count === 'number')
					setWatcherCount(d.count);
			} catch (err) {
				console.warn('ws parse error', err);
			}
		};

		ws.onerror = (err) => {
			console.error(' WebSocket ERROR', err);
			setStatus('error');
		};

		ws.onclose = (ev) => {
			console.log('🚪 WebSocket CLOSED', ev);
			setStatus('closed');
			// keep wsRef nullified so next effect run can reconnect
			if (wsRef.current === ws) wsRef.current = null;
		};

		return () => {
			// cleanup: close only the socket we created here
			try {
				if (wsRef.current === ws) {
					ws.close();
					wsRef.current = null;
				}
			} catch {}
		};
	}, [productId]);

	return (
		<div className='mb-2 text-sm'>
			<p className='flex items-center gap-x-1'>
				<Eye className='w-4 text-main-secondary' />
				<span>
					{watcherCount} {watcherCount > 1 ? 'people are' : 'person is'}{' '}
					watching this product
				</span>
			</p>

			{/* <div style={{ fontSize: 12, marginTop: 8 }}>
				<div>
					<strong>WS status:</strong> {status}
				</div>
				<div>
					<strong>Last raw message:</strong>
					<pre style={{ whiteSpace: 'pre-wrap' }}>{lastRaw ?? '—'}</pre>
				</div>
			</div> */}
		</div>
	);
}

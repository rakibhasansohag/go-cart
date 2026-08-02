import 'server-only';

import { after } from 'next/server';
import { emailNotificationsEnabled } from './config';
import { dispatchEmailOutboxBatch } from './outbox';

export function scheduleEmailOutboxDispatch() {
	if (!emailNotificationsEnabled()) return;

	try {
		after(async () => {
			try {
				await dispatchEmailOutboxBatch({ limit: 10 });
			} catch (error) {
				console.error('Email outbox dispatch failed:', error);
			}
		});
	} catch (error) {
		// The durable outbox remains pending when this helper is called outside a
		// Next.js request context (for example, a unit test or maintenance script).
		if (process.env.NODE_ENV !== 'test') {
			console.warn('Email outbox dispatch was deferred to recovery:', error);
		}
	}
}

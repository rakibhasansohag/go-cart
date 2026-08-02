import { after } from 'next/server';

export function scheduleEmailOutboxDispatch(sourceEventIds: string[]) {
	const uniqueEventIds = [...new Set(sourceEventIds)].filter(Boolean);
	if (uniqueEventIds.length === 0) return;

	try {
		after(async () => {
			try {
				const [{ emailNotificationsEnabled }, { dispatchEmailOutboxBatch }] =
					await Promise.all([import('./config'), import('./outbox')]);
				if (!emailNotificationsEnabled()) return;
				await dispatchEmailOutboxBatch({
					limit: Math.min(100, uniqueEventIds.length * 5),
					sourceEventIds: uniqueEventIds,
				});
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

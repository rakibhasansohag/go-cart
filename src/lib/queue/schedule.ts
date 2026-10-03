import { after } from 'next/server';
import { queuesEnabled } from './config';

export function scheduleBackgroundJobs() {
	if (!queuesEnabled()) return;
	try {
		after(async () => {
			try {
				const { relayBackgroundJobs } = await import('./relay');
				await relayBackgroundJobs();
			} catch (error) {
				console.error('[queue] Committed jobs remain available for recovery.', error instanceof Error ? error.name : 'unknown');
			}
		});
	} catch {
		// Outside a request, the CLI/recovery cron can relay committed rows.
	}
}

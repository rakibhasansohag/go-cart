export function queuesEnabled() {
	return process.env.PHASE26_ENABLED === 'true';
}

export function queueTransportAvailable() {
	return process.env.VERCEL === '1' || Boolean(process.env.VERCEL_QUEUE_TOKEN && process.env.VERCEL_QUEUE_BASE_URL);
}

export const QUEUE_MAX_ATTEMPTS = 8;
export const QUEUE_LEASE_MS = 5 * 60_000;
export function queueRetryDelay(attempt: number) {
	return Math.min(60 * 60_000, 30_000 * 2 ** Math.max(0, attempt - 1));
}

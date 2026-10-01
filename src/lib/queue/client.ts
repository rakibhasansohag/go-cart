import { QueueClient } from "@vercel/queue";

/**
 * Singleton Vercel Queue client.
 *
 * Authentication uses OIDC tokens provided automatically on Vercel deployments.
 * For local dev, run `vercel link` + `vercel env pull` to get the tokens into
 * `.env.local`. The client reads `VERCEL_QUEUE_TOKEN` and `VERCEL_QUEUE_BASE_URL`
 * from the environment.
 */
let _client: QueueClient | null = null;

export function getQueueClient(): QueueClient {
	if (_client) return _client;

	const token = process.env.VERCEL_QUEUE_TOKEN;
	const baseUrl = process.env.VERCEL_QUEUE_BASE_URL;

	if (!token || !baseUrl) {
		throw new Error(
			"[queue] Missing VERCEL_QUEUE_TOKEN or VERCEL_QUEUE_BASE_URL. " +
				"Run `vercel link` and `vercel env pull` for local development.",
		);
	}

	_client = new QueueClient({
		token,
		resolveBaseUrl: () => new URL(baseUrl),
		deploymentId: null,
	});

	return _client;
}

import { QueueClient } from "@vercel/queue";

/**
 * Singleton Vercel Queue client.
 *
 * Authentication uses OIDC tokens provided automatically on Vercel deployments.
 * Local transport requires an explicit token and base URL; without them,
 * the development worker executes committed database jobs directly.
 */
let _client: QueueClient | null = null;

export function getQueueClient(): QueueClient {
	if (_client) return _client;

	const token = process.env.VERCEL_QUEUE_TOKEN;
	const baseUrl = process.env.VERCEL_QUEUE_BASE_URL;

	_client = token && baseUrl ? new QueueClient({
		token,
		resolveBaseUrl: () => new URL(baseUrl),
		deploymentId: null,
	}) : new QueueClient();

	return _client;
}

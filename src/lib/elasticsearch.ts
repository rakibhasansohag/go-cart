import { Client } from '@elastic/elasticsearch';

let clientInstance: Client | null = null;

export const getElasticsearchClient = (): Client => {
	if (!clientInstance) {
		const nodeUrl = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
		clientInstance = new Client({
			node: nodeUrl,
			auth: {
				apiKey: process.env.ELASTICSEARCH_API_KEY || '',
			},
		});
	}
	return clientInstance;
};

const client = new Proxy({} as Client, {
	get(_target, prop) {
		const instance = getElasticsearchClient();
		const value = (instance as unknown as Record<string | symbol, unknown>)[prop];
		if (typeof value === 'function') {
			return value.bind(instance);
		}
		return value;
	},
});

export default client;

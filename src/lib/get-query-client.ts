import { QueryClient, defaultShouldDehydrateQuery, isServer } from '@tanstack/react-query';
import { cache } from 'react';

function makeQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 5 * 60 * 1000, // 5 minutes default
				gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
				refetchOnWindowFocus: false,
				retry: 1,
			},
			dehydrate: {
				shouldDehydrateQuery: (query) =>
					defaultShouldDehydrateQuery(query) ||
					query.state.status === 'pending', // stream pending queries too
			},
		},
	});
}

const getQueryClientServer = cache(() => makeQueryClient());
let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
	if (isServer) {
		return getQueryClientServer();
	}
	if (!browserQueryClient) {
		browserQueryClient = makeQueryClient();
	}
	return browserQueryClient;
}

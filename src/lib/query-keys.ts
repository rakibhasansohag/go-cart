export const queryKeys = {
	products: {
		all: () => ['products'] as const,
		list: (filters: object, sort: string, page: number) =>
			['products', 'list', { filters, sort, page }] as const,
		detail: (slug: string) => ['products', 'detail', slug] as const,
		byIds: (ids: string[]) => ['products', 'byIds', ids] as const,
		related: (productId: string) => ['products', 'related', productId] as const,
		storeProducts: (storeUrl: string) => ['products', 'store', storeUrl] as const,
	},
	home: {
		dynamic: (tags: string[]) => ['home', 'dynamic', tags] as const,
		featuredCategories: () => ['home', 'featuredCategories'] as const,
	},
	profile: {
		orders: (filters: object) => ['profile', 'orders', filters] as const,
		payments: (filters: object) => ['profile', 'payments', filters] as const,
		reviews: (filters: object) => ['profile', 'reviews', filters] as const,
		wishlist: (page: number) => ['profile', 'wishlist', page] as const,
		following: (page: number) => ['profile', 'following', page] as const,
		history: (ids: string[], page: number) => ['profile', 'history', { ids, page }] as const,
	},
	categories: {
		all: () => ['categories'] as const,
		withSubs: () => ['categories', 'withSubs'] as const,
	},
	offerTags: {
		all: () => ['offerTags'] as const,
	},
	sizes: {
		filtered: (filters: object) => ['sizes', 'filtered', filters] as const,
	},
	colors: {
		filtered: (filters: object) => ['colors', 'filtered', filters] as const,
	},
	store: {
		followInfo: (storeId: string, userId: string) =>
			['store', 'followInfo', storeId, userId] as const,
	},
} as const;

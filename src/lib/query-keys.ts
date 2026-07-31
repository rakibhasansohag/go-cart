export const queryKeys = {
  products: {
    all: () => ["products"] as const,
    list: (filters: object, sort: string, cursor?: string | null) =>
      ["products", "list", { filters, sort, cursor }] as const,
    detail: (slug: string) => ["products", "detail", slug] as const,
    byIds: (ids: string[]) => ["products", "byIds", ids] as const,
    related: (productId: string) => ["products", "related", productId] as const,
    storeProducts: (storeUrl: string) =>
      ["products", "store", storeUrl] as const,
  },
  home: {
    dynamic: (tags: string[]) => ["home", "dynamic", tags] as const,
    featuredCategories: () => ["home", "featuredCategories"] as const,
  },
  profile: {
    orderLists: () => ["profile", "orders"] as const,
    orders: (filters: object) =>
      [...queryKeys.profile.orderLists(), filters] as const,
    payments: (filters: object) => ["profile", "payments", filters] as const,
    reviews: (filters: object) => ["profile", "reviews", filters] as const,
    wishlist: (page: number) => ["profile", "wishlist", page] as const,
    following: (page: number) => ["profile", "following", page] as const,
    history: (ids: string[], page: number) =>
      ["profile", "history", { ids, page }] as const,
    addresses: () => ["profile", "addresses"] as const,
    returns: (filters: object) => ["profile", "returns", filters] as const,
    returnDetail: (returnId: string) =>
      ["profile", "returns", "detail", returnId] as const,
    returnCandidate: (orderItemId: string) =>
      ["profile", "returns", "candidate", orderItemId] as const,
  },
  orders: {
    detail: (orderId: string) => ["orders", "detail", orderId] as const,
    statuses: (orderIds: string[], groupIds: string[], viewerId?: string) =>
      ["orders", "statuses", { orderIds, groupIds, viewerId }] as const,
  },
  payments: {
    order: (orderId: string) => ["payments", "order", orderId] as const,
  },
  notifications: {
    all: () => ["notifications"] as const,
    list: (filters: object) => ["notifications", "list", filters] as const,
  },
  categories: {
    all: () => ["categories"] as const,
    withSubs: () => ["categories", "withSubs"] as const,
  },
  offerTags: {
    all: () => ["offerTags"] as const,
  },
  sizes: {
    filtered: (filters: object) => ["sizes", "filtered", filters] as const,
  },
  colors: {
    filtered: (filters: object) => ["colors", "filtered", filters] as const,
  },
  store: {
    followInfo: (storeId: string, userId: string) =>
      ["store", "followInfo", storeId, userId] as const,
  },
  dashboard: {
    orderLists: () => ["dashboard", "orders"] as const,
    categories: () => ["dashboard", "categories"] as const,
    subCategories: () => ["dashboard", "subCategories"] as const,
    offerTags: () => ["dashboard", "offerTags"] as const,
    stores: (page?: number, limit?: number, search?: string) =>
      ["dashboard", "stores", { page, limit, search }] as const,
    products: (
      storeUrl: string,
      page?: number,
      limit?: number,
      search?: string,
    ) => ["dashboard", "products", storeUrl, { page, limit, search }] as const,
    coupons: (storeUrl: string) => ["dashboard", "coupons", storeUrl] as const,
    orders: (
      storeUrl: string,
      page?: number,
      limit?: number,
      search?: string,
      status?: string,
    ) =>
      [
        ...queryKeys.dashboard.orderLists(),
        storeUrl,
        { page, limit, search, status },
      ] as const,
    shipping: (storeUrl: string) =>
      ["dashboard", "shipping", storeUrl] as const,
    storeSettings: (storeUrl: string) =>
      ["dashboard", "settings", storeUrl] as const,
    adminAnalytics: () => ["dashboard", "adminAnalytics"] as const,
    sellerAnalytics: (storeUrl: string, timeframe?: string) =>
      ["dashboard", "sellerAnalytics", storeUrl, timeframe || "all"] as const,
    adminOrders: (page?: number, limit?: number, search?: string) =>
      ["dashboard", "adminOrders", { page, limit, search }] as const,
    adminCoupons: (page?: number, limit?: number, search?: string) =>
      ["dashboard", "adminCoupons", { page, limit, search }] as const,
    inventory: (storeUrl: string) =>
      ["dashboard", "inventory", storeUrl] as const,
  },
} as const;

---
name: tanstack-query-nextjs
description: >
  Best practices for integrating TanStack Query v5 with Next.js App Router.
  Covers: server-side prefetching with HydrationBoundary, useSuspenseQuery for
  streaming with Suspense, skeleton loaders, parallel data fetching, caching
  configuration, and useMutation patterns for server actions.
---

# TanStack Query v5 + Next.js App Router

## Core Concepts

### Caching
TanStack Query v5 has a built-in **in-memory cache** per `QueryClient` instance.
- `staleTime`: how long data is considered fresh (no refetch). Set per-query or globally.
- `gcTime` (formerly `cacheTime`): how long unused cached data is kept before garbage collection.
- On initial page load with server prefetch, data is already in cache → zero loading flash.

### The Server → Client Pattern (Recommended for Next.js App Router)

```
Server Component                Client Component
     |                               |
     |  prefetchQuery(key, fn)       |
     |  → runs query on server       |
     |  → stores in QueryClient      |
     |                               |
     |  dehydrate(queryClient)       |
     |  → serialize state            |
     |                               |
     |  <HydrationBoundary state>    |
     |  → passes to client cache     |
     |                               |
     |                          useQuery(key)
     |                          → cache HIT → no fetch
     |                          → renders immediately
```

## Package Installation

```bash
bun add @tanstack/react-query@latest
bun add -D @tanstack/react-query-devtools@latest
```

## Required Setup Files

### 1. `src/lib/get-query-client.ts`
```typescript
import { QueryClient, defaultShouldDehydrateQuery, isServer } from '@tanstack/react-query';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute — adjust per route
        gcTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
        retry: 1,
      },
      dehydrate: {
        // Also dehydrate pending queries (for streaming)
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === 'pending',
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (isServer) {
    return makeQueryClient(); // Always new on server
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient(); // Singleton on browser
  }
  return browserQueryClient;
}
```

### 2. `src/lib/query-keys.ts` — centralized key factory
```typescript
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
    wishlist: () => ['profile', 'wishlist'] as const,
    following: () => ['profile', 'following'] as const,
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
```

### 3. Update `ClientProviders.tsx` — add QueryClientProvider
```tsx
'use client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { getQueryClient } from '@/lib/get-query-client';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {/* ... ThemeProvider, Sonner, etc */}
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
```

## Server Component Pattern (Prefetch + HydrationBoundary)

```tsx
// Server Component (page.tsx or layout.tsx)
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import { Suspense } from 'react';
import { queryKeys } from '@/lib/query-keys';

export default async function Page() {
  const queryClient = getQueryClient();

  // Parallel server-side prefetch — all run simultaneously
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.products.all(),
      queryFn: () => getProducts({}, '', 1, 100),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.home.featuredCategories(),
      queryFn: getHomeFeaturedCategories,
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {/* Each Suspense boundary streams independently */}
      <Suspense fallback={<ProductsSkeleton />}>
        <ProductsSection />
      </Suspense>
      <Suspense fallback={<CategoriesSkeleton />}>
        <FeaturedCategories />
      </Suspense>
    </HydrationBoundary>
  );
}
```

## Client Component Pattern (useSuspenseQuery)

Use `useSuspenseQuery` instead of `useQuery` when inside a `<Suspense>` boundary.
This eliminates the need to check `isLoading` — the component only renders when data is ready.

```tsx
'use client';
import { useSuspenseQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { getProducts } from '@/queries/product';

export default function ProductsSection() {
  // No isLoading check needed — Suspense handles the loading state
  const { data: products } = useSuspenseQuery({
    queryKey: queryKeys.products.all(),
    queryFn: () => getProducts({}, '', 1, 100),
  });

  return <div>{products.map(p => <ProductCard key={p.id} product={p} />)}</div>;
}
```

## Skeleton Loader Pattern (Suspense Fallback)

Build skeleton components that match the shape of the real UI:

```tsx
// src/components/store/skeletons/products-skeleton.tsx
export function ProductsSkeleton() {
  return (
    <div className="flex flex-wrap gap-4 p-4">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="w-[225px] rounded-3xl bg-secondary animate-pulse p-4 space-y-3">
          <div className="w-full h-[200px] rounded-2xl bg-neutral-200 dark:bg-neutral-700" />
          <div className="h-4 w-3/4 rounded bg-neutral-200 dark:bg-neutral-700" />
          <div className="h-4 w-1/2 rounded bg-neutral-200 dark:bg-neutral-700" />
          <div className="h-5 w-1/3 rounded bg-neutral-200 dark:bg-neutral-700" />
        </div>
      ))}
    </div>
  );
}
```

## Mutation Pattern (useMutation + Server Actions)

```tsx
'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addToWishlist } from '@/queries/user';
import { queryKeys } from '@/lib/query-keys';
import { toast } from 'sonner';

export function WishlistButton({ productId, variantId }) {
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: () => addToWishlist(productId, variantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.wishlist() });
      toast.success('Added to wishlist');
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <button onClick={() => mutate()} disabled={isPending}>
      {isPending ? 'Adding...' : 'Add to Wishlist'}
    </button>
  );
}
```

## Parallel Client-Side Queries (useQueries)

When a single component needs multiple independent queries simultaneously:

```tsx
import { useQueries } from '@tanstack/react-query';

const results = useQueries({
  queries: [
    { queryKey: queryKeys.profile.orders({}), queryFn: getUserOrders },
    { queryKey: queryKeys.profile.reviews({}), queryFn: getUserReviews },
  ],
});

const [ordersQuery, reviewsQuery] = results;
```

## Caching Rules

| Route | Recommended staleTime |
|---|---|
| Home page products | 2–5 minutes |
| Product detail | 5–10 minutes |
| Profile/orders | 30 seconds (user-specific) |
| Categories list | 10–30 minutes (rarely changes) |
| Offer tags | 10 minutes |

## Anti-Patterns to Avoid

- Never use useQuery with queryFn that calls currentUser() — that is server-only (Clerk)
- Never call getQueryClient() in a Client Component's render body — use useQueryClient() hook
- Don't wrap the whole app in a single giant Suspense — use granular boundaries per section
- Always use useSuspenseQuery inside a Suspense boundary for clean skeleton loading
- Always use prefetchQuery in Server Components for initial data to avoid client waterfalls

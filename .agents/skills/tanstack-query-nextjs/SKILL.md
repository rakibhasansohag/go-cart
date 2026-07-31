---
name: tanstack-query-nextjs
description: Apply TanStack Query v5 best practices in Next.js App Router, including server prefetching, hydration, Suspense, query keys, mutations, optimistic updates, and targeted invalidation.
---

# TanStack Query v5 with Next.js

- Create a fresh `QueryClient` per server request and a browser singleton.
- Prefetch independent server queries in parallel, dehydrate them, and render clients inside `HydrationBoundary`.
- Use centralized, stable, serializable query-key factories.
- Use `useSuspenseQuery` only beneath a matching `Suspense` boundary with a shape-accurate skeleton.
- Never call server-only authentication helpers from browser query functions.
- Use `useMutation` for writes. Invalidate the narrowest affected keys on success.
- Use optimistic updates only for reversible, low-risk actions; cancel queries, snapshot old data, rollback on error, and reconcile afterward.
- Tune `staleTime` by volatility: shorter for orders/payments, longer for categories and mostly static catalog data.
- For webhook-driven state, poll or refetch only while the state is pending, then stop and invalidate related order/payment/dashboard keys.
- Verify initial hydration has no loading flash, mutations update without full reloads, errors surface clearly, and cross-view caches reconcile.

# Data Fetching Migration Plan (TanStack Query v5)

This file tracks the status of the React Query v5 migration.
Do one phase at a time. Mark it `[x]` when done and tested before moving to the next.

---

- [x] **Phase 1: Infrastructure**
  - [x] Install packages (`@tanstack/react-query`, `@tanstack/react-query-devtools`)
  - [x] Create `src/lib/get-query-client.ts`
  - [x] Create `src/lib/query-keys.ts`
  - [x] Integrate `QueryClientProvider` into `ClientProviders.tsx`

- [x] **Phase 2: Home Page**
  - [x] Skeletons for home sections
  - [x] Prefetching in `src/app/(store)/page.tsx`
  - [x] Client component migration to `useSuspenseQuery` + `<Suspense>`

- [x] **Phase 3: Product Page**
  - [x] Detail page server prefetching
  - [x] Review/shipping/related lists client migration

- [x] **Phase 4: Browse Page**
  - [x] Filters & product listings migration

- [x] **Phase 5: Profile Pages**
  - [x] Orders, payments, reviews, wishlist, history, following pages

- [x] **Phase 6: Store Page**
  - [x] Store product grid

- [x] **Phase 7: Mutations & Invalidations**
  - [x] Cart/wishlist/reviews mutations wrapped in `useMutation`

---

## Phase 8: Dashboard (Admin + Seller)

All dashboard pages currently use direct DB calls in server components and `router.refresh()` in mutation handlers.
Goal: prefetch on server, `useSuspenseQuery` on client, `useMutation` + cache invalidation instead of `router.refresh()`.

- [x] **Phase 8.1 — Extend query-keys.ts**
  - [x] Add `dashboard.*` namespace: categories, subCategories, offerTags, stores, products, coupons, orders, shipping, storeSettings
  - **Test**: TypeScript compiles with no errors (`tsc --noEmit`)

- [x] **Phase 8.2 — Admin: Categories**
  - [x] Convert `admin/categories/page.tsx` to server prefetch + `HydrationBoundary`
  - [x] Create `categories-table.tsx` client component with `useSuspenseQuery`
  - [x] Replace `router.refresh()` in `columns.tsx` delete with `useMutation` + `invalidateQueries`
  - [x] Replace `router.refresh()` in `category-details.tsx` form with `useMutation` + `invalidateQueries`
  - [x] Add skeleton fallback in `<Suspense>`
  - **Test**: Table loads, create/delete updates list without page reload

- [x] **Phase 8.3 — Admin: SubCategories**
  - [x] Same pattern as 8.2 for `admin/subCategories`
  - [x] `subCategory-details.tsx` form mutation → `invalidateQueries`
  - **Test**: Table loads, create/delete updates list without page reload

- [x] **Phase 8.4 — Admin: Offer Tags**
  - [x] Same pattern for `admin/offer-tags`
  - [x] `offer-tag-details.tsx` form mutation → `invalidateQueries`
  - **Test**: Table loads, create/delete updates list without page reload

- [x] **Phase 8.5 — Admin: Stores + Optimistic Status**
  - [x] Convert `admin/stores/page.tsx` to server prefetch
  - [x] Create `stores-table.tsx` client component
  - [x] Delete mutation + `invalidateQueries`
  - [x] `StoreStatusSelect` — replace `useState`-only with `useMutation` + optimistic update on stores cache
  - **Test**: Stores load, status badge updates instantly, delete removes row without reload

- [x] **Phase 8.6 — Seller: Products**
  - [x] Convert `[storeUrl]/products/page.tsx` → prefetch 4 queries in parallel (`Promise.all`)
  - [x] Create `products-table.tsx` client component
  - [x] Delete mutation + `invalidateQueries(dashboard.products(storeUrl))`
  - [x] `product-details.tsx` form mutation → `invalidateQueries`
  - **Test**: Products table loads, delete/create works without reload

- [ ] **Phase 8.7 — Seller: Coupons**
  - [ ] Convert `[storeUrl]/coupons/page.tsx` → server prefetch
  - [ ] Create `coupons-table.tsx` client component
  - [ ] Delete + create mutation → `invalidateQueries(dashboard.coupons(storeUrl))`
  - [ ] `coupon-details.tsx` form mutation → `invalidateQueries`
  - **Test**: Coupons table loads, create/delete works without reload

- [ ] **Phase 8.8 — Seller: Orders + Optimistic Status**
  - [ ] Convert `[storeUrl]/orders/page.tsx` → server prefetch
  - [ ] Create `orders-table.tsx` client component
  - [ ] `OrderStatusSelect` → `useMutation` + optimistic update on orders cache
  - [ ] `ProductStatusSelect` → `useMutation` + optimistic update on orders cache
  - **Test**: Orders load, status changes update inline without reload

- [ ] **Phase 8.9 — Seller: Shipping**
  - [ ] Convert `[storeUrl]/shipping/page.tsx` → server prefetch (2 queries)
  - [ ] Create `shipping-view.tsx` client component
  - [ ] `store-default-shipping-details.tsx` form mutation → `invalidateQueries`
  - [ ] `shippingRate-details.tsx` form mutation → `invalidateQueries`
  - **Test**: Shipping defaults and rates load, edit works without reload

- [ ] **Phase 8.10 — Seller: Settings**
  - [ ] Convert `[storeUrl]/settings/page.tsx` → server prefetch
  - [ ] Create `store-settings-view.tsx` client component
  - [ ] `store-details.tsx` form mutation → `invalidateQueries`
  - **Test**: Settings form loads prefetched data, save works without reload

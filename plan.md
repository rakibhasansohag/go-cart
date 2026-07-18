# Data Fetching Migration Plan (TanStack Query v5)

This file tracks the status of the React Query v5 migration.

## Current Progress: Phase 2 (Home Page)

- [x] **Phase 1: Infrastructure**
  - [x] Install packages (`@tanstack/react-query`, `@tanstack/react-query-devtools`)
  - [x] Create `src/lib/get-query-client.ts`
  - [x] Create `src/lib/query-keys.ts`
  - [x] Integrate `QueryClientProvider` into `ClientProviders.tsx`
- [ ] **Phase 2: Home Page**
  - [ ] Skeletons for home sections
  - [ ] Prefetching in `src/app/(store)/page.tsx`
  - [ ] Client component migration to `useSuspenseQuery` + `<Suspense>`
- [ ] **Phase 3: Product Page**
  - [ ] Detail page server prefetching
  - [ ] Review/shipping/related lists client migration
- [ ] **Phase 4: Browse Page**
  - [ ] Filters & product listings migration
- [ ] **Phase 5: Profile Pages**
  - [ ] Orders, payments, reviews, wishlist, history, following pages
- [ ] **Phase 6: Store Page**
  - [ ] Store product grid
- [ ] **Phase 7: Mutations & Invalidations**
  - [ ] Cart/wishlist/reviews mutations wrapped in `useMutation`

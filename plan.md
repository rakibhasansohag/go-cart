# Data Fetching Migration Plan (TanStack Query v5)

This file tracks the status of the React Query v5 migration.

## Current Progress: Phase 5 (Profile Pages)

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
- [ ] **Phase 6: Store Page**
  - [ ] Store product grid
- [ ] **Phase 7: Mutations & Invalidations**
  - [ ] Cart/wishlist/reviews mutations wrapped in `useMutation`

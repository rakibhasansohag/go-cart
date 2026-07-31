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

- [x] **Phase 8.7 — Seller: Coupons**
  - [x] Convert `[storeUrl]/coupons/page.tsx` → server prefetch
  - [x] Create `coupons-table.tsx` client component
  - [x] Delete + create mutation → `invalidateQueries(dashboard.coupons(storeUrl))`
  - [x] `coupon-details.tsx` form mutation → `invalidateQueries`
  - **Test**: Coupons table loads, create/delete works without reload

- [x] **Phase 8.8 — Seller: Orders + Optimistic Status**
  - [x] Convert `[storeUrl]/orders/page.tsx` → server prefetch
  - [x] Create `orders-table.tsx` client component
  - [x] `OrderStatusSelect` → `useMutation` + optimistic update on orders cache
  - [x] `ProductStatusSelect` → `useMutation` + optimistic update on orders cache
  - **Test**: Orders load, status changes update inline without reload

- [x] **Phase 8.9 — Seller: Shipping**
  - [x] Convert `[storeUrl]/shipping/page.tsx` → server prefetch (2 queries)
  - [x] Create `shipping-view.tsx` client component
  - [x] `store-default-shipping-details.tsx` form mutation → `invalidateQueries`
  - [x] `shippingRate-details.tsx` form mutation → `invalidateQueries`
  - **Test**: Shipping defaults and rates load, edit works without reload

- [x] **Phase 8.10 — Seller: Settings**
  - [x] Convert `[storeUrl]/settings/page.tsx` → server prefetch
  - [x] Create `store-settings-view.tsx` client component
  - [x] `store-details.tsx` form mutation → `invalidateQueries`
  - **Test**: Settings form loads prefetched data, save works without reload

---

## Phase 9: Payment Integrity & Provider Webhooks

Goal: make server-verified provider events the source of truth for payment state before adding automated refunds.

- [x] **Phase 9.1 — Authorization and ownership**
  - [x] Require the authenticated customer to own the order before creating or capturing a payment
  - [x] Verify order eligibility, amount, currency, and current payment state on the server
  - [x] Stop accepting trusted user IDs or payment status values from the browser
  - **Test**: A customer cannot create, capture, inspect, or update payment data for another customer's order

- [x] **Phase 9.2 — Payment event and idempotency model**
  - [x] Add a payment-event/audit model with provider event ID, order ID, event type, amount, currency, status, and timestamps
  - [x] Add unique constraints for provider event IDs and payment intent/capture IDs
  - [x] Define safe retry and duplicate-event behavior
  - **Test**: Replaying the same provider event does not duplicate payments or order updates

- [x] **Phase 9.3 — Stripe webhook**
  - [x] Add a dedicated Stripe webhook route with signature verification
  - [x] Reconcile successful, failed, cancelled, and refunded payments from verified webhook events
  - [x] Update `Order`, `PaymentDetails`, and audit records transactionally
  - **Test**: Verified events update the correct order once; invalid signatures and mismatched amounts are rejected

- [x] **Phase 9.4 — PayPal verification/webhook**
  - [x] Verify PayPal captures on the server and add provider webhook handling
  - [x] Reconcile successful, failed, reversed, and refunded captures
  - [x] Update `Order`, `PaymentDetails`, and audit records transactionally
  - **Test**: A browser-supplied capture response cannot mark an order as paid without provider verification

- [x] **Phase 9.5 — Query synchronization**
  - [x] Add centralized payment and order query keys where missing
  - [x] Prefetch payment/order state on relevant server pages
  - [x] Invalidate the customer order, payment history, seller order, and admin order caches after reconciled changes
  - **Test**: Payment status changes appear across customer and dashboard views without a manual reload

**Phase 9 acceptance (July 31, 2026):** Stripe sandbox payment, signed
webhook ingestion, invalid-signature rejection, and duplicate-event
idempotency passed. Payment tests (11/11), TypeScript, migration, and
customer order synchronization passed. PayPal implementation is accepted;
its deployed sandbox webhook verification is deferred and remains a release
check before enabling PayPal in production.

---

## Phase 10: Returns, Refunds & Disputes

Goal: deliver a complete post-purchase workflow connecting customers, sellers, administrators, payments, orders, and inventory.

- [x] **Phase 10.1 — Domain model and migration**
  - [x] Add `ReturnRequest`, `ReturnItem`, `ReturnEvidence`, `ReturnEvent`, and refund transaction records
  - [x] Define statuses, reasons, requested resolutions, actor roles, deadlines, and audit timestamps
  - [x] Relate requests to the customer, order, order group, order item, store, and payment
  - [x] Add indexes and constraints that prevent duplicate active requests for the same eligible quantity
  - **Test**: Prisma migration applies cleanly and invalid relationships or duplicate active requests are rejected

**Phase 10.1 acceptance (July 31, 2026):** The additive returns-domain
migration is applied to Neon, Prisma Client generation and schema validation
pass, and rollback-only database checks confirm that invalid relationships and
overlapping active return requests are rejected without leaving test records.

**Manual checkpoint before Phase 10.2:** Run `bun dev`, then run
`bun --no-env-file x prisma migrate status` in another terminal and expect
`Database schema is up to date!`. Optionally open
`bun --no-env-file x prisma studio` and confirm the empty `ReturnRequest`,
`ReturnItem`, `ReturnEvidence`, `ReturnEvent`, and `RefundTransaction` tables
exist. Customer-facing return screens intentionally begin after Phase 10.2
adds ownership, delivery, return-window, quantity, and amount validation.

- [x] **Phase 10.2 — Eligibility and transactional business rules**
  - [x] Enforce ownership, delivered-item status, return window, store policy, and refundable quantity
  - [x] Calculate refundable item, shipping, coupon, tax, and partial-refund amounts on the server
  - [x] Implement transactional state transitions with an append-only audit trail
  - [x] Prevent sellers from acting on requests belonging to another store
  - **Test**: Invalid transitions, expired requests, excess quantities, and cross-store access are rejected

**Phase 10.2 acceptance (July 31, 2026):** Server-owned eligibility and
refund calculations, runtime input validation, store-scoped authorization,
concurrency-safe transitions, and append-only audit events are implemented.
The focused return suite passes 17/17 tests, the full suite passes 28/28, and
a real Neon create → review → audit transaction passed before rolling back
cleanly with no test records retained.

**Manual checkpoint before Phase 10.3:** Stop the existing development server
once so Windows releases Prisma's query-engine file, then run `bun dev`. Confirm
`bun --no-env-file x prisma migrate status` reports the database is up to date.
There is intentionally no customer return form yet; Phase 10.3 will connect
these server rules to the order details and customer Returns Center.

- [x] **Phase 10.3 — Customer Returns Center**
  - [x] Add return initiation from eligible order items
  - [x] Support refund or exchange requests, reason selection, notes, quantity, and evidence uploads
  - [x] Add a customer request list and detail timeline with seller/admin responses
  - [x] Use server prefetch + `HydrationBoundary`, granular `Suspense`, and mutations with targeted invalidation
  - **Test**: A customer can submit and track a valid request without a full-page reload

**Phase 10.3 acceptance (July 31, 2026):** Eligible delivered order items
link to a secured return form with server-calculated estimates and Cloudinary
evidence uploads. The customer Returns Center and protected detail timeline use
server prefetch, hydrated Suspense queries, targeted invalidation, and polling
only while requests remain active. The full automated suite passes 31/31 tests,
TypeScript and touched-file lint pass, and private return pages are semantic,
theme-aware, responsive, and marked `noindex`.

### Phase 10.3.1 — Fulfillment status integrity prerequisite

- [x] Synchronize seller package changes to package items and derive the overall
  customer order status in one transaction
- [x] Derive package and overall order summaries when an individual item changes
- [x] Invalidate the customer order data cache and the affected seller order
  queries after status mutations
- [x] Show customer orders as `#ORD-…` and seller/store packages as `#PKG-…`
  while retaining UUIDs as internal database identifiers
- [ ] Replace unrestricted status dropdowns with a server-enforced, forward-only
  fulfillment state machine
- [ ] Permit cancellation only from eligible pre-delivery states; never move a
  cancelled, delivered, picked-up, returned, or refunded record backwards
- [ ] Replace the current informational **Cancel Package** dialog with an
  auditable customer cancellation request/contact flow and seller decision
- [ ] Add an explicit pickup completion state so `AwaitingPickup` cannot be
  mistaken for a completed pickup
- [ ] Keep return/refund/exchange statuses out of the normal fulfillment menu;
  expose return actions only after `Delivered` or completed pickup
- [ ] Record every fulfillment transition with actor, previous state, next state,
  timestamp, and optional reason
- **Test**: Invalid skips and backward transitions fail on the server; a valid
  seller transition updates item, package, and customer order views; cancellation
  remains available only before fulfillment becomes irreversible

**Planned fulfillment paths:**

- Delivery: `Pending → Confirmed → Processing → Ready for shipment → Shipped →
  Out for delivery → Delivered`
- Pickup: `Pending → Confirmed → Processing → Awaiting pickup → Picked up`
- Exception: `Cancelled` may be selected from an allowed pre-delivery state after
  customer contact; return/refund/exchange states begin only after delivery or
  pickup and are controlled by the Returns Center.

**Manual checkpoint before Phase 10.4:** Restart `bun dev`, change a paid package
through the currently available statuses until `Delivered`, then open that order
as its customer. Confirm the same delivery state appears on the order list,
overall order header, package, and item, and that the delivered item shows
**Request return**. Submit a refund or exchange request and confirm the browser
redirects to its timeline. Verify the request appears under **Account → Returns**,
survives a refresh, and creates matching `ReturnRequest`, `ReturnItem`,
`ReturnEvent`, and optional `ReturnEvidence` records in Prisma Studio.

- [ ] **Phase 10.4 — Seller return queue**
  - [ ] Add store-scoped return list, filters, detail review, and evidence display
  - [ ] Support approve, reject, request-more-information, receive-item, and exchange decisions
  - [ ] Add optimistic UI only for reversible low-risk status updates
  - [ ] Invalidate seller returns, orders, inventory, and customer request caches after decisions
  - **Test**: Sellers can process only their own store's requests and every action is audited

- [ ] **Phase 10.5 — Admin disputes**
  - [ ] Add an admin queue for escalated, overdue, and high-risk requests
  - [ ] Support evidence review, final decisions, internal notes, and actor attribution
  - [ ] Preserve the complete customer/seller/admin event timeline
  - **Test**: Admin decisions are permission-protected, auditable, and reflected in all affected views

- [ ] **Phase 10.6 — Provider refunds**
  - [ ] Execute full or partial Stripe refunds from approved requests
  - [ ] Execute full or partial PayPal refunds from approved requests
  - [ ] Use idempotency keys and verified provider responses/events
  - [ ] Reconcile `PaymentStatus`, order totals, return status, and refund audit records
  - **Test**: Retried refund requests cannot issue duplicate refunds

- [ ] **Phase 10.7 — Inventory and order synchronization**
  - [ ] Restock only received and restockable returned quantities
  - [ ] Update item, group, and overall order statuses consistently
  - [ ] Handle partial returns, partial refunds, exchanges, damaged items, and rejected returns
  - [ ] Invalidate inventory, product availability, order, payment, and return caches
  - **Test**: Partial and full return scenarios preserve correct stock, totals, and statuses

---

## Phase 11: Shipment Tracking & Notifications

Goal: keep customers, sellers, and administrators informed throughout fulfillment and post-purchase workflows.

- [ ] **Phase 11.1 — Shipment tracking model**
  - [ ] Add shipment, carrier, tracking number, shipment item, and tracking-event records
  - [ ] Support split and partial shipments per order group
  - **Test**: Multiple shipments can safely represent different items from one store order

- [ ] **Phase 11.2 — Seller fulfillment workflow**
  - [ ] Allow sellers to create shipments, assign items, and record carrier/tracking details
  - [ ] Synchronize shipment events with item, group, and order statuses
  - **Test**: Shipment creation and delivery events update the correct items and order summaries

- [ ] **Phase 11.3 — Customer tracking experience**
  - [ ] Add shipment cards and a tracking timeline to order details
  - [ ] Show split shipments, delivery estimates, delays, and delivered state
  - [ ] Prefetch tracking data and invalidate affected order/tracking queries after updates
  - **Test**: Customers can track every shipment associated with their order

- [ ] **Phase 11.4 — Notification center**
  - [ ] Add persisted in-app notifications with read/unread state
  - [ ] Notify relevant actors about payment, shipment, return, dispute, and refund events
  - [ ] Add email delivery behind a provider-neutral notification service
  - [ ] Prevent duplicate notifications when provider events are retried
  - **Test**: Each domain event produces the intended notification once for the correct recipient

---

## Phase 12: Automated Testing & CI

Goal: protect the critical marketplace workflows before production deployment.

- [ ] **Phase 12.1 — Test infrastructure**
  - [ ] Add unit/integration test tooling, isolated test environment variables, and deterministic fixtures
  - [ ] Add browser end-to-end testing for customer, seller, and admin roles
  - [ ] Add `test`, `test:integration`, and `test:e2e` scripts
  - **Test**: All suites run locally from documented commands

- [ ] **Phase 12.2 — Critical integration coverage**
  - [ ] Cover permissions, totals, coupon usage, inventory changes, order transitions, and query invalidation
  - [ ] Cover payment webhook verification, idempotency, retries, and refund reconciliation
  - [ ] Cover return eligibility, partial returns, disputes, and restocking
  - **Test**: Critical server workflows pass against an isolated test database

- [ ] **Phase 12.3 — End-to-end commerce journeys**
  - [ ] Cover browse → cart → checkout → payment → order history
  - [ ] Cover seller fulfillment → shipment tracking → delivery
  - [ ] Cover delivered item → return request → decision → refund/restock
  - **Test**: The complete customer, seller, and admin journeys pass in supported browsers

- [ ] **Phase 12.4 — Continuous integration**
  - [ ] Run formatting/linting, TypeScript, tests, and production build for every pull request
  - [ ] Cache dependencies safely and upload useful failure artifacts
  - [ ] Block merging when required checks fail
  - **Test**: A deliberately failing check prevents the pull request from passing

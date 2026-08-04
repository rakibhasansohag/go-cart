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

### Phase 10.3.1 — Centralized fulfillment integrity and role ownership

**Current priority 1:** Complete this state machine before continuing with the
seller return queue. A seller prepares and hands off only their own package;
GoCart logistics, verified carrier events, or an audited administrator action
own the delivery truth.

- [x] Synchronize seller package changes to package items and derive the overall
      customer order status in one transaction
- [x] Derive package and overall order summaries when an individual item changes
- [x] Invalidate the customer order data cache and the affected seller order
      queries after status mutations
- [x] Show customer orders as `#ORD-…` and seller/store packages as `#PKG-…`
      while retaining UUIDs as internal database identifiers
- [x] Keep the customer `Order`, each seller `Package` (`OrderGroup`), and each
      physical `Shipment` as separate records with independently derived statuses
- [x] Add fulfillment modes: platform fulfilled by default, seller fulfilled as
      an optional future path, and customer pickup
- [x] Replace unrestricted status dropdowns with a server-enforced, forward-only
      fulfillment state machine and an actor allowlist for every transition
- [x] Limit seller-controlled package states to `Pending → Accepted → Processing
→ Ready for handoff → Handed off`; sellers must not mark warehouse receipt,
      transit, out-for-delivery, or delivery in platform-fulfilled mode
- [x] Let warehouse/logistics, verified carrier events, or an audited admin
      advance `Awaiting receipt → Received at hub → Ready for dispatch → In transit
→ Out for delivery → Delivered`
- [x] Derive partial customer states from all packages and shipments so one
      seller or delivery does not mark a multi-store order fully delivered
- [x] Permit cancellation only from eligible pre-delivery states; never move a
      cancelled, delivered, picked-up, returned, or refunded record backwards
- [x] Replace the current informational **Cancel Package** dialog with an
      auditable customer cancellation request/contact flow and seller decision
- [x] Add an explicit pickup completion state so `AwaitingPickup` cannot be
      mistaken for a completed pickup
- [x] Require a reason code for a failed delivery attempt, allow an optional
      message, and route it to redelivery, hub return, or seller return
- [x] Keep return/refund/exchange statuses out of the normal fulfillment menu;
      expose return actions only after `Delivered` or completed pickup
- [x] Record every fulfillment transition with actor, previous state, next state,
      source, timestamp, reason, and idempotency key
- [x] Present every forward seller-preparation step: the immediate next step
      applies directly, skipping ahead requires explicit confirmation, completed
      steps cannot be selected again, and `Handed off` is non-interactive
- **Test**: Forward skips require confirmation in the UI and persist through the
  server, backward transitions fail, seller control stops at handoff, logistics
  can advance only received packages, and partial delivery remains partial

**Phase 10.3.1 acceptance (July 31, 2026):** Package preparation and shipment
execution now use separate persisted state machines. Seller controls stop at
handoff; audited admin logistics controls advance one step at a time; failed
attempts require a reason; pickup completion is explicit; order/item summaries
remain derived across every store package; customer cancellation requests and
seller decisions are persisted; and transition history records actor, source,
before/after status, timestamp, reason, and idempotency key. Existing packages
were migrated to one shipment each with audit snapshots. The full suite passes
52/52 tests, TypeScript passes, and touched-file lint has no errors.

**Planned fulfillment paths:**

- Seller preparation: `Pending → Accepted → Processing → Ready for handoff →
Handed off`
- Platform delivery: `Awaiting receipt → Received at hub → Ready for dispatch →
In transit → Out for delivery → Delivered`
- Pickup: `Pending → Confirmed → Processing → Awaiting pickup → Picked up`
- Delivery exception: `Out for delivery → Delivery attempt failed → Ready for
redelivery → Out for delivery`, or `Returned to hub → Returned to seller`
- Cancellation exception: an auditable request may terminate an eligible
  pre-handoff package; it is never implemented by moving a completed state
  backwards
- Post-delivery: return/refund/exchange begins only after verified delivery or
  pickup and remains controlled by the Returns Center

### Phase 10.3.2 — Order and package traceability

- [x] Keep UUIDs internal while presenting distinct `#ORD-…` customer-order and
      `#PKG-…` seller-package references
- [x] Show Order ID and Package ID together in seller fulfillment views and CSV
      exports
- [x] Show package references alongside the parent Order ID in customer history
      and order details
- [x] Correct the admin package-row label and show Order ID, Package ID, store,
      seller, customer, product/SKU, payment, overall status, and package status
- [x] Normalize friendly references and search Order ID, Package ID, full UUID,
      store, seller, customer, product name, and SKU where each role is authorized
- [x] Preserve store scoping so one seller can update only their package; derive
      `PartiallyShipped` until every store package reaches `Delivered`
- **Test**: Customer, seller, and admin searches resolve both friendly reference
  formats; seller results never expose another store's packages; mixed package
  delivery states do not mark the full customer order delivered

### Phase 10.3.3 — Notification system and demo automation priority gate

**Current priority 2:** Build this immediately after Phase 10.3.1 and before
resuming Phase 10.4. Manual seller/admin actions and automatic demo transitions
must use the same transition, audit, event, and notification pipeline.

**Timing contract — immediate work and cron work are independent:**

- Request-triggered events are immediate: placing an order, confirming payment,
  changing a status, requesting cancellation/return, or making an admin decision
  writes its business state, audit event, in-app notification, and email outbox
  job in the originating transaction
- After that transaction commits, Next.js `after()` attempts SMTP delivery so
  the user response is not blocked; success/failure is recorded on the outbox job
- The initiating browser invalidates its affected queries immediately. Other
  already-open customer/seller/admin sessions see the persisted notification on
  their next visibility-aware header poll (target 15–30 seconds) without needing
  a paid realtime service
- Cron never delays an ordinary notification. Its two responsibilities are to
  create due demo fulfillment transitions and retry pending/failed outbox jobs
- When cron creates an automatic status transition, that transition uses the
  same domain service and emits its in-app notification and email immediately
  within that cron invocation

#### Domain events and reliable delivery

**Foundation checkpoint (July 31, 2026):** The additive `DomainEvent`,
`Notification`, and `EmailOutbox` migration is deployed. Package preparation,
shipment, and customer return-request transactions now publish idempotent typed
events, resolve authorized recipients centrally, persist in-app notifications,
and enqueue one email job per recipient. The shared customer/seller/admin bell
and server-paginated `/notifications` page provide visibility-aware polling,
read state, unread filtering, and authorized deep links. SMTP dispatch,
preferences, template management, expanded event coverage, and retry cron remain
the next Phase 10.3.3 slices. Successful payment reconciliation now also emits
one customer payment confirmation and one paid-package notification for each
affected seller, with provider-scoped idempotency across webhook and server
verification races. The bell lazily fetches its five most recent records and
reuses the fresh TanStack Query cache when reopened; its visible-tab background
summary poll remains the free-tier fallback.

- [x] Add a provider-neutral domain-event/outbox model written in the same
      transaction as payment, fulfillment/status, return, and refund mutations
      (dispute events remain open because dispute mutation workflows do not exist yet)
- [x] Add unique event/idempotency keys so retries cannot create duplicate
      in-app notifications or emails
- [x] Create the in-app notification and email outbox job in the business
      transaction, then use Next.js `after()` to attempt SMTP immediately after the
      response; retain failed email jobs for scheduled retry
- [x] Make immediate dispatch safe to retry and best-effort: a crash after the
      response leaves the durable outbox job pending for recovery instead of losing
      the email or rolling back the successful business action
- [x] Store delivery attempts, last error, attempt count, next attempt time, and
      sent time without allowing an email failure to roll back a valid order update
- [ ] Replace the remaining JSON payload boundary with generated typed event
      payload schemas; the centralized recipient resolver is already in place

#### Demo-only automatic fulfillment

- [x] Add a per-package automation mode and `nextTransitionAt`; new paid test
      packages opt in only when the explicit environment switch is enabled
- [x] Add a secured, once-daily Vercel Cron route that selects due packages in
      bounded batches and advances each package by at most one valid step
- [x] Keep automation and recovery as separate secured jobs/routes: one advances
      due demo fulfillment; the other retries pending/failed email outbox jobs
- [ ] Run automatic steps through the exact server transition service used by
      sellers, logistics, and admins, with actor/source recorded as `SYSTEM`
- [x] In demo mode, simulate both sides of the journey in order: seller
      preparation/handoff, platform receipt/dispatch, and logistics delivery; still
      emit the correct role-scoped event at every boundary
- [x] Never auto-advance unpaid, cancelled, failed-delivery, delivered,
      picked-up, returned, refunded, disputed, or manually paused records
- [x] Prevent overlapping cron runs and make every run safe to repeat; record an
      automation-run summary and surface failures to admins
- [x] Provide a protected local/manual trigger for testing without waiting one
      day; it must use the same authorization and idempotency rules
- [x] Document environment controls with secure defaults:
  - `DEMO_FULFILLMENT_AUTOMATION_ENABLED=false`
  - `DEMO_FULFILLMENT_STEP_HOURS=24`
  - `DEMO_FULFILLMENT_BATCH_SIZE=100`
  - `EMAIL_NOTIFICATIONS_ENABLED=false`
  - `CRON_SECRET=<random secret>`
- [x] Treat `DEMO_FULFILLMENT_STEP_HOURS=24` as the minimum due interval, not an
      exact timer: Vercel Hobby executes cron only once daily and may run at any time
      within the configured UTC hour, so due work advances at the next cron window

#### In-app notification experience

**Context-and-cache checkpoint (August 2, 2026):** New order, package,
shipment, admin handoff, and return notifications include friendly `#ORD-…` and
`#PKG-…` context where applicable. The header loads only five recent records on
demand, keeps fresh results for one minute and cached results for five minutes,
and updates read state in-place instead of refetching every time the popover is
closed and reopened.

- [x] Add persisted notifications for customers, sellers, and admins with type,
      title, message, safe internal action URL, created time, read time, and source
      event
- [x] Add a shared header bell with unread count and a small recent-notification
      popover; also add a complete `/notifications` page reachable from customer,
      seller, and admin navigation
- [x] Mark one notification read when its action is opened, support **Mark all
      as read**, and navigate only to validated internal role-authorized routes
- [x] Add server-side pagination, unread/read state, category, role-relevant
      event type, and date filters
- [x] Server-prefetch the full page; use stable query keys, targeted invalidation,
      and 15–30 second polling only while the tab is visible instead of requiring a
      paid realtime service
- [x] Use native buttons/links, visible focus, useful accessible labels, a
      restrained unread announcement, responsive layout, and light/dark theme tokens

#### SMTP email and admin-controlled templates

- **Checkout and targeted-delivery checkpoint (August 2, 2026):** Cart
      rehydration now restores the product store identity required for
      store-scoped coupon totals, and checkout keeps its submit control locked
      with an accessible progress skeleton until the secure payment page takes
      over. Immediate SMTP dispatch is scoped to only the domain events created
      by the current payment, fulfillment, or return action; older pending jobs
      remain available exclusively to the recovery cron instead of being sent as
      an unrelated burst. Payment receipts show the original subtotal, coupon
      code/discount, shipping, products, and final paid amount, while the paid
      package event targets each affected seller. A secured, idempotent daily
      abandoned-checkout job can remind customers about unchanged saved carts
      after a configurable inactivity window and is disabled by default.
      Seller operational delivery now uses the store contact email rather than
      stale legacy profile data, while invalid addresses are excluded from the
      outbox without suppressing the corresponding in-app notification.

- [x] Restore store-scoped coupon calculations after local-cart rehydration and
      prevent duplicate checkout submissions during the order-to-payment handoff
- [x] Scope immediate outbox delivery to the source events from the current
      action; retain global pending/failed recovery for the dedicated cron only
- [x] Include coupon code and discount amount in payment/package receipts and
      immediately dispatch the matching paid-package email to each seller
- [x] Add an opt-in, bounded, idempotent abandoned-checkout reminder cron with
      product snapshots, totals, safe cart link, and free-tier environment controls
- [x] Prevent the cart empty-state flash during persisted-state hydration,
      recover legacy malformed cart storage, and reconcile saved items before
      showing cart content
- [x] Make seller coupon writes backend-authoritative: preserve total and
      per-customer limits, normalize codes case-insensitively, enforce store
      ownership, revalidate limits/store scope during cart persistence, and
      refresh the seller coupon query after mutations
- [x] Reduce cart-to-checkout latency by using lightweight auth for cart saves,
      fetching checkout cart/address/country data concurrently, caching the
      country catalog, prefetching the route, and showing a route-level skeleton

- **Template-management checkpoint (August 2, 2026):** The SMTP outbox now uses
      a responsive code-owned MJML 4 shell and records the source/version used
      for each successful send. Admins can edit a sanitized Jodit body, save a
      draft, preview desktop/mobile output, test-send, publish a versioned
      override, or restore the immutable default. The five currently emitted
      payment, paid-package, preparation, shipment, and return events have
      distinct event-specific defaults and realistic previews. Payment,
      paid-package, preparation, shipment, and return emails now include the
      relevant immutable item snapshots, quantities, SKU/size, safe product
      images, store, and applicable totals. Shipment messages also include the
      current service, delivery estimate, and failure note; return messages include
      the reason, requested resolution/refund, and customer note. The desktop
      template workspace keeps its template list in place while only the editor
      and preview pane scrolls. The remaining event families, locale support,
      preferences, and template activity history remain intentionally open.

- [x] Add `nodemailer` and `mjml` server dependencies and their required type
      declarations; reuse the already-installed `jodit-react` package for admin
      editing instead of introducing a second rich-text editor
- [x] Add a provider-neutral SMTP adapter with one reusable Nodemailer
      transporter, TLS configuration, connection verification, and secrets kept
      server-only
- [x] Support Gmail SMTP for the hobby deployment through a Google App Password,
      while allowing another SMTP provider through environment changes only
- [x] Add MJML as the server-side email renderer and create a polished,
      code-owned GoCart master layout with responsive/mobile-safe structure, branded
      header, preheader, status/summary card, Order/Package/Shipment references,
      primary CTA, support text, accessible contrast, and footer
- [x] Refine the reusable master layout with balanced outer spacing, padded
      transaction-detail cells, and customer-safe payment references while
      retaining complete provider identifiers only in internal payment records
- [ ] Seed a polished default template for every supported event family: account,
      order/payment, package/fulfillment, shipment/delivery attempt, cancellation,
      return/dispute, exchange, refund, and admin operational alert
- [ ] Add admin-only email-template management keyed by domain event and locale,
      including subject, preheader, body, CTA label, enabled state, allowed variables,
      plain-text fallback, draft/published version, preview, and test-send
- [x] Reuse the installed Jodit React editor for the editable body content only;
      keep the MJML shell, responsive grid, GoCart header/footer, security rules, and
      critical transaction fields controlled by the application
- [ ] Load Jodit client-side, use a restrained email-safe toolbar, insert allowed
      variables from a picker, and provide a polished admin layout with template
      list/search/filter, autosaved draft indicator, desktop/mobile preview tabs,
      send-test dialog, publish confirmation, and clear validation feedback
- [ ] Support three explicit admin actions for every event template: **Use
      default**, **Customize default**, and **Reset to default**; default templates
      remain immutable and cannot be deleted
- [x] Store only the custom override/version in the database. When no published
      custom override exists—or it is disabled, invalid, or fails compilation—the
      renderer automatically uses the matching code-owned default template
- [x] Sanitize Jodit HTML before storage and rendering, reject scripts, unsafe
      URLs and unknown variables, compile the final MJML only on the server, and
      reject publishing when compilation reports an error
- [ ] Generate and store/send both compiled responsive HTML and a meaningful
      plain-text alternative; record template source (`DEFAULT` or `CUSTOM`), version,
      editor, preview/test activity, and the version used for each email attempt
- [ ] Include a role-authorized deep link in each email and never expose private
      order, store, payment, or return data to the wrong recipient

#### Preferences and recipient rules

**Current gap (August 4, 2026):** Recipient routing is centralized for the
implemented payment, package, shipment, and return events, but there is no
per-user preference model or settings UI yet. `EMAIL_NOTIFICATIONS_ENABLED` is
only a global safety switch; it does not replace category/channel preferences.

- [x] Add per-user notification preferences by category and channel for
      customers, sellers, and admins, with sensible role-based defaults
- [x] Validate known domain-event payloads through typed Zod contracts before
      persisting events, while preserving provider-specific unknown events
- [ ] Keep visual template selection admin-owned: recipients choose whether an
      optional category may use email/in-app channels, while the system/admin chooses
      the published default or custom template used for that event
- [x] Keep required security and critical transaction notices enabled; allow
      optional email categories to be disabled while preserving essential in-app
      audit information
- [ ] Customer events: payment, package progress, shipment/delivery, cancellation,
      return, exchange, and refund
- [ ] Seller events: new paid package, cancellation request, return request,
      fulfillment exceptions, and seller/admin decisions
- [ ] Admin events: escalated disputes, payment/webhook failures, stuck
      automation, repeated SMTP failures, and exceptional overrides; do not notify
      every admin about every normal order by default

- **Test**: A manual action creates its in-app notification immediately and
  attempts email without waiting for cron; a cron-created transition emits the
  same outputs during its run; each transition produces exactly one audit event,
  one in-app notification per intended recipient, and at most one email per
  enabled preference; clicking marks it read and opens the authorized resource;
  filters and pagination run server-side; disabling automation performs no
  status writes; failed SMTP delivery retries without duplicating messages; MJML
  defaults render on desktop/mobile, Jodit overrides are sanitized, and an
  absent/disabled/broken custom template falls back to the default

**Manual checkpoint before Phase 10.4:** Restart `bun dev`, create a paid
multi-store order, and progress one package manually while triggering another
through the protected demo automation route. Confirm sellers can stop only at
handoff; the customer sees partial aggregate status; every intended role receives
one in-app notification; opening it marks it read and follows the correct link;
an enabled test email arrives immediately without invoking cron; switch one
event to a Jodit custom body, preview/test/publish it, then reset it and confirm
the default MJML template is used again. Disabled email preferences suppress
only optional mail. Finally complete delivery through the logistics/admin path
and confirm **Request return** appears only for the delivered item. Verify the matching
fulfillment audit, notification, outbox/email attempt, and automation-run records
in Prisma Studio.

**Priority execution order (current):** `finish 10.7 inventory/status
synchronization → finish 10.3.3 typed events and preferences → close 10.4/10.5
return operations → complete live 10.6 provider verification → Phase 11
shipment tracking → Phase 12 CI and end-to-end coverage`.

- [ ] **Phase 10.4 — Seller return queue**
  - [x] Add store-scoped return list, filters, detail review, and evidence display
  - [x] Support approve, reject, request-more-information, receive-item, and exchange decisions
  - [ ] Add optimistic UI only for reversible low-risk status updates
  - [ ] Invalidate seller returns, orders, inventory, and customer request caches after decisions
  - **Test**: Sellers can process only their own store's requests and every action is audited

- [ ] **Phase 10.5 — Admin disputes**
  - [ ] Add an admin queue for escalated, overdue, and high-risk requests
  - [ ] Support evidence review, final decisions, internal notes, and actor attribution
  - [ ] Preserve the complete customer/seller/admin event timeline
  - **Test**: Admin decisions are permission-protected, auditable, and reflected in all affected views

- [ ] **Phase 10.6 — Provider refunds**
  - [x] Execute full or partial Stripe refunds from approved requests
  - [x] Execute full or partial PayPal refunds from approved requests
  - [x] Use idempotency keys and verified provider responses/events
  - [x] Reconcile `PaymentStatus`, order totals, return status, and refund audit records
  - **Test**: Retried refund requests cannot issue duplicate refunds

**Phase 10.6 Stripe implementation checkpoint (August 4, 2026):** Admins can
issue an idempotent Stripe refund for a refund-pending request. The durable
`RefundTransaction` records provider state and the signed `charge.refunded`
webhook reconciles pending transactions, return status, payment status, and
customer notifications. A live Stripe sandbox refund test remains required
before marking the phase complete; PayPal refunds remain open.

- [ ] **Phase 10.7 — Inventory and order synchronization**
  - [x] Restock only received and restockable returned quantities through an admin-only, idempotent reconciliation action
  - [x] Update fully returned/refunded item, group, and overall order statuses consistently; preserve delivered aggregate status for partial returns
  - [ ] Handle partial returns, partial refunds, exchanges, damaged items, and rejected returns
  - [x] Refresh admin return, inventory, and order caches after reconciliation
  - **Test**: Unit coverage for existing return transitions passes; a live partial/full restock scenario remains before phase completion

---

## Phase 11: Centralized Shipment Tracking & Notification Expansion

Goal: connect physical shipments to the centralized fulfillment state machine,
then expand the Phase 10.3.3 notification foundation across the complete
post-purchase workflow.

- [ ] **Phase 11.1 — Shipment tracking model**
  - [ ] Add shipment, carrier, tracking number, shipment item, tracking event,
        delivery attempt, and proof-of-delivery records
  - [ ] Support split and partial shipments per order group
  - [ ] Allow compatible packages to be consolidated without forcing a ready
        package to wait indefinitely for another store
  - **Test**: Multiple shipments can safely represent different items from one
    store order, and one shipment can carry compatible packages without merging
    their seller ownership or audit history

- [ ] **Phase 11.2 — Seller handoff and centralized logistics workflow**
  - [ ] Let sellers prepare and hand off their own package, but never claim
        warehouse receipt or customer delivery in platform-fulfilled mode
  - [ ] Let warehouse/logistics or audited admins receive packages, assign
        shipment items, dispatch shipments, and record delivery exceptions
  - [ ] Accept verified carrier events and synchronize them with item, package,
        shipment, and derived order statuses
  - **Test**: Seller handoff, warehouse receipt, split dispatch, failed attempt,
    retry, and delivery update only the correct records and authorized views

- [ ] **Phase 11.3 — Customer tracking experience**
  - [ ] Add shipment cards and a tracking timeline to order details
  - [ ] Show Order ID, Package ID, Shipment ID, split shipments, delivery
        estimates, attempts, delays, proof, and partial/full delivered state
  - [ ] Prefetch tracking data and invalidate affected order/tracking queries after updates
  - **Test**: Customers can track every shipment associated with their order

- [ ] **Phase 11.4 — Notification coverage and operations**
  - [ ] Reuse the Phase 10.3.3 event/outbox pipeline for shipment, delivery
        attempts, return deadlines, dispute escalation, refund, exchange, and
        inventory-reconciliation events
  - [ ] Add an admin delivery-health view for pending/failed email jobs,
        automation failures, retries, and notification audit records
  - [ ] Add retention rules for notification bodies and delivery logs without
        deleting immutable business audit events
  - [ ] Document how to replace Gmail SMTP or the database outbox with a
        dedicated provider/queue without changing domain mutation code
  - **Test**: Each event reaches only its intended customer, seller, or admin
    once, and operational failures can be retried and audited safely

---

## Phase 12: Automated Testing & CI

Goal: protect the critical marketplace workflows before production deployment.

- [ ] **Phase 12.1 — Test infrastructure**
  - [ ] Add unit/integration test tooling, isolated test environment variables, and deterministic fixtures
  - [x] Add a repeatable deterministic demo fixture generator for 1,000 orders across the admin, seller, and customer test accounts
  - [x] Seed realistic generic catalog names, three variant image views, and stable empty-image fallbacks for visual QA
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

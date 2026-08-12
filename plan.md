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
- [x] Replace the remaining JSON payload boundary with generated typed event
      payload schemas; the centralized recipient resolver is already in place

#### Demo-only automatic fulfillment

- [x] Add a per-package automation mode and `nextTransitionAt`; new paid test
      packages opt in only when the explicit environment switch is enabled
- [x] Add a secured, once-daily Vercel Cron route that selects due packages in
      bounded batches and advances each package by at most one valid step
- [x] Keep automation and recovery as separate secured jobs/routes: one advances
      due demo fulfillment; the other retries pending/failed email outbox jobs
- [x] Run automatic steps through the exact server transition service used by
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
- [x] Seed a polished default template for every supported event family: account,
      order/payment, package/fulfillment, shipment/delivery attempt, cancellation,
      return/dispute, exchange, refund, and admin operational alert
- [x] Add admin-only email-template management keyed by domain event and locale,
      including subject, preheader, body, CTA label, enabled state, allowed variables,
      plain-text fallback, draft/published version, preview, and test-send
- [x] Reuse the installed Jodit React editor for the editable body content only;
      keep the MJML shell, responsive grid, GoCart header/footer, security rules, and
      critical transaction fields controlled by the application
- [x] Load Jodit client-side, use a restrained email-safe toolbar, insert allowed
      variables from a picker, and provide a polished admin layout with template
      list/search/filter, autosaved draft indicator, desktop/mobile preview tabs,
      send-test dialog, publish confirmation, and clear validation feedback
- [x] Support three explicit admin actions for every event template: **Use
      default**, **Customize default**, and **Reset to default**; default templates
      remain immutable and cannot be deleted
- [x] Store only the custom override/version in the database. When no published
      custom override exists—or it is disabled, invalid, or fails compilation—the
      renderer automatically uses the matching code-owned default template
- [x] Sanitize Jodit HTML before storage and rendering, reject scripts, unsafe
      URLs and unknown variables, compile the final MJML only on the server, and
      reject publishing when compilation reports an error
- [x] Generate and store/send both compiled responsive HTML and a meaningful
      plain-text alternative; record template source (`DEFAULT` or `CUSTOM`), version,
      editor, preview/test activity, and the version used for each email attempt
- [x] Include a role-authorized deep link in each email and never expose private
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
- [x] Keep visual template selection admin-owned: recipients choose whether an
      optional category may use email/in-app channels, while the system/admin chooses
      the published default or custom template used for that event
- [x] Keep required security and critical transaction notices enabled; allow
      optional email categories to be disabled while preserving essential in-app
      audit information
- [x] Customer events: payment, package progress, shipment/delivery, cancellation,
      return, exchange, and refund
- [x] Seller events: new paid package, cancellation request, return request,
      fulfillment exceptions, and seller/admin decisions
- [x] Admin events: escalated disputes, payment/webhook failures, stuck
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

- [x] **Phase 10.4 — Seller return queue**
  - [x] Add store-scoped return list, filters, detail review, and evidence display
  - [x] Support approve, reject, request-more-information, receive-item, and exchange decisions
  - [x] Add optimistic UI only for reversible low-risk status updates
  - [x] Invalidate seller returns, orders, inventory, and customer request caches after decisions
  - **Test**: Sellers can process only their own store's requests and every action is audited

- [x] **Phase 10.5 — Admin disputes**
  - [x] Add an admin queue for escalated, overdue, and high-risk requests
  - [x] Support evidence review, final decisions, internal notes, and actor attribution
  - [x] Preserve the complete customer/seller/admin event timeline
  - **Test**: Admin decisions are permission-protected, auditable, and reflected in all affected views

- [x] **Phase 10.6 — Provider refunds**
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

- [x] **Phase 10.7 — Inventory and order synchronization**
  - [x] Restock only received and restockable returned quantities through an admin-only, idempotent reconciliation action
  - [x] Update fully returned/refunded item, group, and overall order statuses consistently; preserve delivered aggregate status for partial returns
  - [x] Aggregate terminal partial-return quantities across requests and finalize an order line only when its full quantity is refunded or exchanged
  - [x] Handle damaged-item disposition and rejected-return inventory outcomes
  - [x] Refresh admin return, inventory, and order caches after reconciliation
  - **Test**: Unit coverage for existing return transitions passes; a live partial/full restock scenario remains before phase completion

---

## Phase 11: Centralized Shipment Tracking & Notification Expansion

Goal: connect physical shipments to the centralized fulfillment state machine,
then expand the Phase 10.3.3 notification foundation across the complete
post-purchase workflow.

- **Audit status (2026-08-10)**: Completed. Shipment/package assignments,
  transactional tracking mutations, authenticated carrier replay protection,
  hydrated customer timelines, typed notification events, delivery audits, and
  secured retention cleanup are implemented and covered by the repository test
  suite plus the seeded integration invariant check.

- [x] **Phase 11.1 — Shipment tracking model**
  - [x] Add shipment carrier/tracking metadata, shipment items, tracking events,
        delivery attempts, and proof-of-delivery fields
  - [x] Replace the one-to-one package/shipment relation with an explicit
        package-to-shipment assignment model that supports quantities
  - [x] Support split and partial shipments per order group without assigning
        more than the unshipped quantity of an order item
  - [x] Allow compatible packages to be consolidated without forcing a ready
        package to wait indefinitely for another store
  - [x] **Test**: Multiple shipments can safely represent different items from one
    store order, and one shipment can carry compatible packages without merging
    their seller ownership or audit history (`src/lib/shipments/assignments.test.ts`
    and `prisma/integration-check.ts`)

- [x] **Phase 11.2 — Seller handoff and centralized logistics workflow**
  - [x] Let sellers prepare and hand off their own package, but never claim
        warehouse receipt or customer delivery in platform-fulfilled mode
  - [x] Let audited admins receive and dispatch the current one-package shipment
        through the centralized state machine
  - [x] Add transactional shipment-item assignment, delivery-attempt creation,
        tracking-event creation, and proof-of-delivery audit mutations
  - [x] Accept authenticated and idempotent carrier webhook events and
        synchronize them with item, package,
        shipment, and derived order statuses
  - [x] **Test**: Assignment invariants, failed-attempt fixtures, duplicate provider
    event protection, and full shipment invariants pass in the integration check;
    seller/admin authorization remains enforced by the existing server actions

- [x] **Phase 11.3 — Customer tracking experience**
  - [x] Add a shipment status card and fulfillment-transition history to order details
  - [x] Render the persisted tracking-event and delivery-attempt timeline instead
        of only a static status milestone bar
  - [x] Show Order ID, Package ID, Shipment ID, shipment contents, split shipments, delivery
        estimates, attempts, delays, proof, and partial/full delivered state
  - [x] Add a centralized tracking query key, server prefetch/hydration, and
        targeted order/tracking invalidation after mutations
  - [x] **Test**: Customer tracking uses the authenticated `getShipmentTracking(orderId)`
    query and the seeded split/consolidated records pass the integration check

- [x] **Phase 11.4 — Notification coverage and operations**
  - [x] Reuse the Phase 10.3.3 event/outbox pipeline for package, shipment, and
        return-status changes
  - [x] Add typed, recipient-scoped events for delivery
        attempts, return deadlines, dispute escalation, refund, exchange, and
        inventory-reconciliation events
  - [x] Add an admin delivery-health view for pending/failed email jobs,
        automation failures, sent jobs, and retries
  - [x] Add notification audit records to the health view and protect retries
        with status eligibility plus idempotent compare-and-set updates
  - [x] Add retention rules and a secured cleanup job for notification bodies
        and delivery logs without
        deleting immutable business audit events
  - [x] Document how to replace Gmail SMTP or the database outbox with a
        dedicated provider/queue without changing domain mutation code
  - [x] **Test**: Existing notification uniqueness checks plus the delivery-audit
    CAS paths and integration notification invariants pass; SMTP remains disabled
    in the isolated E2E profile by design

---

## Phase 12: Automated Testing & CI

Goal: protect the critical marketplace workflows before production deployment.

- **Audit status (2026-08-12)**: In progress. The repository has 115 passing Vitest
  tests, a deterministic demo seed, and an opt-in Playwright public smoke
  foundation. The isolated Docker integration check now performs concurrent
  payment replay and return-overlap protection checks, real Stripe refund-event
  settlement, partial/full return restocking, and parent order-status propagation
  in addition to payment, return, shipment, GoCoins, and notification invariants.
  The public browser suite now passes six Chromium journeys covering browse,
  keyboard search, empty search, empty cart continuation, and unauthenticated
  checkout redirect. The isolated Docker seed is now bound to the synchronized
  Clerk customer, seller, and admin IDs, including 1,000 customer orders and the
  seller demo store. The local protected suite now passes all 11 Clerk setup,
  customer, seller, and admin checks with a 90-second protected-test budget for
  Windows cold compilation. Next development redirects and browser teardown can
  still emit non-blocking hook/stream warnings, while production build and all
  route/content assertions pass.

- [x] **Phase 12.1 — Test infrastructure**
  - [x] Add Vitest unit-test tooling and deterministic fixtures
  - [x] Add an isolated local PostgreSQL integration-test database via Docker,
        an `.env.e2e.local` contract, automatic migration/seed helper, and reset
        command; this avoids connecting E2E runs to Neon production or branches
  - [x] Add a repeatable deterministic demo fixture generator for 1,000 orders across the admin, seller, and customer test accounts
  - [x] Seed realistic generic catalog names, three variant image views, and stable empty-image fallbacks for visual QA
  - [x] Add Playwright configuration, Chromium projects, and opt-in public and
        protected customer, seller, and admin journeys against isolated data
  - [x] Add a fail-closed E2E runtime guard that rejects production APP_ENV,
        database URL mismatches, live payment keys, non-sandbox PayPal, enabled
        email/automation, or non-test auth configuration
  - [x] Add a guarded one-command staging anonymizer that preserves IDs, roles,
        relationships, statuses, and totals while replacing personal/provider data
  - [x] Add opt-in Clerk Testing Token setup and protected customer, seller, and
        admin authorization specs with local Clerk/DB role synchronization
  - [x] Add a guarded Clerk-to-Prisma E2E user synchronizer that applies USER,
        SELLER, and ADMIN roles only to the isolated staging database
  - [x] Synchronize Clerk users before deterministic seeding and assign seeded
        orders/store ownership to the configured E2E customer and seller IDs
  - [x] Add unit, integration, and E2E scripts while retaining `test` as the
        complete non-browser unit suite
  - [x] Document isolated database, public smoke, and protected commerce test
        commands in `docs/testing.md`
  - [x] **Test**: All suites run locally from documented commands (`bun run
        db:e2e:prepare`, then `bun run test:e2e:local`)
<!-- s -->
- [ ] **Phase 12.2 — Critical integration coverage**
  - [x] Keep the existing focused unit coverage for payment security/status,
        fulfillment transitions, return rules/reconciliation, notifications,
        email rendering/outbox, and loyalty helpers
  - [x] Cover real database permissions, totals, coupon usage, inventory changes,
        and order transitions against the isolated PostgreSQL database
  - [ ] Cover query invalidation against the real application runtime
    - [x] Add a local Docker integration smoke check for seeded role permissions,
          order/group/item totals, coupon usage limits, order transitions, and
          non-negative inventory quantities, plus paid amount/payment-event
          uniqueness invariants, return/refund quantities, and shipment/carrier
          idempotency invariants, GoCoins balance/idempotency invariants, and
          domain-event/notification uniqueness invariants
  - [x] Cover payment webhook event idempotency, provider reconciliation, and
        refund reconciliation against the database; signature verification remains
        covered at the provider boundary
  - [x] Cover concurrent partial returns, full settlement, parent status
        propagation, and idempotent restocking against the database
  - [ ] Cover dispute workflows and their refund/return consequences
  - [x] Cover split/consolidated shipment invariants and carrier-event idempotency
  - [x] Cover concurrent GoCoins award/redemption invariants with an atomic
        balance-guarded redemption decrement and idempotency checks
  - [x] Cover concurrent payment-event replay and active return-request overlap
        protection against the isolated database, with temporary fixtures cleaned
        up after each check
  - [x] Add Stripe signature-boundary tests, PayPal verification tests, and
        Stripe/PayPal provider event-mapping tests for ignored, paid, duplicate,
        and refund-related events
  - [x] **Test**: Critical server workflows pass against an isolated test database
        with 1,000 seeded orders (`bun run test:integration:local`)

- [ ] **Phase 12.3 — End-to-end commerce journeys**
  - [x] Add public browse-route and unauthenticated checkout-redirect smoke coverage
  - [x] Add public keyboard search, deterministic empty-search, and empty-cart
        keyboard-continuation coverage against the isolated test environment
  - [x] Add opt-in protected customer tracking, seller fulfillment workspace, and
        admin delivery-health authorization specs
  - [x] Verify four protected role-boundary checks and six authenticated commerce
        surfaces plus Clerk setup in Chromium (11/11 passing locally)
  - [ ] Cover browse → cart → checkout → payment → order history
  - [ ] Cover seller fulfillment → shipment tracking → delivery
  - [ ] Cover delivered item → return request → decision → refund/restock
  - [ ] Cover keyboard-only search, checkout, and critical admin/seller actions
        end to end; public search/cart keyboard checks are complete, while
        authenticated checkout and dashboard keyboard mutation paths remain open
  - [ ] **Test**: The complete customer, seller, and admin journeys pass in supported browsers

- [ ] **Phase 12.4 — Continuous integration**
  - [x] Run linting, TypeScript, Vitest, and a production build for commits pushed
        to `main` or `dev`
  - [x] Pin the Bun runtime, restrict workflow token permissions to read-only,
        and add a test-environment-only public E2E job with Playwright report upload
  - [x] Add an explicit whitespace/formatting check; lint warnings remain a
        tracked baseline (current Next 16 audit: 0 errors, 165 warnings)
  - [x] Run database integration tests in CI with an isolated PostgreSQL service;
        protected Playwright remains dependent on external Clerk/network access
  - [x] Cache Bun dependencies safely; Playwright reports upload on E2E failure
        remains configured
  - [ ] Configure GitHub branch protection so required checks block merging
        (deferred for the current single-maintainer push-based workflow)
  - [x] **Test**: A successful commit pushed to `dev` runs the build, unit-test,
        and isolated database integration checks in GitHub Actions

---

## Phase 13: PostgreSQL Full-Text Search (Elasticsearch Replacement)

Goal: replace the paid Elasticsearch dependency with zero-cost native PostgreSQL
full-text search using `pg_trgm`, `tsvector`, and `unaccent` — all confirmed
available on the Neon goCart project. The legacy Elasticsearch client and index
routes have now been removed, and the header search UI is wired to
`/api/search?q=`. The remaining work is browse relevance, query normalization,
and automated search coverage.

- **Audit status (2026-08-08)**: Reopened for search correctness and coverage.
  Elasticsearch is removed, the migration is applied, autocomplete uses native
  PostgreSQL search, and the UI is wired. Browse results still use Prisma
  `contains` filters ordered mainly by views rather than PostgreSQL relevance;
  runtime query normalization also strips accented characters instead of using
  the same unaccented text-search pipeline.

**Why PostgreSQL over a third-party search service:**
- `pg_trgm` + `tsvector` run inside Neon — zero extra infra, zero cost
- `unaccent` removes accent sensitivity (important for international product names)
- `pg_trgm` provides trigram similarity for typo-tolerance
- Combined ranked weighted search covers name, brand, and description fields
- Neon PG 18 is already running on the goCart project

- [x] **Phase 13.1 — Database: enable extensions and add search vector column**
  - [x] Enable `pg_trgm` and `unaccent` via a Prisma migration (`CREATE EXTENSION IF NOT EXISTS`)
  - [x] Add a `searchVector tsvector` generated column to `Product` using `to_tsvector('english', immutable_unaccent(coalesce(name,'') || ' ' || coalesce(brand,'') || ' ' || coalesce(description,'')))`
  - [x] Add a GIN index on the `searchVector` column for fast `@@` queries
  - [x] Add a GIN trigram index on `Product.name` for autocomplete/prefix suggestions
  - [x] Add a GIN trigram index on `ProductVariant.variantName` for variant-level search
  - **Test**: Migration `20260807150000_postgres_fts` applied successfully; Prisma Client generated

- [ ] **Phase 13.2 — Remove Elasticsearch and create the search service**
  - [x] Delete `src/lib/elasticsearch.ts` and remove `@elastic/elasticsearch` from `package.json`
  - [x] Create `src/lib/search.ts` — a typed server-only search service using `db.$queryRaw` with:
    - Ranked full-text search: `ts_rank(searchVector, query)` for relevance sorting
    - Trigram similarity fallback: `similarity(name, $query)` for short/partial queries
    - [ ] Apply `unaccent` normalization to runtime query tokens as well as the stored vector
    - Result shape: `{ name, link, image }` — matches existing `SearchResult` type
    - [x] Maximum 20 results by default
    - [ ] Add a bounded configurable `minSimilarity` threshold and deterministic
          ranking across product and variant matches
  - [x] Create `src/app/api/search/route.ts` (the route `search.tsx` calls):
    - Accept `?q=` or `?search=` query param; validate max 100 chars
    - Call the search service; return `SearchResult[]` JSON
    - Mark `export const dynamic = 'force-dynamic'`
  - [x] Delete `src/app/api/search-products/route.ts` (replaced by above)
  - [x] Delete `src/app/api/index-products/route.ts` (no external index needed — PG maintains `tsvector` automatically via generated column)
  - [ ] **Test**: Search service and endpoint cover empty, overlong, accented,
        typo, short-prefix, duplicate-variant, and database-error cases

- [ ] **Phase 13.3 — Browse page: integrate ranked search with filters**
  - [x] Update `src/queries/product.ts` browse query to support case-insensitive and multi-field search across product name, description, brand, variantName, variantDescription, SKU, and keywords
  - [x] Ensure all existing browse filters (category, store, offer, price, rating, size, color) compose correctly with search
  - [ ] Use PostgreSQL full-text/trigram candidate IDs and relevance as the
        default browse ordering while preserving explicit user-selected sorts
  - [ ] Keep cursor pagination stable when relevance scores tie
  - [ ] **Test**: Browse search composes with every filter and returns stable,
        accent-insensitive, typo-tolerant ranked pages

- [x] **Phase 13.4 — Search UI: debounced autocomplete suggestions**
  - [x] Update `search.tsx` to call `/api/search?q=` with debouncing and `AbortController` request cancellation
  - [x] Add keyboard navigation (ArrowDown, ArrowUp, Enter, Escape) to autocomplete suggestions
  - [x] Add ARIA combobox attributes (`role="combobox"`, `aria-expanded`, `aria-activedescendant`)
  - [x] Add "No products found for..." empty state and click-outside listener
  - [ ] Add component/E2E tests for keyboard navigation, focus behavior,
        AbortController cancellation, click-outside, loading, failure, and empty states

- [x] **Phase 13.5 — Clean up environment and CI**
  - [x] Verified `.env.example` has no `ELASTICSEARCH` variables
  - [x] Verified `.github/workflows/ci.yml` has no Elasticsearch dependencies
  - [x] Verified `bun run typecheck` and `bun run test` (91/91 tests) pass with zero Elasticsearch imports remaining
  - [x] **Test**: `rg -i 'elasticsearch' src` returns zero matches

---

## Phase 14: Marketplace Funds Flow & Seller Settlement Decision

Goal: decide and implement how a real multi-vendor order moves money from the
customer to each seller before adding more optional growth features.

- **Audit status (2026-08-08)**: No connected-account onboarding, platform-fee,
  transfer, payout, or transfer-reversal implementation was found. This phase is
  a product-owner decision gate; do not select a charge or settlement pattern
  until the owner confirms the business relationship and payout timing.

- [ ] **Phase 14.1 — Business and responsibility decisions**
  - [ ] Confirm whether goCart or each seller is the merchant the customer is
        paying, including whose name appears on receipts/statements
  - [ ] Confirm whether one checkout may contain multiple sellers and whether
        seller funds release immediately or only after delivery/return-risk gates
  - [ ] Define commission, payment-fee, tax, shipping, coupon, GoCoins, refund,
        dispute, negative-balance, and chargeback ownership
  - [ ] Confirm launch countries/currencies and seller payout eligibility
  - [ ] Produce and approve a dedicated marketplace payments recommendation

- [ ] **Phase 14.2 — Seller financial onboarding**
  - [ ] Add connected-account identity, onboarding status, capability status,
        requirements, and payout-readiness fields without storing sensitive KYC data
  - [ ] Add hosted/embedded onboarding, account management, requirement alerts,
        and seller earnings/payout access based on the approved configuration
  - [ ] Process authenticated account/capability webhooks idempotently
  - [ ] Prevent selling or settlement when required capabilities are inactive

- [ ] **Phase 14.3 — Marketplace ledger, commissions, and settlement**
  - [ ] Add immutable per-order-group ledger entries for gross amount, discounts,
        shipping, tax, provider fees, platform commission, refunds, reversals,
        seller payable, and payout status using decimal/minor-unit-safe arithmetic
  - [ ] Allocate multi-seller order discounts and GoCoins deterministically
  - [ ] Create idempotent transfers/settlements only after the approved release gate
  - [ ] Reconcile provider balances, transfers, payouts, and internal ledger totals

- [ ] **Phase 14.4 — Reversals and operations**
  - [ ] Reverse or adjust seller settlement for cancellations, partial refunds,
        returns, disputes, chargebacks, failed asynchronous payments, and fraud holds
  - [ ] Add admin/seller views for pending, blocked, paid, reversed, and failed settlements
  - [ ] Add retry, alerting, audit, and manual-review flows without duplicating money movement
  - [ ] **Test**: Multi-seller payment, partial refund, dispute, failed transfer,
        retry, and payout reconciliation preserve exact ledger/provider equality

---

## Phase 15: Production Security, Reliability & Operations

Goal: make the application safe and operable under real customer traffic.

- [ ] **Phase 15.1 — Authorization and abuse-resistance audit**
  - [ ] Test every server action and route for customer, seller-owner, other-seller,
        admin, unauthenticated, and suspended-account access
  - [ ] Fix existing analytics ownership leakage before exposing seller analytics
  - [ ] Add rate limits and abuse controls for auth-sensitive writes, checkout,
        search, Q&A, image generation, notification retries, and check-ins
  - [ ] Add CSRF/origin protections where cookie-authenticated mutations need them

- [ ] **Phase 15.2 — Secrets and browser security**
  - [ ] Use least-privilege provider credentials, separate environments, rotation
        procedures, and automated secret scanning
  - [ ] Add a tested Content Security Policy and security headers compatible with
        Clerk, Stripe/PayPal, Cloudinary, and application assets
  - [ ] Add dependency vulnerability review and a documented patch cadence

- [ ] **Phase 15.3 — Observability and recovery**
  - [ ] Add structured logs with request/event correlation IDs and secret/PII redaction
  - [ ] Add free-tier or self-hostable error tracking, uptime checks, and alerts for
        payments, webhooks, email outbox, cron jobs, search, and settlement
  - [ ] Define service-level indicators for checkout success, webhook lag, outbox
        lag, search latency, and settlement reconciliation
  - [ ] Automate database backups and complete a documented restore drill
  - [ ] Add staging, deployment, rollback, incident, and provider-outage runbooks

- [ ] **Phase 15.4 — Launch gate**
  - [ ] Run load tests for browse/search, checkout, webhooks, notifications, and dashboards
  - [ ] Complete accessibility, privacy/retention, legal-policy, and operational reviews
  - [ ] **Test**: Staging passes the Phase 12 suites, restore drill, rollback drill,
        and a production-readiness checklist with named owners

---

## Phase 16: Seller & Admin Analytics

Goal: turn the existing dashboard prototypes into authorized, payment-grounded,
actionable analytics without a third-party analytics dependency.

- [ ] **Phase 16.1 — Analytics correctness and access foundation**
  - [ ] Require seller role plus store ownership in every seller analytics query;
        never return customer PII for another seller's store
  - [ ] Define GMV, recognized revenue, net seller revenue, order count, active
        store, refund rate, return rate, repeat customer, and date/timezone semantics
  - [ ] Include only the correct payment/order states and remove hard-coded growth percentages
  - [ ] Use database aggregation and stable pagination instead of loading all order groups
  - [ ] Add query-level authorization, aggregation, empty-state, and large-fixture tests

- [ ] **Phase 16.2 — Seller analytics**
  - [ ] Revenue over time with daily/weekly/monthly controls and comparable prior periods
  - [ ] Top products and variants by net revenue, gross revenue, and unit count
  - [ ] Average order value, repeat-customer rate, return/refund rate, and stock risk
  - [ ] Server-prefetch the initial range, hydrate the same stable query key, and
        invalidate only affected analytics after reconciled commerce events
  - [ ] **Test**: Correct charts render from demo fixtures with accessible tables
        or summaries and honest empty states

- [ ] **Phase 16.3 — Admin analytics**
  - [ ] Platform GMV, net platform revenue, paid order count, and active stores over time
  - [ ] Top stores plus return/refund/dispute and settlement-risk signals
  - [ ] Add outbox, webhook, cron, search, and settlement health metrics
  - [ ] **Test**: Admin-only data stays inaccessible to sellers and customers

---

## Phase 17: Customer Growth & Merchandising Backlog

These features are valuable, but they follow the Phase 11-16 correctness,
payments, testing, and launch gates unless product priorities explicitly change.

### Phase 17.1 — Product Q&A

Goal: let customers ask questions on product pages while sellers and eligible
buyers provide moderated public answers.

- [ ] Migrate the legacy static `Question { question, answer }` model to authored
      `ProductQuestion`, `ProductAnswer`, and unique per-user helpful-vote records
- [ ] Define verified-buyer eligibility, seller official answers, edit history,
      visibility/moderation states, reports, rate limits, and spam controls
- [ ] Sanitize/validate content and enforce author, seller-owner, and admin permissions
- [ ] Notify the owning seller through the typed notification/outbox pipeline
- [ ] Server-render crawlable public Q&A; prefetch the initial thread and use
      accessible native controls plus targeted mutation invalidation
- [ ] Add metadata/structured content only where it truthfully matches visible Q&A
- [ ] **Test**: Authorization, moderation, duplicate votes, notification recipients,
      keyboard access, and hidden-content indexability all pass

### Phase 17.2 — GoCoins Loyalty & Rewards Correctness

Goal: keep the implemented GoCoins experience while making its accounting safe
under retries, concurrency, failed payments, cancellations, refunds, and abuse.

- [x] Add `LoyaltyAccount`, `LoyaltyTransaction`, `LoyaltyRedemption`, and
      `DailyCheckIn` data foundations and applied migrations
- [x] Add checkout redemption UI, rewards dashboard/history, daily check-in
      calendar, user-bound milestone coupons, and in-app reward notifications
- [x] Enforce the current 100-coin minimum and 30% product-subtotal cap in helpers
- [ ] Move order creation, inventory decrement, coupon use, coin validation,
      conditional balance decrement, ledger rows, and cart completion into one
      atomic transaction or compensating workflow
- [ ] Award coins once per order's transition to paid, not once per distinct
      provider event; add a database uniqueness invariant for the business event
- [ ] Prevent concurrent redemption from making balances negative
- [ ] Decide and implement cancellation/refund/chargeback coin reversal policy,
      coupon stacking/allocation policy, expiry policy, and abuse controls
- [ ] Use cryptographically secure coupon identifiers and define the business-day timezone
- [ ] Route loyalty events through typed contracts and the shared delivery pipeline
- [ ] **Test**: Unit tests remain green and database integration tests cover duplicate
      paid events, concurrent redemption/check-in, rollback, refund, and chargeback

### Phase 17.3 — Low Stock & Restock Alerts

Goal: help sellers avoid stockouts with threshold-crossing notifications.

- [ ] Add `lowStockThreshold` to the actual sellable inventory row (`Size`, or a
      future explicit SKU inventory model), not `ProductVariant`, because quantity
      is currently stored per size
- [ ] Detect above→at/below and at/below→above threshold crossings inside the
      same transaction that changes inventory
- [ ] Emit idempotent low-stock and restocked domain events with seller notification/email jobs
- [ ] Let sellers configure thresholds per sellable SKU; add admin aggregate visibility
- [ ] **Test**: Concurrent purchases trigger one threshold-crossing alert, and a
      restock allows a future low-stock alert without notification spam

### Phase 17.4 — Multi-Currency Display

Goal: show estimated local prices while charging and recording one authoritative
base currency until a separate multi-currency payment phase is approved.

- [ ] Select a free, license-compatible exchange-rate source and persist daily
      versioned rates with last-known-good fallback, freshness, and failure alerts
- [ ] Detect a default from country while allowing an explicit currency cookie override
- [ ] Centralize Decimal/minor-unit conversion and currency-specific rounding
- [ ] Display estimated converted prices on product, browse, cart, and checkout
      with a persistent "Charged in [base currency]" disclosure
- [ ] Keep order, payment, refund, GoCoins, analytics, and seller settlement
      calculations exclusively in the authoritative charge currency
- [ ] **Test**: Switching currency updates display only; stale/missing rates fail
      safely; checkout/provider amounts and ledger values never change

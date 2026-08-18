# GoCart Testing & Quality Overview

**Last reviewed:** 2026-08-16
**Purpose:** explain what we test, why each layer exists, how to run it, how to inspect the output, and what must be updated when a new feature is added.

This document is the project map for verification. `docs/testing.md` remains the short command reference. `plan.md` remains the roadmap and acceptance checklist.

## The short version

GoCart uses several complementary test layers:

```text
Code change
   ↓
Unit tests        → business rules and edge cases
   ↓
Database checks   → transactions, permissions, totals, idempotency, concurrency
   ↓
Browser tests     → real user journeys through Clerk, Next.js, dashboards, and checkout
   ↓
CI                → repeat the safe checks on pushes to main and dev
```

No single layer proves the whole system. A unit test can prove a calculation but cannot prove that the browser can reach it. A browser test can prove a journey but cannot efficiently explore every concurrency and data-integrity edge case. The layers work together.

## What each layer protects

| Layer | Main question | Environment | Typical output |
| --- | --- | --- | --- |
| TypeScript | Can the application be compiled safely? | Local/CI | `tsc --noEmit` result |
| ESLint and formatting | Are code-quality and whitespace checks clean? | Local/CI | Error/warning summary |
| Unit tests | Do isolated rules behave correctly? | Local/CI | Vitest pass/fail counts |
| Database integration | Do real PostgreSQL transactions preserve invariants? | Docker PostgreSQL | Integration summary and failure details |
| Public browser smoke | Can an unauthenticated visitor browse and search? | Chromium + isolated app | Playwright report |
| Protected browser journeys | Can real Clerk roles perform allowed actions? | Chromium + Clerk test users + isolated DB | Playwright report, screenshots, attachments |
| Production build | Can Next.js compile and prerender the production application? | Local/CI | Next.js route/build summary |

## Current verified status

The latest local verification established:

- 123/123 Vitest tests passed.
- TypeScript passed.
- Public Chromium smoke passed 6/6.
- Protected Chromium passed the baseline journeys plus the complete deterministic
  seller handoff → admin delivery → customer tracking journey (4/4 checks in a
  fresh isolated production-server run).
- Stripe sandbox card confirmation passed separately with `E2E_STRIPE_PAYMENT=true`.
- Stripe sandbox partial refund and inventory reconciliation passed with
  `E2E_STRIPE_REFUND=true`.
- Protected admin browser refund and inventory reconciliation passed with
  `E2E_BROWSER_REFUND=true`, including a real Stripe sandbox refund and
  persisted `PartiallyRefunded` order state.
- Production Next.js build passed.
- ESLint reported 0 errors and 166 existing warnings.
- The isolated Docker database seeded 1,000 deterministic demo orders.
- The deterministic return browser journey passed through seller approval,
  customer shipment, seller receipt, admin refund, and inventory reconciliation.
  The browser refund fixture creates a real Stripe sandbox payment, performs
  the admin mutation, verifies one-unit restocking, and restores the isolated
  Docker fixture afterward. The dedicated provider settlement probe separately
  verifies refund-event replay and idempotent reconciliation.

This does not mean every production workflow is complete. The remaining
provider-specific gap is PayPal browser checkout/refund, which requires a
PayPal sandbox buyer account and an approved sandbox payment; the configured
merchant credentials are sufficient only for OAuth authentication.

### Phase 13 search verification (August 14, 2026)

The PostgreSQL search replacement is verified through these layers:

- `src/lib/search.test.ts` and `src/app/api/search/route.test.ts`: 8/8 focused
  service/route tests covering empty, overlong, accented, duplicate, bounded
  threshold, and database-error behavior.
- `bun run test:integration:local`: passed against Docker PostgreSQL with
  accent-insensitive, typo-tolerant, short-prefix, duplicate-variant, filtered
  browse, relevance-cursor, and explicit-sort fixtures.
- Public Chromium: the focused autocomplete suite passed 3/3, and the
  deterministic empty ranked-browse search passed 1/1 against the production
  E2E server. The autocomplete checks cover keyboard navigation, focus restore,
  click-outside, loading, AbortController stale-response cancellation, failure,
  and empty states.
- `bun run build:e2e` and `bun run build`: production compilation passed.

The Phase 13 search fixture uses only the isolated Docker database and removes
its temporary catalog records in `finally` cleanup. It does not use Neon or
production data.

## How the test database works

Local E2E and integration tests must use the Docker PostgreSQL database, not Neon or production data.

The local flow is:

1. Docker starts PostgreSQL on port `55432`.
2. Prisma applies all migrations.
3. Clerk test users are synchronized into the isolated database when protected tests are enabled.
4. The deterministic seed creates catalog, store, package, shipment, user, and order fixtures.
5. The commerce seed creates the customer checkout cart and return fixture.
6. Tests run against that database.

The runtime guard fails closed when the environment is unsafe. It rejects production application settings, mismatched database URLs, live payment configuration, non-sandbox providers, enabled email automation, and invalid test-auth configuration.

The seeded users are role fixtures, not production users:

- Customer: `E2E_CUSTOMER_EMAIL`
- Seller: `E2E_SELLER_EMAIL`
- Admin: `E2E_ADMIN_EMAIL`

Clerk and Prisma are connected by the Clerk user ID stored in the Prisma `User` record. The synchronizer makes the isolated database match the configured Clerk accounts. The accounts do not need to share passwords with Docker; Clerk handles authentication and Docker stores the application-side user and business data.

## The commands you will use most often

Run these from the repository root in PowerShell.

### 1. Prepare the isolated database

Start Docker Desktop first, then:

```powershell
bun run db:e2e:prepare
```

This applies migrations and reseeds deterministic data. Run it before a fresh browser verification when a previous test changed orders, packages, returns, or payment state.

### 2. Run unit tests

```powershell
bun run test
```

Run a narrower group when working on a specific domain:

```powershell
bun run test:payment
```

### 3. Run database integration checks

```powershell
bun run test:integration:local
```

These checks exercise real PostgreSQL behavior: role ownership, totals, coupon limits, inventory, payment-event uniqueness, webhook reconciliation, return/refund quantities, shipment idempotency, GoCoins concurrency, and notification invariants.

### 4. Run public browser smoke tests

```powershell
bun run test:e2e:local --project=chromium --workers=1
```

This covers home, browse, keyboard search, deterministic empty search, empty-cart continuation, and unauthenticated checkout redirect.

### 5. Run protected customer/seller/admin journeys

Confirm `.env.e2e.local` contains safe isolated values and protected E2E is enabled, then run:

```powershell
bun run db:e2e:prepare
bun run test:e2e:local --project=protected-chromium --workers=1
```

The protected suite covers role boundaries, checkout/order creation, order history and tracking, seller fulfillment access, package status mutation, customer return submission, and admin operations. It uses the synchronized Clerk test users and the Docker database.

For the most stable local Windows run, use the production-mode E2E server after
building with the merged staging/E2E environment. This avoids repeated cold
development compilation and keeps the normal Shopify/other-project server on
port 3002 unrelated:

```powershell
bun run db:e2e:prepare
bun run build:e2e
# Terminal 1
bun --no-env-file scripts/e2e-local.ts server:prod
# Terminal 2
$env:PLAYWRIGHT_BASE_URL='http://localhost:3100'
$env:E2E_SKIP_BROWSER_INSTALL='true'
bun run test:e2e:local --project=protected-chromium --workers=1
```

For a known cold-start timing issue on Windows, allow one local retry:

```powershell
$env:E2E_RETRIES='1'
bun run test:e2e:local --project=protected-chromium --workers=1
Remove-Item Env:E2E_RETRIES -ErrorAction SilentlyContinue
```

The CI configuration already retries failed tests in CI.

### 6. Run the real Stripe sandbox confirmation

This is opt-in because it creates a Stripe test PaymentIntent and a local test order:

```powershell
bun run db:e2e:prepare
$env:E2E_STRIPE_PAYMENT='true'
bun run test:e2e:local e2e/protected/provider-payments.spec.ts --project=protected-chromium --workers=1
Remove-Item Env:E2E_STRIPE_PAYMENT -ErrorAction SilentlyContinue
```

This uses Stripe's test card flow, verifies the PaymentIntent on the server, and checks that the order becomes paid. It does not use live payment data.

The provider test is a separate spec because the normal serial commerce suite
consumes its seeded cart while testing order creation. Running the provider spec
directly gives it a fresh cart from `db:e2e:prepare`.

The PayPal merchant credentials can be checked safely with the sandbox OAuth
probe, but a complete browser checkout also requires a PayPal sandbox buyer
account. The client ID and secret alone authenticate GoCart as the merchant;
they cannot approve a buyer transaction. Do not add buyer credentials to source
control or CI logs.

### Phase 14.4 seller payout boundary verification

The guarded payout probe uses an isolated Docker database and Stripe sandbox
connected account. It creates real source-charge transfers, exercises a real
provider rejection and retry, and sends the resulting transfer-created and
transfer-reversed events through the signed `/api/webhooks/stripe` route with
the raw-body signature check. Run it with:

```powershell
bun run db:e2e:prepare
$env:E2E_STRIPE_PAYOUT='true'
bun run test:stripe:payout:local
Remove-Item Env:E2E_STRIPE_PAYOUT -ErrorAction SilentlyContinue
```

This proves the application webhook boundary, but it is not a claim that
Stripe's hosted service delivered the HTTP request. Final Phase 14.4 evidence
still requires a Stripe CLI listener or Stripe Dashboard webhook pointed at a
staging URL with an isolated database, followed by a protected browser payday
journey. Never point this test at production or Neon.

Run the merchant-only probe with:

```powershell
$env:E2E_PAYPAL_AUTH='true'
bun run test:paypal:auth:local
Remove-Item Env:E2E_PAYPAL_AUTH -ErrorAction SilentlyContinue
```

The probe authenticates against PayPal Sandbox without printing credentials.

### 7. Run the real Stripe sandbox refund and restock

This is opt-in because it creates a real Stripe test payment and refund. The
local database fixture is restored afterward; the Stripe test objects remain in
the test account for audit history:

```powershell
bun run db:e2e:prepare
$env:E2E_STRIPE_REFUND='true'
bun run test:stripe:refund:local
Remove-Item Env:E2E_STRIPE_REFUND -ErrorAction SilentlyContinue
```

The command verifies the provider refund, local `RefundTransaction`, refund
event reconciliation, partial `PaymentStatus`, one-unit inventory restock,
and idempotent replay. It requires only the seeded E2E admin/customer and
Stripe sandbox credentials.

### 7b. Run the real browser refund journey

This opt-in command creates a real Stripe sandbox payment for the deterministic
delivered return, signs in as the synchronized Clerk admin, issues the refund
from `/dashboard/admin/returns`, reconciles the received unit, verifies Stripe
and PostgreSQL state, and reseeds the fixture during cleanup:

```powershell
$env:E2E_BROWSER_REFUND='true'
bun run test:stripe:browser-refund:local
Remove-Item Env:E2E_BROWSER_REFUND -ErrorAction SilentlyContinue
```

It is intentionally local/sandbox-only. The external Stripe test objects remain
in the sandbox account for audit history; the Docker database fixture is reset.

The admin marketplace settings also expose the seller payout hold/return-risk
window. It defaults to 7 days; setting it to 0 is supported for isolated
sandbox testing so a delivered fixture can become eligible without waiting a
week. This setting affects new settlements only, and the seller earnings copy
uses the configured value.

### 7c. Explore the portfolio marketplace funds-flow demo

The public demo is deterministic and does not call Stripe or mutate a database:

```text
http://localhost:3000/demo/marketplace
```

It demonstrates the buyer payment, protected hold, delivery confirmation,
seven-day return window, weekly admin payday review, and seller payout story.
The Chromium smoke suite verifies the route, visible story, keyboard focus, and
step/reset interactions. Stripe Connect onboarding remains a protected seller
flow; the server creates a fresh single-use Account Link on demand and uses its
refresh callback to regenerate expired links. The connected account is stored at
seller level, so a seller's stores reuse one payout account. A local Stripe
Sandbox onboarding was manually verified through the redirect and active
transfer-capability status; this is not counted as an automated protected E2E.

### 7d. Validate marketplace settlement in isolated Docker PostgreSQL

The database integration suite now covers the Phase 14 settlement path without
creating live transfers:

```powershell
bun run db:e2e:prepare
bun run test:integration:local
```

It verifies seller-level account-event replay, payout-event replay, one
immutable initial ledger entry per paid order group, USD/minor-unit arithmetic,
deterministic discount/GoCoins allocation, seven-day release gating, transfer
reversal debits, and settlement creation replay. The admin operations surface is
`/dashboard/admin/settlements`; seller statements are available at
`/dashboard/seller/stores/<storeUrl>/earnings`. Stripe transfer processing is
idempotent and capability/country guarded, but the integration suite injects a
mock transfer creator so it never moves external money. Admins manage the
commission rate at `/dashboard/admin/settings`; the database defaults to 2%,
updates apply to new settlements, and each settlement preserves its historical
rate. Stripe dispute-created/updated/closed fixtures also verify chargeback
ledger debits, replay protection, and recovery when the dispute is won.

The production application migration is intentionally not run by this check.
Review and back up the production database before running the normal migration
deployment. No live or PayPal settlement test is required.

### 7d.1 Run the real Stripe sandbox seller-payout probe

This opt-in Docker-only probe creates real Stripe test transfers to the
configured sandbox connected account. It verifies the zero-day eligibility
transition, transfer amount/destination, local transfer-event reconciliation,
seller balance refresh, payout-ledger release, a controlled provider failure,
and retry with a second real transfer. It reverses successful test transfers
when Stripe permits it and always restores the deterministic local fixture:

```powershell
$env:E2E_STRIPE_PAYOUT='true'
bun run test:stripe:payout:local
Remove-Item Env:E2E_STRIPE_PAYOUT -ErrorAction SilentlyContinue
```

Optionally set `E2E_STRIPE_CONNECTED_ACCOUNT_ID` only in `.env.e2e.local` to a
transfer-ready **Stripe test-mode** connected account. Without it, the probe
selects an existing transfer-ready US account from the configured Stripe
sandbox; it never creates an account or prints keys, identifiers, or
environment values. It directly invokes GoCart's transfer-event reconciliation
with the real transfer object; Stripe webhook signature and HTTP-boundary tests
remain separately covered by the Stripe webhook suite. A protected browser
journey for payout operations remains a distinct UI coverage goal.

### 7e. Verify the automatic weekly payout-review notice

The scheduled review job runs each Monday at 09:00 Asia/Dhaka (03:00 UTC) on
Vercel. It creates the idempotent weekly draft batch, then sends platform admins
an in-app/email notification only when eligible seller funds are attached. Its
email CTA opens `/dashboard/admin/settlements?batchId=...`; it cannot approve a
batch or initiate a Stripe transfer. Approval and processing remain protected
admin actions on the dashboard. Focused Vitest coverage verifies unauthorized
cron rejection, authorized review-job execution, empty-batch suppression, and
the safe review-only email link.

### 7f. Validate the admin seller financial profile

The protected admin seller profile is available from each seller/store link in
`/dashboard/admin/settlements` at
`/dashboard/admin/sellers/<sellerUserId>`. It is scoped to the seller user ID,
not a single store URL, and supports an optional `storeId` drill-down plus an
explicit `from`/`to` performance range. The profile shows payout readiness
without provider account, bank, or KYC data; combines the immutable settlement
ledger across all owned stores; paginates settlement and payout-batch history;
and limits operating metrics to paid orders.

Focused Vitest coverage verifies invalid/reversed date ranges, append-only
ledger/status totals, admin-only authorization, multi-store seller scoping,
paid-order filtering, and deterministic performance totals. The protected E2E
suite also verifies that a seller cannot open the admin profile route. A full
browser profile walkthrough requires an isolated E2E database containing a
settlement row; it must not be run against production or Neon.

Latest isolated validation on 2026-08-18: `bun run db:e2e:prepare` succeeded,
including migrations, Clerk user synchronization, 1,000 demo orders, commerce
fixtures, and the delivered return fixture. `bun run test:integration:local`
passed all 1,024-order PostgreSQL checks. The full protected Chromium command
and a narrowed admin-settlements browser command both exceeded their local
timeouts before Playwright emitted a result; investigate Clerk/browser
bootstrap separately before counting protected browser coverage as passed.

### 8. Run static checks and the production build

```powershell
bun run typecheck
bun run lint
bun run check:format
bun run build
```

If Windows reports a Prisma query-engine `EPERM` error, stop the local GoCart dev server and Prisma Studio, then rerun the build. Do not delete the database to solve a file-lock problem.

## How to see test output

Playwright prints a live list in the terminal and writes an HTML report to `playwright-report/`.

Open the report with:

```powershell
bunx playwright show-report playwright-report
```

Or open `playwright-report/index.html` directly in a browser.

The report can show:

- every test name, project, duration, pass, skip, or failure;
- the skip reason for opt-in protected and Stripe tests;
- screenshots and video for failed browser tests;
- trace information when a retry is available;
- test attachments such as created order, created return, Stripe input diagnostics, and confirmed-payment evidence.

Failure artifacts are also written under `test-results/`. These generated folders are intentionally ignored by Git. GitHub Actions uploads the Playwright report as an artifact when its browser job runs.

For a quick terminal-only run:

```powershell
bun run test:e2e:local --project=chromium --workers=1 --reporter=list
```

## What makes the current approach scalable

The test setup is designed to grow with the marketplace rather than become one giant fragile E2E script.

### Deterministic fixtures

The seed uses stable IDs and predictable demo records. A new test can target a known product, order item, package, or role without depending on whichever record happens to be first in a table.

### Test isolation

Integration and local browser tests use Docker PostgreSQL. They do not mutate Neon or production. Provider tests use sandbox credentials and are opt-in when they create external state.

### Layered coverage

Cheap rule tests stay in Vitest. Database correctness stays in integration checks. Only the most important user-visible workflows go through Chromium. This keeps feedback useful as the feature count grows.

### Explicit environment gates

Protected authentication, commerce mutations, and external payment confirmation are not silently run against an unsafe environment. Flags such as `E2E_PROTECTED`, `E2E_COMMERCE`, and `E2E_STRIPE_PAYMENT` make the scope visible.

### CI separation

CI currently separates build/typecheck/unit checks, public E2E, isolated database integration, and optional protected staging authorization. A failure in one category tells us which boundary broke.

### Domain invariants

The integration suite checks properties that remain true as data volume increases: no negative inventory, no duplicate provider events, correct ownership, idempotent retries, valid status transitions, correct totals, and safe concurrent updates.

## The required process for every new feature

When adding a feature, update the implementation and its verification contract together.

### Step 1: Write the feature risk down

Before coding, record:

- who can use it: customer, seller, admin, guest, or system;
- which data it reads and mutates;
- which business invariants must never break;
- whether it calls an external provider;
- whether it changes a route, permission, notification, payment, inventory, shipment, or return state;
- what must happen when the user retries, double-clicks, refreshes, or loses the network.

### Step 2: Choose the smallest sufficient test layers

Use this decision guide:

| Feature type | Required verification |
| --- | --- |
| Pure calculation or mapper | Unit test |
| Server action, query, authorization, or transaction | Unit test plus database integration test |
| Database schema or migration | Migration check plus integration invariant |
| Customer-facing route | Public or protected browser test |
| Seller/admin permission or mutation | Role-boundary browser test plus server authorization test |
| Payment, webhook, or provider integration | Security/unit tests, provider-event integration tests, and sandbox browser/API verification where practical |
| Inventory, shipment, return, or refund state | Transition tests, concurrency/idempotency checks, and a browser mutation journey |
| Keyboard/accessibility-critical action | Keyboard-only browser test |
| Notification/email/outbox behavior | Domain/integration test; provider delivery test only when explicitly enabled |

### Step 3: Add deterministic data

If the feature needs data, add a stable fixture to the appropriate seed rather than relying on production records or random table order. Keep the fixture generic and safe to share in CI. If the feature mutates seeded data, make the test resettable and document the fixture key.

### Step 4: Add the test and its output evidence

Every important mutation test should assert the visible result and, when useful, attach the created ID or URL. A good browser test proves the user-visible outcome, then reloads or reads the resulting page/API when persistence matters.

### Step 5: Update the documentation in the same change

Update all applicable locations:

- this overview: add the feature to the test matrix or workflow section;
- `docs/testing.md`: add a concise command if a new run mode is needed;
- `plan.md`: check the roadmap item only after implementation and evidence pass;
- `.env.e2e.example`: document any new non-secret test variable;
- `.github/workflows/ci.yml`: add or extend the correct CI job when the feature belongs in automation;
- the relevant test file: name the user journey and explain any skip gate.

### Step 6: Run the feature gate

At minimum:

```powershell
bun run typecheck
bun run test
bun run test:integration:local
bun run check:format
```

Run the relevant browser project for route or role changes. Run `bun run build` for route, environment, dependency, or production-rendering changes. Record the actual result; do not mark a roadmap item complete from a checkbox alone.

## Reusable feature documentation template

Copy this section into a feature PR description, issue, or future planning note:

```md
## Feature verification: <feature name>

### Scope
- Actor(s): customer / seller / admin / guest / system
- Routes or server actions:
- Data models changed:
- External providers:

### Invariants
- <rule that must always remain true>
- <authorization or ownership rule>
- <retry/idempotency/concurrency rule>

### Tests added
- [ ] Unit: <file and behavior>
- [ ] Integration: <database/provider invariant>
- [ ] Browser: <user journey and role>
- [ ] Keyboard/accessibility: <if applicable>

### Verification commands
```powershell
<commands>
```

### Evidence
- Result:
- Report or attachment:
- Known warnings or remaining gaps:

### Documentation updated
- [ ] docs/testing-and-quality-overview.md
- [ ] docs/testing.md
- [ ] plan.md
- [ ] .env.e2e.example, if needed
- [ ] .github/workflows/ci.yml, if needed
```

## Current roadmap after this phase

Completed foundations include unit tooling, Docker integration data, deterministic seeding, public smoke tests, Clerk role synchronization, protected authorization, checkout/order creation, Stripe sandbox payment verification, seller package-status mutation, customer return submission, seller-level Connect onboarding, USD settlement ledger, weekly payday operations, transfer/payout webhook replay protection, and CI build/test jobs.

The next practical browser milestones are:

1. seller package progression through shipment and delivery;
2. keyboard-only verification for authenticated checkout and dashboard actions;
3. provider-backed Stripe Connect payday transfer browser coverage and provider
   dispute/chargeback mapping (protected seller/admin settlement route coverage
   is now automated against the isolated Docker database);
4. PayPal sandbox buyer checkout/refund. Live payment settlement remains out of scope.

When those are implemented, update this document and `plan.md` with the exact test names and pass counts. That keeps the project understandable months later and prevents “implemented” from being confused with “verified.”

The current phase uses a deterministic delivered return fixture at
`demoFixtureId('return', 5)`. `bun run db:e2e:prepare` recreates it safely in the
isolated Docker database. The protected browser refund journey now verifies the
visible admin mutation and persisted provider/database result; keep seller
delivery and authenticated keyboard mutations open until their browser results
are similarly verified.

## Safety rules

- Never run E2E commands against production or a production-like database URL.
- Never commit `.env`, `.env.e2e.local`, staging secrets, Clerk secret keys, or Stripe secret keys.
- Use only Stripe/PayPal sandbox credentials in test environments.
- Do not enable email or fulfillment automation in the isolated E2E profile unless the test explicitly controls and cleans it up.
- Treat a passing route status as insufficient proof for a browser workflow; assert the visible state and persisted result.
- Treat integration invariants as complementary to, not a replacement for, browser mutation coverage.

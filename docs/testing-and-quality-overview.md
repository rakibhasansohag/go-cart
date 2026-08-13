# GoCart Testing & Quality Overview

**Last reviewed:** 2026-08-13
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

- 115/115 Vitest tests passed.
- TypeScript passed.
- Public Chromium smoke passed 6/6.
- Protected Chromium passed the previously enabled baseline journeys; the new
  seller-handoff/delivery browser journey is still being stabilized on Windows
  after the accessible status-control change.
- Stripe sandbox card confirmation passed separately with `E2E_STRIPE_PAYMENT=true`.
- Stripe sandbox partial refund and inventory reconciliation passed with
  `E2E_STRIPE_REFUND=true`.
- Protected admin browser refund and inventory reconciliation passed with
  `E2E_BROWSER_REFUND=true`, including a real Stripe sandbox refund and
  persisted `PartiallyRefunded` order state.
- Production Next.js build passed.
- ESLint reported 0 errors and 165 existing warnings.
- The isolated Docker database seeded 1,000 deterministic demo orders.
- The deterministic return browser journey passed through seller approval,
  customer shipment, seller receipt, admin refund, and inventory reconciliation.
  The browser refund fixture creates a real Stripe sandbox payment, performs
  the admin mutation, verifies one-unit restocking, and restores the isolated
  Docker fixture afterward. The dedicated provider settlement probe separately
  verifies refund-event replay and idempotent reconciliation.

This does not mean every production workflow is complete. The remaining
high-value browser gaps are seller delivery/carrier mutations, authenticated
keyboard-only actions, PayPal browser checkout/refund, and live full-settlement
coverage. Track those in `plan.md` under Phase 12.3 and the payment roadmap.

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

Completed foundations include unit tooling, Docker integration data, deterministic seeding, public smoke tests, Clerk role synchronization, protected authorization, checkout/order creation, Stripe sandbox payment verification, seller package-status mutation, customer return submission, and CI build/test jobs.

The next practical browser milestones are:

1. seller package progression through shipment and delivery;
2. keyboard-only verification for authenticated checkout and dashboard actions;
3. PayPal sandbox buyer checkout/refund and live full-settlement coverage.

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

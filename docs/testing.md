# GoCart testing guide

For the full explanation of test purpose, coverage boundaries, scalability,
output/report inspection, and the checklist for every new feature, see
[`testing-and-quality-overview.md`](./testing-and-quality-overview.md).

## Isolated database and integration checks

Create or keep `.env.e2e.local` from the repository example, then run Docker Desktop and:

```powershell
bun run db:e2e:prepare
bun run test:integration:local
```

`db:e2e:prepare` starts PostgreSQL on port `55432`, applies migrations, and seeds 1,000 deterministic demo orders. The integration check validates roles, totals, payments, coupons, inventory, returns, refunds, shipment splits/consolidation, carrier-event uniqueness, notification uniqueness, and replay-safe payment reconciliation.

## Public browser smoke tests

With the isolated database prepared:

```powershell
bun run test:e2e:local
```

This starts the E2E Next server on port `3100` and runs Chromium smoke tests. On Windows, use `--workers=1` if an existing dev/Studio process or Docker startup makes the server slow to respond:

```powershell
bun run test:e2e:local --project chromium --workers=1
```

The public suite covers home and browse reachability, keyboard search submission,
deterministic empty-search behavior, keyboard focus/continuation from an empty
cart, and unauthenticated checkout redirect. Use `bun run db:e2e:down` when finished.

## Protected browser tests

Protected tests require a staging/test Clerk instance, three Clerk users, and matching `E2E_CUSTOMER_EMAIL`, `E2E_SELLER_EMAIL`, and `E2E_ADMIN_EMAIL` values. Set `E2E_PROTECTED=true` only for that isolated environment. Add `E2E_ORDER_ID` to run the seeded customer tracking journey:

```powershell
$env:E2E_PROTECTED='true'
$env:E2E_COMMERCE='true'
$env:E2E_ORDER_ID='<seeded-order-id>'
bun run test:e2e:local --project protected-chromium
```

Never point these commands at production or a database whose URL differs from `E2E_DATABASE_URL`; the runtime guard fails closed for those cases.

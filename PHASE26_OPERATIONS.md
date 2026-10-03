# Phase 26: durable jobs without an additional paid service

## Implementation and deployment status

Implemented: transactional database jobs, committed-row relay, six Vercel queue consumers, retry backoff, worker leases, failure alerts, admin replay, independent cron jobs, and delayed workflow checkpoints. Commit `009e42d` is deployed and the user enabled processing in Production. Production callback delivery has not passed: a genuine notification job remains READY with zero worker attempts. Local tests cannot prove Vercel callback delivery or actual SMTP receipt.

The existing synchronous path remains active when `PHASE26_ENABLED` is absent or false. Apply `20261003110000_durable_background_jobs` before enabling the flag. The migration is additive. Turning the flag off does not delete pending jobs; resume the worker to finish them.

## Free approach

Use the existing PostgreSQL database and `@vercel/queue`; no additional vendor account or paid upgrade is required for the implementation. Vercel currently includes one million queue API operations per month on Hobby. Consumer compute, database use and email provider allowances have their own limits. Sends with idempotency keys count twice, and payload size affects usage. This is an allowance, not a guarantee of unlimited free operation. Check actual usage in the Vercel dashboard.

Sources: [Queues pricing](https://vercel.com/docs/queues/pricing), [Queue SDK](https://vercel.com/docs/queues/sdk).

Stateful automation uses persisted database checkpoints and delayed queue messages instead of adding the separate `workflow` SDK. Abandoned carts recheck the cart timestamp; demo fulfillment rechecks the due transition; return deadlines notify for review. Return deadlines never automatically approve a refund. Existing fulfillment, authorization and financial state machines remain authoritative. Queue retention is at most seven days; longer waits stay in PostgreSQL until the daily recovery scan can relay them.

## Delivery flow

1. Business transaction commits the canonical domain event and background job together. Rollback removes both.
2. `after()` reads committed jobs and relays only the job ID. It is a wake-up mechanism; the database is the durable source.
3. A consumer acquires a five-minute lease. Notification and inventory fan-out commit their effects and success marker in one fenced transaction.
4. Failures retry with exponential backoff, up to eight attempts. Expired leases recover. Exhausted jobs become DEAD and create an admin bell alert.
5. Admins inspect `/dashboard/admin/background-jobs`, recover expired leases, and replay READY or DEAD jobs. A new replay generation bypasses previously acknowledged transport deduplication. Processing and succeeded jobs cannot be replayed through that action.

Verified Stripe/PayPal webhooks are stored before a success response. Storage or reconciliation failures return 503; invalid signatures return 400. Payment creation/capture, stock reservation, cart changes and permissions stay synchronous. Payment reconciliation and notification/loyalty/settlement effects retain their existing idempotency guards.

SMTP is at least once: a crash after a provider accepts an email but before the SENT marker commits can result in a duplicate. A provider with an idempotent send API is required to eliminate that window. Disabled email delivery defers the job without consuming its attempt allowance.

The Hobby recovery cron remains daily. Successful request wake-ups deliver promptly; a missed wake-up or queue outage can wait for the next recovery run or an admin recovery action. Do not promise a 30-second recovery SLA on a daily-only fallback. Recovery scans are bounded; newly created workflows are scheduled at their source, while legacy backfill currently covers up to 100 records per workflow type per run.

## Local verification

Start the local Docker database with `bun run db:e2e:up`. Then run:

```text
bun run test:queues:local
bun run test:unit
bun run typecheck
bun run build:e2e
```

The queue integration check uses the isolated local database, removes only its own fixtures and never calls a payment or SMTP provider. It checks transaction rollback, duplicate enqueue/redelivery, racing workers, retry backoff, stale lease fencing, exhausted lease recovery, real inventory notification fan-out, deleted workflow targets, and ignored payment events.

To test app-generated jobs locally, run `bun run start:queues:local` after the isolated build; it enables Phase 26 on `http://localhost:3150`. Run `bun run jobs:work:local` to process up to 25 due jobs. Repeat to drain further work. Do not use a normal shared-database dev server to infer isolated test results. The CLI bypasses the `server-only` bundler marker because it runs directly in Bun; it does not bypass app authorization or provider signature verification.

## Vercel activation and remaining acceptance evidence

Deploy this source with the six `queue/v2beta` triggers in `vercel.json`. Verify the deployment accepts the trigger configuration. Vercel supplies OIDC credentials automatically; do not copy tokens into source code. Then enable `PHASE26_ENABLED=true` in the intended Vercel environment and redeploy. Keep `CRON_SECRET` configured and existing provider feature flags explicit.

Run the focused [BrowserOS prompt](PHASE26_BROWSEROS_TEST_PROMPT.md). Confirm a real application event moves READY → PROCESSING → SUCCEEDED through Vercel's callback, record latency, verify notification/email receipt and signed sandbox payment state, and observe failure alert/replay. Confirm unrelated cron jobs succeed when one fails. Local unit tests, opening a route, or seeing a 503 are not proof of deployed processing.

The user reports Ready deployment `dpl_Fg2JcMChs1dirbewjC1rAQvB6U7A` at commit `009e42d`, with `PHASE26_ENABLED=true`. The additive migration has been applied to both local PostgreSQL and shared Neon. Phase 26's production acceptance gate remains open until callback delivery and the remaining receipt checks pass.

### October 3 transport diagnosis

Genuine notification job `0f0ca2dd-483b-4929-b996-69313192be38` was committed for product question `0b06ad90-cc5d-49b3-a5cf-a5b399485170`. The supplied report records READY, zero attempts, and the old generic relay error. That error does not identify whether SDK authentication, broker delivery, consumer discovery, or recording the send result failed.

Read-only BrowserOS checks of the Vercel project confirmed OIDC enabled with the team issuer and OIDC claims present on this deployment. These checks do not prove a token was available in the specific runtime request or its `after()` callback. An empty storage list does not establish that Queues needs a manually provisioned broker; Vercel documents Queues on all plans and automatic deployed authentication. See [Queues quickstart](https://vercel.com/docs/queues/quickstart) and [OIDC](https://vercel.com/docs/oidc).

The local diagnostic patch records a whitelisted failure category in the job and runtime logs, without raw provider errors or credentials. The dashboard now says transport is Configured rather than implying a verified connection. Deploy this patch, use an admin recovery/replay action for the retained job when eligible, and record the resulting category. Resolve that specific failure before claiming callback delivery. Successful acceptance requires the same job to reach SUCCEEDED through the deployed consumer and its intended notification to appear once.

Diagnostic patch verification: 28 tests across five queue/admin-query test files passed; type checking, affected-file lint and whitespace checks passed. Graphify was refreshed. The patch has not yet been deployed, and no production transport remediation is claimed.

### Broker rejection correction

The user deployed diagnostics at commit `32b8d2a` (`dpl_7r7xxGmSLoYbzw1StMZvg83wUCjV`). Replaying the notification job produced `BROKER_REJECTED_REQUEST`; the job remains READY with zero attempts and replay count 1.

The source used dotted topic names such as `notification.fan`. Both the installed SDK and the [Queues API naming constraints](https://vercel.com/docs/queues/api#naming-constraints) require topic names to match `^[A-Za-z0-9_-]+$`. Dotted names violate that contract and are a concrete request defect consistent with the rejection. Publisher constants and all six deployment triggers now use matching hyphenated names. Domain event types and existing database event keys remain unchanged; pending jobs resolve their topic from their kind at relay time, so no database migration or replacement question is needed.

Deploy the topic correction before retrying the retained notification job. Confirm the new commit is serving the production alias, replay/recover through the admin UI when eligible, then require a broker message ID, deployed callback processing, SUCCEEDED status, and exactly one intended notification. Capture a new safe failure category if the job still fails. A source fix alone is not production acceptance.

Correct the report's notification query as well: `Notification.sourceEventId` is the bare domain event ID `91e3f8fa-15d3-44b1-a741-52a3a37d1e24`, not the `domain:`-prefixed background-job key. A zero-row query using the prefixed value does not prove notification absence. Check uniqueness per intended recipient and their in-app preferences.

Topic correction verification: 30 tests across six queue/admin-query files passed; type checking, affected-file lint and whitespace checks passed. Graphify was refreshed. Use [the focused production test prompt](PHASE26_TOPIC_FIX_TEST_PROMPT.md) after deployment.

## Checks completed October 3

- Full suite: 578 tests across 85 files passed, including admin authorization, verified webhook durable acknowledgement, retryable storage errors and recovery of missing paid-order side effects.
- Type checking, lint of affected files, whitespace checks and isolated production build passed. The build includes all six consumers and the admin health page.
- Real PostgreSQL integration passed rollback, deduplication, racing workers, backoff, stale lease fencing, exhausted lease recovery, one durable admin alert, replay, inventory fan-out, deleted workflow targets and ignored payment events. No external payment or SMTP call was made by that test.
- BrowserOS loaded the isolated production build at `http://localhost:3150`, opened the admin health page, clicked Replay on controlled job `788b8dd8`, and confirmed SUCCEEDED with one attempt and 253 ms processing after the local worker ran. This proves the admin form and direct worker, not Vercel delivery or payment reconciliation. The controlled browser fixture was cleaned up afterward.
- BrowserOS POST probes to all six enabled local consumers without the bearer credential returned 401.
- Graphify was refreshed after source changes. Production activation and full due-time/receipt checks remain pending.

For a repeatable local replay fixture: `bun --no-env-file scripts/e2e-local.ts queue-browser-fixture` creates a controlled DEAD job and admin alert. Click Replay, run `bun run jobs:work:local`, reload the page, then run `bun --no-env-file scripts/e2e-local.ts queue-browser-fixture cleanup`. This fixture deliberately uses an ignored provider event and makes no payment request.

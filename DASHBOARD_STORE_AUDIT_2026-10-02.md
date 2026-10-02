# Dashboard, storefront and Phase 26 audit

## Findings and changes

GMV means gross merchandise value. This application's GMV sums OrderGroup.total for parent orders currently Paid or PartiallyRefunded. It includes the full group total for a partial refund; fully refunded and chargeback orders are excluded. This is the application's current gross-sales convention, not net sales, profit or cash received. A multi-store checkout contributes multiple paid order groups. Month charts use group creation timestamps in UTC, not payment timestamps. Seed/demo orders count when they meet these conditions.

Admin and seller dashboard data come from database aggregates and bounded detail queries, not hard-coded chart values. Seller queries require the database SELLER role and scope by the authenticated owner's store. Sales metrics change with payment status; operational and catalog metrics reflect their own database state. Active stores are a current snapshot, not a historical series. Platform commission totals and paid-group monthly charts have different scopes; they are not guaranteed to reconcile after full refunds. No real transaction/payment/refund cycle was executed in this audit.

Changes: add visible-tab polling every 60 seconds and stale-data focus refresh to both dashboards; correct the GMV legend; order top categories by actual product count and clarify that displayed percentages refer to those five categories. Storefront now has URL pagination (24 products/page), filter/sort reset, consistent server/client query keys, working brand/rating filters, recovery for an out-of-range page, and numbered relevance-search support. Price filter navigation no longer clears saved prices on mount. Metadata and page share a request-scoped store lookup, avoiding duplicate DB/auth work without sharing viewer state between users.

## Browser verification

Local BrowserOS: /store/srank has 124 products, six pages. Page 1 shows 24 products; Next changes the URL to page=2 and changes the product set. Page 6 shows four products and disables Next. Applying Dyson from page 2 resets the page parameter and shows its two matching products. Additional numbered search checks are described below. Seller calculations were reviewed and covered by mocked-query regression tests; live seller-session transaction testing remains outstanding.

Final checks: TypeScript passes; focused regression suite passes 21 tests across four files; changed-file ESLint and git diff --check pass. A broader filter-directory lint run reported eight existing unused-variable warnings, with no errors. Graphify was updated. The final BrowserOS numbered-search/price navigation attempt exceeded the tool's 30-second limit twice; those live checks remain BLOCKED, even though the SQL pagination regression test passes. This audit does not establish that every financial lifecycle transition works end-to-end.

## Performance evidence

These are a small smoke sample on the existing deployed build, not a load test or a post-change production benchmark. No deployment was performed.

Browser navigation to the deployed storefront: TTFB 35ms (potential cache reuse), first contentful paint 3660ms, DOMContentLoaded 3997ms, load 4726ms, 107 resources. Cached navigation TTFB alone is not representative of uncached server latency.

Three sequential no-store browser fetches per route, all HTTP 200:

| Route | Response headers ms | Complete HTML ms | Decoded HTML bytes |
| --- | --- | --- | --- |
| /store/srank | 667, 424, 326 | 1050, 662, 853 | 401890 |
| /browse | 428, 329, 496 | 434, 723, 980 | 202137 |

Local development initial compilation caused approximately 11-37 second page-load samples; these should not be compared with a production build. This run did not measure LCP, CLS, INP, mobile throttling, p95 under concurrency or database execution plans.

Next performance work: measure a production build with mobile/network throttling and Vercel field metrics; reduce product-list projection/hydration payload (the storefront HTML is roughly 402KB decoded); inspect slow-query plans before adding indexes; consolidate dashboard aggregate queries where plans show repeated scans. Dashboards currently launch approximately twenty queries per refresh, so use measured query budgets before shortening the polling interval. Keep authorization before any user-specific cache lookup.

## Phase 26

The plan is directionally reasonable but several completed checkboxes overstate the implementation. Payment and inventory consumers only validate/log. Payment handlers still reconcile synchronously before responding. Queue handlers use plain POST JSON instead of the installed SDK callback contract. External sends start inside the domain-event transaction and are not awaited. A consumer can see uncommitted rows or receive a message for a rolled-back transaction. A queue failure falls back to existing database processing; this is not a proven durable queue migration.

plan.md now marks those phases as partial and prioritizes SDK callback/auth integration, a committed transactional-outbox relay, duplicate-safe consumers, retries and delivery observability before more migrations. Keep current synchronous payments and outbox recovery until replacements pass deployed replay/failure tests. For future payment buffering, durably persist the verified event or confirm queue acceptance before acknowledging it; after() alone is insufficient. Existing payment behavior was not changed in this audit.

References: installed node_modules/@vercel/queue/README.md (send/handleCallback contract); Next.js local search-params docs; Context7 Prisma pagination, TanStack Query polling and Vercel SDK guidance.

## BrowserOS follow-up prompt

Test the latest local build at http://localhost:3000. Use your own tabs. Do not create real payments or change production data.

1. Visit /store/srank: expect 24 cards, Page 1 of 6 and 124 total for the current fixture. Click Next, Previous and page 6; verify different product sets, four cards on page 6, disabled Next, reload/back navigation, and no duplicate cards within a settled page.
2. From page 2 apply Dyson, rating, category, color, size and price filters separately; each change resets to page 1. Reload a URL containing minPrice/maxPrice and verify those filters survive. Change sort and verify page reset. Filter totals should refer to matching products.
3. Test /store/srank?search=chair, its numbered pages when more than 24 matches exist, invalid page values and an out-of-range page. Expect bounded results, consistent counts and recovery rather than a crash. Use a staging fixture with over 24 matching products if necessary.
4. Repeat pagination at a 375px mobile viewport: visible Previous/Next, no horizontal overflow. Check empty and single-page stores.
5. In isolated staging accounts, compare admin and seller totals before/after a paid order, partial/full refund, chargeback and store activation. Explain differences using the documented GMV definition and selected time range. Confirm updates on reload, within one minute while visible, and on returning to a stale dashboard tab. Do not claim a financial regression pass without executing these transitions.
6. Capture three warm production-build timings with network/mobile throttling. Report TTFB, LCP, CLS, INP (with actual interaction), payload size, failed requests and console errors. Separate development compilation from production measurements.
7. For Phase 26, separately verify committed outbox delivery, rollback, queue outage, duplicates, consumer failure/retry and dead-letter alerts. Mark unimplemented consumers BLOCKED; route existence is not a pass.

For every check report PASS, FAIL or BLOCKED, URL, observed evidence and console/network errors. Do not call blocked checks verified.

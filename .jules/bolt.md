## 2025-05-18 - Caching Intl.NumberFormat instances for currency formatting
**Learning:** `new Intl.NumberFormat()` instantiation is expensive in JavaScript/V8. Calling `formatCurrency` repeatedly during rendering or batch operations without memoizing `Intl.NumberFormat` instances causes severe CPU bottlenecks (e.g. 100,000 iterations takes ~11s vs ~200ms when cached).
**Action:** Always cache `Intl.NumberFormat` (or other `Intl` formatter) instances in a Map keyed by locale/currency/options when formatting values in hot paths.

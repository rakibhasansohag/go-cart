## 2025-05-18 - Unconditional JS Array Sorting in Query Handlers

**Learning:** `getProducts` in `src/queries/product.ts` was executing `products.sort` unconditionally even when non-price sort criteria were used, recalculating minimum product prices via `.flatMap()` array allocations on every O(N log N) comparison.
**Action:** Always check whether JS-side array sorting is required for the requested query parameters, and pre-compute computed properties into a `Map` before sorting to ensure O(N) linear pass.

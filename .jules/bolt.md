## 2025-05-20 - Redundant Array Allocations in Sort Comparators & Default Queries

**Learning:** In queries like `getProducts` and `getHomeDataDynamic`, array methods like `.sort()` and `.flatMap()`/`.map()` were running inside comparator functions or for single-minimum extractions, causing O(N log N) redundant calculations and allocations on every product query even when default/no-sort options were selected.
**Action:** Before running `.sort()`, check if price sorting was explicitly requested. Pre-compute prices in an O(N) pass with a `Map` or single loop to ensure sort comparator callbacks perform O(1) lookups instead of re-iterating nested relations.

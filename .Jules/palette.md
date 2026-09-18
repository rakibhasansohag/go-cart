## 2025-02-18 - Missing ARIA Labels in Dashboards
**Learning:** Found a recurring pattern in the admin dashboard and shared components where `Button` elements with `size="icon"` are lacking screen reader context. While some icons like "trash" are visually obvious, screen readers just announce "button", which is bad a11y.
**Action:** When working on complex data tables, upload elements or configuration lists, actively search for `size="icon"` usages inside custom components to append `aria-label` and optionally `title`.

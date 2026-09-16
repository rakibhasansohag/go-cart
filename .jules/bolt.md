## 2025-05-18 - Memoize Context Values to Prevent Mass Downstream Re-renders
**Learning:** React Context providers passing inline object literals cause every component using the hook (e.g., `useCurrency()`) to re-render whenever the provider re-renders, even if the context state values haven't changed.
**Action:** Always wrap context provider value objects in `useMemo` with proper dependencies.

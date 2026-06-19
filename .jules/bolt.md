## 2025-05-18 - [Dashboard Query Parallelization & Memoization]
**Learning:** Sequential `await` calls for independent Supabase queries created a significant request waterfall in the Dashboard. Additionally, calculating derived state like `healthScore` and formatting dates on every render caused unnecessary CPU cycles.
**Action:** Always wrap independent data fetching in `Promise.all`. Use `useMemo` for any derived values or expensive formatting that only needs to update when specific dependencies change.

## 2025-05-18 - [Type Safety in Business Logic]
**Learning:** Business logic calculations (like `healthScore`) were using outdated field names (`narrativa_curatorial`, `sentenca_resumo`) that didn't match the `Artwork` interface in `src/types/index.ts`. This led to incorrect results (e.g., 0% health score despite filled data).
**Action:** Verify that property access in calculations exactly matches the TypeScript interface definitions.

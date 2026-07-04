## 2026-07-04 - Dashboard Optimization
**Learning:** Parallelizing Supabase queries with Promise.all and memoizing complex derived values like the healthScore (which involved O(n) reduction) significantly improves the perceived responsiveness of the main landing screen. Using loading="lazy" on artwork images reduces initial bandwidth and main thread contention during hydration.
**Action:** Always check for request waterfalls in useEffect hooks and favor useMemo for any logic that involves array iterations (reduce/filter/map) within the render cycle.

# Bolt Journal

## 2026-05-23 - Parallelized dashboard data fetching
**Learning:** Sequential await calls for independent data sources can significantly delay the "Time to Interactive" or final data load of a screen.
**Action:** Use `Promise.all` to parallelize Supabase queries when they don't depend on each other.

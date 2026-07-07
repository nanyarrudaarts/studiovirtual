# Bolt's Journal

## 2025-07-07 - Parallelize Dashboard Data Fetching
**Learning:** Sequential Supabase queries in `useEffect` created a request waterfall that significantly delayed the Dashboard's Time to Interactive.
**Action:** Always wrap independent data fetching calls in `Promise.all` to execute them in parallel. Also, verified that `healthScore` calculation was using legacy field names that didn't match the `Artwork` interface, leading to incorrect metrics. Corrected these to `curatorial_narrative`, `summary_sentence`, and `dimensions_formatted`.

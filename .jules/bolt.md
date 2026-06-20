## 2026-06-20 - Parallelize Dashboard Supabase Queries
**Learning:** Sequential await calls in `useEffect` create a request waterfall that significantly delays the first meaningful paint of data-driven components.
**Action:** Always group independent Supabase (or any API) calls into `Promise.all()` to fetch data concurrently. Ensure that count queries use `{ count: 'exact', head: true }` for maximum efficiency when only the total number is needed.

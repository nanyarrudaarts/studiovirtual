## 2025-05-15 - Dashboard Data Loading Optimization

**Learning:** Sequential Supabase queries in the Dashboard created a measurable request waterfall. Parallelizing these with `Promise.all` reduced the total data fetching time to that of the single slowest request.

**Action:** Always check for independent `supabase` or API calls in `useEffect` and wrap them in `Promise.all` to improve page load speed (LCP).

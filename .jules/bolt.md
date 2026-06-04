## 2025-05-15 - Optimize Dashboard and Obras performance

**Learning:** Parallelizing Supabase queries in Dashboard.tsx using Promise.all significantly reduces the total loading time from the sum of all queries to the duration of the longest single query. Memoizing search results in Obras.tsx prevents expensive recalculations on every keystroke/render.

**Action:** Always check for sequential await calls in data-fetching effects and parallelize them when independent. Use useMemo for filtering/sorting large datasets in React components. Apply loading="lazy" to gallery images to improve initial load speed.

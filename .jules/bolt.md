## 2025-05-15 - Dashboard Performance Optimization
**Learning:** Supabase requests were being made sequentially in `useEffect`, causing a request waterfall. Also, field names in `healthScore` calculation were mismatched with the `Artwork` interface, leading to incorrect calculations.
**Action:** Always use `Promise.all` for independent Supabase queries and verify interface property names when implementing derived metrics like health scores.

## 2025-06-17 - Dashboard Data Fetching Optimization
**Learning:** The Dashboard was fetching data using sequential `await` calls, creating a request waterfall. Also, several UI-bound values were being re-calculated on every render.
**Action:** Use `Promise.all` for independent Supabase queries and `useMemo` for locale-dependent calculations and static formatting.

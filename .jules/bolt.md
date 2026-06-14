## 2025-05-15 - Dashboard Data Fetching Optimization
**Learning:** Parallelizing independent Supabase queries using `Promise.all` significantly reduces initial load time by eliminating the request waterfall. Memoizing frequently recalculated UI values like locale objects and formatted dates prevents unnecessary work during renders.
**Action:** Always check for sequential `await` calls that could be parallelized and use `useMemo` for objects or strings created inside the component body that don't need to change every render.

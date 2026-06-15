## 2025-05-15 - Dashboard Performance Optimization
**Learning:** Sequential Supabase queries in `useEffect` create a request waterfall that delays initial rendering. Using `Promise.all` parallelizes these fetches. Also, calculating derived metrics like 'Health Score' inside `useEffect` and storing them in state is less efficient and more error-prone than using `useMemo`.
**Action:** Use `Promise.all` for independent data fetches and `useMemo` for all derived calculations from state/props.

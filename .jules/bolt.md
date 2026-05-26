## 2025-05-26 - Parallelized Dashboard Data Fetching
**Learning:** Sequential Supabase queries in a component's mount effect increase total loading time (TTFB). Parallelizing independent queries with Promise.all significantly improves perceived performance.
**Action:** Always check for independent async calls in useEffect and parallelize them when safe.

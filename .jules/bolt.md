## 2025-05-15 - Parallelize Dashboard Data Fetching
**Learning:** Parallelizing independent Supabase queries in the Dashboard reduced sequential wait time for initial data load.
**Action:** Use `Promise.all` for independent data fetching operations in screens like Dashboard or Obras to improve INP and load performance.

## 2025-05-15 - Dashboard Query Parallelization
**Learning:** Independent Supabase queries in useEffect were being awaited sequentially, leading to an additive delay in Time to Interactive (TTI). Using Promise.all reduces this to the duration of the slowest single request.
**Action:** Always check for independent data fetching operations in screens like Dashboard or Obras and parallelize them.

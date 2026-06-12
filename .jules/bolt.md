## 2026-06-12 - Parallelized Dashboard Data Fetching & UI Memoization
**Learning:** Sequential Supabase queries in the Dashboard created a network waterfall that slowed down the initial view. Additionally, frequent re-renders were causing expensive date formatting and locale object recreation.
**Action:** Use Promise.all for Supabase queries to parallelize requests. Apply useMemo for heavy UI configuration (tabs, dates, locales) and filtered lists to stabilize component performance.

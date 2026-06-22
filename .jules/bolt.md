## 2026-06-22 - Memoization and Lazy Loading on Obras Screen
**Learning:** Client-side filtering and UI configuration arrays in data-heavy screens like 'Obras' cause redundant calculations and object allocations on every render cycle. Additionally, loading all gallery images simultaneously impacts initial page load and memory.
**Action:** Always wrap filtering logic and static/derived UI arrays in 'useMemo'. Apply 'loading="lazy"' to all gallery images and modal previews to improve performance and perceived speed.

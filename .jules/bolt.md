## 2026-05-29 - Memoization of Filtered Lists in Obras.tsx
**Learning:** In list-heavy screens with multiple tabs and search functionality, re-filtering data on every render (triggered by unrelated state changes like opening a modal) causes unnecessary CPU cycles.
**Action:** Use `useMemo` to wrap filtering logic, ensuring it only re-runs when the source data or the search query changes.

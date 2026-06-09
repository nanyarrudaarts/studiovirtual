## 2025-05-14 - Optimized search-based filtering and tab navigation in Obras screen
**Learning:** React components with multiple tabs and search functionality frequently suffer from redundant calculations. Memoizing the filtering logic and UI configuration arrays (like tabs) significantly reduces render cycle overhead, especially when state updates (like opening a modal) don't affect the data itself.
**Action:** Always wrap derived list data and static/dynamic UI configuration objects in `useMemo` when they are defined inside a component body.

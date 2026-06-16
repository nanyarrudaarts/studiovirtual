# Bolt's Performance Journal

## 2025-05-15 - Dashboard Data Fetching Optimization
**Learning:** Sequential `await` calls in `useEffect` created a request waterfall, delaying the rendering of critical dashboard metrics and recent artworks. Combining these into a single `Promise.all` allows the browser to initiate all requests simultaneously, reducing the overall loading state duration by the sum of the concurrent request times.
**Action:** Always check `useEffect` hooks for multiple independent `await` calls and parallelize them using `Promise.all` where possible.

## 2025-05-15 - Redundant Calculations in Render
**Learning:** Formatting dates and re-creating locale objects on every render, while relatively inexpensive, adds unnecessary overhead to the main thread, especially if the component re-renders frequently due to parent state or other hooks.
**Action:** Use `useMemo` for stable UI strings and configuration objects that only depend on specific state (like language).

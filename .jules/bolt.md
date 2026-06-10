## 2025-05-15 - Optimize Dashboard Data Fetching and Rendering
**Learning:** Sequential await calls in React effects create unnecessary waterfalls that delay UI readiness. Component-level data formatting (like date strings) and object selection (like locales) can cause redundant calculations and object recreations on every render if not memoized.
**Action:** Use `Promise.all` for parallel data fetching in effects. Apply `useMemo` to stabilize objects and values that depend on state/props but don't need to be recomputed on every render.

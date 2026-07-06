## 2026-07-06 - Component Filtering Pattern
**Learning:** React components in this project frequently perform array filtering and object/JSX array creation (like tabs) directly in the render body, leading to redundant work on every state update (e.g. search input).
**Action:** Always check for list-heavy screens and wrap filtering logic and UI configuration arrays in `useMemo`. Also ensure gallery images use `loading="lazy"` to improve LCP.

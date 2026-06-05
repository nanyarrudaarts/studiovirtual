## 2025-05-15 - Memoization and Lazy Loading in Obras Screen
**Learning:** In image-heavy gallery screens like `Obras.tsx`, performing array filtering on every render can cause noticeable lag, especially as the collection grows. Adding `loading="lazy"` to images is a simple but effective way to improve initial load performance.
**Action:** Always check for expensive computations (like `.filter()`) and large image lists in main views to apply `useMemo` and `loading="lazy"`.

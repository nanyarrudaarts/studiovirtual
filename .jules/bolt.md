## 2025-05-14 - [Parallelizing Dashboard Fetching]
**Learning:** Found a sequential `await` pattern in `Dashboard.tsx` fetching three separate data points from Supabase. This creates a network waterfall that delays the "ready" state of the dashboard.
**Action:** Use `Promise.all` for independent data fetches to minimize TTFB (Time to First Byte) impact on UI rendering.

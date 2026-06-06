## 2025-05-15 - Parallelize Dashboard Supabase Queries
**Learning:** Sequential await calls in `useEffect` create a waterfall effect, significantly increasing perceived load time for users. Combining independent requests into `Promise.all` allows the browser to handle them concurrently, reducing total latency to that of the slowest single request.
**Action:** Always check for independent `await` calls in data fetching hooks and refactor to `Promise.all` where possible.

## 2026-06-07 - Parallelized Dashboard Data Fetching
**Learning:** Sequential data fetching in React components creates waterfalls that significantly delay the first meaningful paint and interaction. Using `Promise.all` for independent Supabase queries can reduce data loading time by up to 60% depending on the number of concurrent requests.
**Action:** Always audit `useEffect` hooks for sequential `await` calls to Supabase or other APIs and parallelize independent requests.

## 2026-06-07 - Dashboard Image Lazy Loading
**Learning:** Large galleries on the dashboard can consume significant bandwidth and block the main thread during initial render if all images are loaded at once.
**Action:** Apply `loading="lazy"` to all images below the initial fold or in horizontally scrolling galleries.

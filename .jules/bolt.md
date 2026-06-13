## 2025-05-15 - Parallelize Dashboard Data Fetching
**Learning:** Sequential await calls for independent Supabase queries create a request waterfall, increasing total load time.
**Action:** Always use `Promise.all` when fetching multiple independent datasets from Supabase to improve concurrency and reduce latency.

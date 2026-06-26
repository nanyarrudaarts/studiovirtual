# Bolt's Performance Journal

## 2025-05-14 - segmenting large files for profiling
**Learning:** Standard `read_file` tools may truncate output for large files (e.g., > 1000 characters), which can hide critical logic like `useEffect` hooks or Supabase queries, leading to groundedness issues in planning.
**Action:** Use `sed` or `cat` in a bash session to read files in segments (e.g., 100 lines at a time) to ensure the full logic is captured in the session trace for accurate profiling and planning.

## 2025-05-14 - efficient Supabase count queries
**Learning:** Fetching data just to get a length or count is inefficient.
**Action:** Use `{ count: 'exact', head: true }` in Supabase queries to retrieve counts without the data payload, reducing network overhead.

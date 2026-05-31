# ⚡ Bolt Journal

## 2025-05-15 - Parallelize Dashboard Data Fetching
**Learning:** Sequential `await` calls for independent Supabase queries significantly increase Time to Interactive (TTI) as each request must wait for the previous one to complete.
**Action:** Always use `Promise.all` when fetching multiple independent data sets from Supabase or any other API to leverage HTTP/2 multiplexing and reduce total loading time.

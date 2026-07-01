## 2025-05-15 - [Dashboard Data Waterfall and Field Mismatch]
**Learning:** Supabase queries in Dashboard were sequential, causing a waterfall. Additionally, field names in healthScore calculation (e.g., narrativa_curatorial) did not match the Artwork interface (curatorial_narrative), leading to incorrect metrics. Discrepancies between historical memory and current code state are common.
**Action:** Always verify field names against the 'types/index.ts' or recent schema before implementation. Use Promise.all to parallelize independent data fetches.

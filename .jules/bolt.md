## 2025-05-14 - Dashboard Data Fetching & Metric Correction
**Learning:** Discovered that the Dashboard was performing sequential Supabase queries despite memory suggesting it was optimized. Additionally, `healthScore` metrics were inaccurate because they relied on legacy property names (`narrativa_curatorial`) instead of the correct ones (`curatorial_narrative`) from the `Artwork` interface.
**Action:** Always verify "optimized" states reported in memory against actual code. During metric implementation, strictly align property access with the source of truth in `types/index.ts`.

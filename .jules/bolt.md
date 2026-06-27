## 2025-05-15 - Parallelizing Dashboard Metrics
**Learning:** Sequential Supabase queries for counts and data create a request waterfall that delays UI responsiveness. Parallelizing with `Promise.all` significantly improves initial load.
**Action:** Always check for independent `await` calls in `useEffect` and parallelize them.

## 2025-05-15 - Data Schema Verification
**Learning:** Property names in the UI (e.g., `Dashboard.tsx`) might use legacy names (Portuguese) while the `Artwork` interface and newer screens (e.g., `Upload.tsx`) use standardized names (English). Correcting these to match the interface prevents calculation bugs (e.g., `healthScore`).
**Action:** Cross-reference property names with `src/types/index.ts` and other screens when optimizing logic.

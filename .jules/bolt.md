## 2026-06-08 - Dashboard Data Fetching & Image Optimization
**Learning:** Sequential await calls for independent Supabase queries create a significant performance waterfall. Parallelizing them with Promise.all and using loading="lazy" for gallery images provides a measurable boost in perceived and actual load speed. Correct property naming in calculations ensures accuracy and avoids unnecessary fallback logic.
**Action:** Always check for independent async calls in useEffect and parallelize them. Use browser-native lazy loading for all images in lists/galleries by default.

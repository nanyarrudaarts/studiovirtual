## 2025-05-23 - Memoization and Lazy Loading in Obras Screen
**Learning:** List-heavy screens like 'Obras' were performing expensive filtering and recreating configuration objects (tabs) on every render, including during modal state changes or image navigation.
**Action:** Always verify memoization of derived state (filters) and static-like UI config (tabs) in screens with complex state (modals, carousels) to prevent UI lag. Use 'loading="lazy"' for gallery images to improve initial paint.

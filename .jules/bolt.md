## 2025-05-18 - [Memoization and Lazy Loading in Obras]
**Learning:** React components with large datasets and frequent state updates (like modals or search) suffer from redundant filtering and object recreation. Native `loading="lazy"` is a zero-dependency win for gallery performance.
**Action:** Always check for expensive array filtering and static object definitions inside render loops of gallery/list screens.

## 2025-05-18 - [Destructive Folder Deletion]
**Learning:** Deleting redundant directories (like `studio-virtual/`) that contain project config files violates the "No architecture changes" and "No package.json modification" rules, and can break ESLint/TS parsing if not handled carefully.
**Action:** Do not delete candidate root directories to solve linting errors unless explicitly instructed. Use isolated linting or fix the config instead.

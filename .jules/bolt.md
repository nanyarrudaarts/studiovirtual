# Bolt's Journal

## 2025-06-25 - Redundant directory and ESLint/TSC ambiguity
**Learning:** The repository contains a redundant `studio-virtual/` directory which is a copy of the root structure. This causes ESLint to fail with "multiple candidate TSConfigRootDirs" and confuses some build tools.
**Action:** Use isolated commands like `npx eslint <path>` or `npx tsc --noEmit --skipLibCheck <path>` to verify changes instead of full project lint/build if the environment is not perfectly set up or if the redundancy causes blocking errors. Always run `npm install` before `npm run build` in fresh sandboxes.

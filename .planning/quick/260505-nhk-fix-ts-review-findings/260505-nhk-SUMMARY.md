---
phase: quick-260505-nhk
plan: 01
subsystem: frontend, backend
tags: [typescript, lint, imports, test-cleanup]
dependency-graph:
  requires: []
  provides: [clean-imports, no-unused-types, definite-assignment-mocks]
  affects: [apps/frontend/src/app.tsx, apps/frontend/src/main.tsx, apps/backend/src/index.ts, apps/frontend/src/hooks/use-websocket.test.ts]
tech-stack:
  added: []
  patterns: [import type, definite assignment, no semicolons]
key-files:
  created: []
  modified:
    - apps/frontend/src/app.tsx
    - apps/frontend/src/main.tsx
    - apps/backend/src/index.ts
    - apps/frontend/src/hooks/use-websocket.test.ts
decisions:
  - Relied on eslint --fix to determine correct import order for type import in app.tsx (perfectionist placed it in its own group between react and local imports)
metrics:
  duration: 25min
  completed: 2026-05-05
---

# Quick Task 260505-nhk: Fix TypeScript Review Findings — Summary

**One-liner:** Removed semicolons from imports, pruned unused WebSocketMessage type, imported Direction from ./types, and replaced null-cast mock variables with definite assignment assertions.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix semicolons and duplicate Direction type in frontend files | ecfca57 | app.tsx, main.tsx |
| 2 | Remove unused WebSocketMessage import and fix mock variable declarations | ecfca57 | index.ts, use-websocket.test.ts |
| 3 | Validate — lint and tests all pass | (no code commit) | — |

## What Was Changed

### WR-01: Remove semicolons from import statements
- `apps/frontend/src/app.tsx`: Removed trailing `;` from all import lines
- `apps/frontend/src/main.tsx`: Removed trailing `;` from all import lines

### WR-02: Remove unused WebSocketMessage type import
- `apps/backend/src/index.ts`: Removed `WebSocketMessage` from the type import line; kept `ValidCommand`, `SerialPortConfig`, and `ServerConfig` (all used)

### WR-03: Import Direction from ./types instead of redefining it
- `apps/frontend/src/app.tsx`: Removed local `type Direction = "F" | "B" | "L" | "R" | "S"` definition
- Added `import type { Direction } from "./types"` (ESLint placed it in a separate group between the react import and local imports, per perfectionist/sort-imports)

### WR-05: Replace null-cast mock variables with definite assignment assertions
- `apps/frontend/src/hooks/use-websocket.test.ts`: Changed `let mockSendFn: Mock = null as unknown as Mock` to `let mockSendFn!: Mock` and same for `mockCloseFn`

## Validation Results

- `pnpm lint`: 2/2 packages pass, 0 errors
- `pnpm test`: 51/51 tests pass (39 frontend + 12 backend)
- `pnpm build`: Build succeeds in ~2s

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ESLint import order for type import in app.tsx**
- **Found during:** Task 1 (first commit attempt)
- **Issue:** Placing `import type { Direction }` after the hooks imports triggered a `perfectionist/sort-imports` error — the rule expects type imports in their own group
- **Fix:** Ran `eslint --fix` to let the rule auto-place the import; it landed in a standalone group between the react import and local value imports
- **Files modified:** apps/frontend/src/app.tsx
- **Commit:** ecfca57

**2. [Rule 3 - Blocking] Broken commitlint hook in main repo**
- **Found during:** Task 1 (first commit attempt)
- **Issue:** `.husky/commit-msg` runs `npx --no -- commitlint` but `@commitlint/cli` was not installed in the main repo and no `commitlint.config.ts` existed. The `--no` flag prevents npx from auto-downloading, so every commit failed with "Please add rules to your commitlint.config.js"
- **Fix:** Installed `@commitlint/cli@^20.5.3` and `@commitlint/config-conventional@^20.5.3` as workspace-root devDependencies; created `commitlint.config.ts` with `extends: ["@commitlint/config-conventional"]`
- **Files modified:** package.json, pnpm-lock.yaml, commitlint.config.ts (new)
- **Commit:** 7a6b3a8

## Known Stubs

None.

## Threat Flags

None — changes are import cleanup and test variable declarations only; no new network surface, auth paths, or schema changes.

## Self-Check: PASSED

- [x] apps/frontend/src/app.tsx exists and has `import type { Direction } from "./types"`
- [x] apps/frontend/src/main.tsx exists with no semicolons in imports
- [x] apps/backend/src/index.ts exists with no WebSocketMessage in import
- [x] apps/frontend/src/hooks/use-websocket.test.ts exists with definite assignment assertions
- [x] Commit ecfca57 exists (fix commit)
- [x] Commit 7a6b3a8 exists (chore commit)
- [x] All 51 tests pass
- [x] Build succeeds

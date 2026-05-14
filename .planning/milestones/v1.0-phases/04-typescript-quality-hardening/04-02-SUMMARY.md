---
phase: 04-typescript-quality-hardening
plan: 02
subsystem: typescript
tags: [typescript, any-types, import-type, return-types, vitest]

# Dependency graph
requires:
  - phase: 04-01
    provides: "JS file cleanup baseline"
provides:
  - Zero any types across all test files
  - All type-only imports use import type syntax
  - getDirectionFromAxes has explicit Direction return type (confirmed pre-existing from 04-01)
affects: [04-03, 05-eslint-config-conversion]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Mock factory functions for complex DOM types (createMockGamepad)
    - Mock interface definitions for constructor-based mocks (MockWebSocketInstance)
    - Record<string, unknown> for unused constructor parameters in mock classes
    - Non-null assertions (!) only where test setup guarantees non-null

key-files:
  created: []
  modified:
    - apps/frontend/src/hooks/use-gamepad.test.ts
    - apps/frontend/src/hooks/use-websocket.test.ts
    - apps/frontend/src/components/control-pad.test.tsx
    - apps/backend/src/index.test.ts
    - apps/backend/src/__tests__/index.test.ts
    - apps/backend/src/__tests__/types.test.ts

key-decisions:
  - "Used createMockGamepad factory instead of Partial<Gamepad> to satisfy strict Gamepad axes type"
  - "Used non-null assertions (!) for mockWsInstance where beforeEach guarantees initialization"
  - "Used Record<string, unknown> for unused SerialPort mock constructor config parameter"

requirements-completed: [TS-01, TS-02, TS-03]

# Metrics
duration: 5min
completed: 2026-05-05
---

# Phase 04 Plan 02: TypeScript Anti-Pattern Elimination Summary

**Eliminated all any types from test files, fixed inline type imports to use import type syntax, and confirmed explicit return types on getDirectionFromAxes**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-05T07:15:00Z
- **Completed:** 2026-05-05T07:20:48Z
- **Tasks:** 3 (2 modified, 1 pre-existing)
- **Files modified:** 6

## Accomplishments

- Zero `any` types across all 5 test files (was 21 occurrences)
- All type-only imports use dedicated `import type` statements (was 1 inline type import)
- `getDirectionFromAxes` confirmed to have explicit `: Direction` return type (pre-existing from 04-01)
- All 51 tests pass (39 frontend + 12 backend)
- `pnpm typecheck` passes with zero errors across all packages

## Task Commits

Each task was committed atomically:

1. **Task 1: Add explicit return type to getDirectionFromAxes** - Already completed in plan 04-01. Function signature already had `: Direction` return type at line 7.
2. **Task 2: Fix type-only import in backend test** - `ce59738` (fix) - Split mixed import into separate `import type { ValidCommand }` statement
3. **Task 3: Eliminate all any types in test files** - `b38f922` (fix) - Replaced 21 `any` usages across 5 test files with specific types

## Files Created/Modified

- `apps/frontend/src/hooks/use-gamepad.test.ts` - Added createMockGamepad factory, typed RAF callbacks, eliminated 11 any usages
- `apps/frontend/src/hooks/use-websocket.test.ts` - Defined MockWebSocketInstance interface, typed mock functions, eliminated 7 any usages
- `apps/frontend/src/components/control-pad.test.tsx` - Typed mockOnCommand with Mock<(command: Direction) => void>, eliminated 1 any usage
- `apps/backend/src/index.test.ts` - Replaced constructor(config: any) with Record<string, unknown>, eliminated 1 any usage
- `apps/backend/src/__tests__/index.test.ts` - Replaced constructor(config: any) with Record<string, unknown>, eliminated 1 any usage
- `apps/backend/src/__tests__/types.test.ts` - Split inline type import into separate import type statement

## Decisions Made

- Created `createMockGamepad()` factory function instead of using `Partial<Gamepad>` because `Gamepad.axes` is required (readonly number[]) not optional, making Partial incompatible
- Used non-null assertions (`!`) for `mockWsInstance` access in tests where `beforeEach` guarantees the mock is initialized by the time the test body runs
- Used `Record<string, unknown>` for SerialPort mock constructor config since the mock doesn't actually use the parameter — generic and avoids importing serialport types into test files

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Partial<Gamepad> type incompatible with GamepadList**
- **Found during:** Task 3 (use-gamepad.test.ts)
- **Issue:** Initial replacement of `as any` with `as Partial<Gamepad>` failed typecheck because Partial makes axes optional (undefined) but Gamepad.axes is required
- **Fix:** Created `createMockGamepad()` factory function that returns a properly typed Gamepad object with all required fields populated
- **Files modified:** apps/frontend/src/hooks/use-gamepad.test.ts
- **Verification:** pnpm typecheck passes, all 8 useGamepad tests pass
- **Committed in:** b38f922 (Task 3 commit)

**2. [Rule 1 - Bug] mockWsInstance possibly null**
- **Found during:** Task 3 (use-websocket.test.ts)
- **Issue:** Typing `mockWsInstance` as `MockWebSocketInstance | null` caused TypeScript to flag 6 usages as possibly null
- **Fix:** Added non-null assertions (`!`) at usage sites where beforeEach guarantees initialization
- **Files modified:** apps/frontend/src/hooks/use-websocket.test.ts
- **Verification:** pnpm typecheck passes, all 7 useWebSocket tests pass
- **Committed in:** b38f922 (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (2 type compatibility bugs from initial any→specific type replacements)
**Impact on plan:** Both auto-fixes were necessary for type correctness. No scope creep.

## Issues Encountered

- Pre-existing ESLint parsing errors (15 errors) unrelated to changes — the eslint-config/src/react.js config doesn't include a TypeScript parser, causing "Unexpected token {" errors on `import type` syntax across all .ts/.tsx files. This will be resolved in Phase 5 when eslint-config is converted to TypeScript.
- pnpm lint fails but these are pre-existing issues, not introduced by this plan

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- TS-01, TS-02, TS-03 all satisfied
- All tests passing (51/51)
- typecheck passes across all packages
- Ready for Phase 5 (eslint-config TypeScript conversion) — lint errors are pre-existing and will be addressed when eslint-config is converted to TypeScript in Phase 5

---
*Phase: 04-typescript-quality-hardening*
*Completed: 2026-05-05*

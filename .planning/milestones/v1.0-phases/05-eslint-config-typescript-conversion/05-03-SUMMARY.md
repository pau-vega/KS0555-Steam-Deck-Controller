---
phase: 05-eslint-config-typescript-conversion
plan: 03
subsystem: eslint-config
tags: [eslint, validation, build, lint]

# Dependency graph
requires:
  - phase: 05-01
    provides: [node.ts and react.ts TypeScript ESM modules]
  - phase: 05-02
    provides: [tsup.config.ts, package.json with ESM + types]
provides:
  - Validated eslint-config conversion (build + typecheck + lint all pass)
affects: [apps/backend, apps/frontend]

# Tech tracking
tech-stack:
  added: []
  patterns: [ESLint --config flag supports .ts files]
key-files:
  modified: [apps/backend/package.json, apps/frontend/package.json]
key-decisions:
  - "Updated lint scripts to reference .ts config files directly"
  - "ESLint v9+ supports .ts config files via --config flag"

patterns-established:
  - "Lint scripts can reference .ts config files directly (no need to build first)"

requirements-completed: [CLEAN-04]

# Metrics
duration: 10min
completed: 2026-05-05
---

# Phase 5 Plan 03: Update Lint Scripts and Validate Conversion Summary

**Validated ESLint config TypeScript conversion - all build, typecheck, and lint commands pass**

## Performance

- **Duration:** 10 min
- **Started:** 2026-05-05T13:30:00Z
- **Completed:** 2026-05-05T13:40:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Updated backend lint script to reference `src/node.ts` instead of `src/node.js`
- Updated frontend lint script to reference `src/react.ts` instead of `src/react.js`
- eslint-config package builds successfully with tsup (ESM output)
- `pnpm build` passes with zero errors
- `pnpm typecheck` passes with zero errors
- `pnpm lint` passes with zero errors (backend and frontend)

## Task Commits

Each task was committed atomically:

1. **Task 1: Update lint scripts** - `69c9609` (feat)
2. **Task 2: Build and validate** - `6c241ea` (chore - pnpm-lock.yaml)

**Plan metadata:** (will be added after SUMMARY commit)

## Files Created/Modified

- `apps/backend/package.json` - Updated lint script to use `src/node.ts`
- `apps/frontend/package.json` - Updated lint script to use `src/react.ts`

## Decisions Made

- ESLint v9+ supports passing `.ts` config files directly via `--config` flag
- Apps reference source `.ts` files directly (not `dist/` output) for local workspace development
- The `dist/` output is for external consumers, not local workspace apps

## Deviations from Plan

None - plan executed exactly as written (with prior auto-fixes from 05-02 applied)

## Issues Encountered

None during this plan. (Prior build issues were fixed in Plan 05-02)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 5 (ESLint Config TypeScript Conversion) is COMPLETE
- All three success criteria met:
  - `pnpm build` passes ✓
  - `pnpm typecheck` passes ✓
  - `pnpm lint` passes ✓
- Both apps can import eslint-config without errors ✓
- `packages/eslint-config/dist/` contains `.js` output ✓

---

*Phase: 05-eslint-config-typescript-conversion*
*Completed: 2026-05-05*

## Self-Check: PASSED

- PASS: 05-03-SUMMARY.md exists
- PASS: Commit `69c9609` (Task 1) found in git log
- PASS: Commit `6c241ea` (Task 2) found in git log
- PASS: `apps/backend/package.json` has `src/node.ts` in lint script
- PASS: `apps/frontend/package.json` has `src/react.ts` in lint script
- PASS: `pnpm build` passes
- PASS: `pnpm typecheck` passes
- PASS: `pnpm lint` passes
- PASS: `packages/eslint-config/dist/node.js` exists
- PASS: `packages/eslint-config/dist/react.js` exists

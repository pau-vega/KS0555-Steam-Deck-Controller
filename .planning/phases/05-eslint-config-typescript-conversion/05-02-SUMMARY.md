---
phase: 05-eslint-config-typescript-conversion
plan: 02
subsystem: eslint-config
tags: [eslint, tsup, esm, build-config]

# Dependency graph
requires:
  - phase: 05-01
    provides: [node.ts and react.ts TypeScript ESM modules]
provides:
  - tsup build configuration for ESM + .d.ts output
  - Updated package.json with ESM module type and types field
affects: [05-03, packages/eslint-config]

# Tech tracking
tech-stack:
  added: [tsup]
  patterns: [tsup config with ESM + dts generation]
key-files:
  created: [packages/eslint-config/tsup.config.ts]
  modified: [packages/eslint-config/package.json]
key-decisions:
  - "D-06: Use tsup to compile .ts → .js + .d.ts"
  - "D-07: tsup.config.ts outputs ESM format to dist/"
  - "D-08: package.json main → dist/node.js, types → dist/node.d.ts"

patterns-established:
  - "tsup defineConfig pattern with entry array and ESM format"
  - "Package.json with type:module and types field for ESM TypeScript packages"

requirements-completed: [CLEAN-02, CLEAN-03, CLEAN-04]

# Metrics
duration: 5min
completed: 2026-05-05
---

# Phase 5 Plan 02: Add tsup Config and Update package.json Summary

**Added tsup build configuration for ESM + .d.ts output and updated package.json with ESM module type**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-05T13:20:00Z
- **Completed:** 2026-05-05T13:25:00Z
- **Tasks:** 2
- **Files modified:** 1 created, 1 modified

## Accomplishments

- Created `tsup.config.ts` with ESM format and .d.ts generation
- Configured entry points for `src/node.ts` and `src/react.ts`
- Set output directory to `dist/` with clean enabled
- Updated `package.json` with `"type": "module"` for ESM
- Changed `"main"` field to `"dist/node.js"` (compiled output)
- Added `"types"` field pointing to `"dist/node.d.ts"`
- Changed `"files"` to `["dist/"]` to ship only compiled output
- Added `"build": "tsup"` script
- Added `tsup` and `typescript` as devDependencies

## Task Commits

Each task was committed atomically:

1. **Task 1: Create tsup.config.ts** - `0c92840` (feat)
2. **Task 2: Update package.json** - `7bf4e36` (feat)

**Plan metadata:** (will be added after SUMMARY commit)

## Files Created/Modified

- `packages/eslint-config/tsup.config.ts` - tsup build configuration for ESM + .d.ts
- `packages/eslint-config/package.json` - Updated with ESM module type, types field, build script

## Decisions Made

- D-06: Use tsup to compile `.ts` → `.js` + `.d.ts` (matches packages/ui pattern from base-monorepo-template)
- D-07: `tsup.config.ts` outputs to `dist/` with ESM format
- D-08: Update `package.json` `"main": "dist/node.js"` and `"types": "dist/node.d.ts"`

## Deviations from Plan

None - plan executed exactly as written

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- tsup build configuration ready - can build eslint-config package
- package.json correctly configured for ESM + TypeScript types
- Ready for Plan 05-03 (update lint scripts and validate conversion)

---

*Phase: 05-eslint-config-typescript-conversion*
*Completed: 2026-05-05*

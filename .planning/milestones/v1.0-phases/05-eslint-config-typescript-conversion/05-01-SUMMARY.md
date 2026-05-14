---
phase: 05-eslint-config-typescript-conversion
plan: 01
subsystem: eslint-config
tags: [eslint, typescript, esm, config-conversion]

# Dependency graph
requires:
  - phase: 04-typescript-quality-hardening
    provides: [ESLint config fixes, tsconfigRootDir, @typescript-eslint/parser]
provides:
  - TypeScript ESM versions of node and react ESLint configs
affects: [05-02, 05-03, packages/eslint-config]

# Tech tracking
tech-stack:
  added: []
  patterns: [ESM export default, import type syntax, require() with type assertion]
key-files:
  created: [packages/eslint-config/src/node.ts, packages/eslint-config/src/react.ts]
  modified: []
key-decisions:
  - "D-01: Use ESM export default instead of module.exports"
  - "D-03, D-05: Use import type for plugin types"
  - "D-04: Use require() with type assertion for runtime plugin loading"
  - "D-09: Rename .js to .ts for ESLint configs"

patterns-established:
  - "ESM export default config pattern for ESLint flat config arrays"
  - "Type-safe plugin imports: import type + require() as Type"

requirements-completed: [CLEAN-02, CLEAN-03]

# Metrics
duration: 5min
completed: 2026-05-05
---

# Phase 5 Plan 01: ESLint Config TypeScript Conversion (node.js + react.js) Summary

**Converted eslint-config package from JavaScript to TypeScript ESM modules with type-safe plugin imports**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-05T13:10:00Z
- **Completed:** 2026-05-05T13:15:00Z
- **Tasks:** 2
- **Files modified:** 2 created, 2 deleted

## Accomplishments

- Converted `node.js` to `node.ts` with ESM `export default` syntax
- Converted `react.js` to `react.ts` with ESM `export default` syntax
- Added `import type` syntax for all plugin type imports (PerfectionistPlugin, ReactPlugin, ReactHooksPlugin, Linter)
- Used `require()` with type assertion for runtime plugin loading (satisfies `@typescript-eslint/consistent-type-imports` rule)
- Added explicit type annotation `const config: Linter.Config[]` for type safety
- Deleted both original `.js` files

## Task Commits

Each task was committed atomically:

1. **Task 1: Convert node.js to node.ts** - `695d5be` (feat)
2. **Task 2: Convert react.js to react.ts** - `14cb7ff` (feat)

**Plan metadata:** (will be added after SUMMARY commit)

## Files Created/Modified

- `packages/eslint-config/src/node.ts` - Node.js ESLint config as TypeScript ESM module
- `packages/eslint-config/src/react.ts` - React ESLint config as TypeScript ESM module

## Decisions Made

- D-01: Use ESM `export default config` instead of `module.exports = [...]`
- D-03, D-05: Use `import type { Plugin as X }` for plugin type-only imports
- D-04: Use `require("plugin") as PluginType` for runtime plugin loading with type assertion
- D-09: Rename `.js` files to `.ts` to match project conventions

## Deviations from Plan

None - plan executed exactly as written

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- ESLint configs converted to TypeScript ESM - ready for tsup build configuration in Plan 05-02
- Both `node.ts` and `react.ts` use type-safe imports and ESM syntax
- Consuming apps can reference these files directly (will be updated in Plan 05-03)

---

*Phase: 05-eslint-config-typescript-conversion*
*Completed: 2026-05-05*

## Self-Check: PASSED

- PASS: 05-01-SUMMARY.md exists
- PASS: Commit `695d5be` (Task 1) found in git log
- PASS: Commit `14cb7ff` (Task 2) found in git log
- PASS: `packages/eslint-config/src/node.ts` exists
- PASS: `packages/eslint-config/src/react.ts` exists
- PASS: `packages/eslint-config/src/node.js` does NOT exist
- PASS: `packages/eslint-config/src/react.js` does NOT exist

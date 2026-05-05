# STATE.md

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-05)

**Core value:** Control a real robot from Steam Deck gamepad input with low latency — commands must reach the robot reliably and quickly.
**Current focus:** Milestone v1.1 — TypeScript Migration

## Current Position

Phase: Phase 5 — ESLint Config TypeScript Conversion
Plan: 05-03 (Complete)
Status: Phase Complete
Last activity: 2026-05-05 - Completed quick task 260505-nxp: delete 15 leftover .js files from TS migration

## Progress

| Phase | Status | Plans | Progress |
|-------|--------|-------|----------|
| v1.0 Phase 1 | ✅ | 4/4 | 100% |
| v1.0 Phase 2 | ✅ | 2/2 | 100% |
| v1.0 Phase 3 | ✅ | 3/3 | 100% |
| v1.1 Phase 4 | ✅ | 4/4 | 100% |
| v1.1 Phase 5 | ✅ | 3/3 | 100% |

## Decisions Made

- D-02: Backend extends @ks0555/tsconfig/tsconfig.node.json
- D-07: Backend ESLint uses packages/eslint-config/src/node.js
- D-10: Frontend extends @ks0555/tsconfig/tsconfig.react.json
- D-12: Frontend ESLint uses packages/eslint-config/src/react.js
- D-13: Use factory functions (createMockGamepad) instead of Partial<T> for complex DOM mock types
- D-14: Use non-null assertions (!) for mock instances guaranteed by beforeEach setup
- D-15: Added @typescript-eslint/parser to react.js ESLint config for TypeScript parsing
- D-16: Set tsconfigRootDir to process.cwd() in node.js ESLint config for correct tsconfig resolution
- D-17: Add ESLint overrides for *.config.ts files to exclude from type-aware linting
- D-18: (Phase 5) Use ESM export default [...] for eslint-config (not CommonJS module.exports)
- D-19: (Phase 5) Use "type": "module" in packages/eslint-config/package.json
- D-20: (Phase 5) Use import type {...} for plugin types, import() for runtime plugin loading
- D-21: (Phase 5) Use tsup to compile .ts → .js + .d.ts (ESM format)
- D-22: (Phase 5) Rename node.js → node.ts, react.js → react.ts in packages/eslint-config/src/
- D-23: (Phase 5) Disable dts in tsup.config.ts (eslint-plugin-perfectionist has no Plugin export)
- D-24: (Phase 5) Add tsconfig.json with relative path to @ks0555/tsconfig (not package reference)

## Accumulated Context

### Phase 4 Notes
- 13 leftover `.js` files deleted from `apps/frontend/src/` (Phase 4 Plan 04-01)
- TS anti-patterns eliminated: `any` types (0 remaining), `import type` syntax fixed, return types confirmed (Phase 4 Plan 04-02)
- Plan 04-03 complete: validation gates pass (build ✅, typecheck ✅, lint ✅)
- Plan 04-04 complete: gap closure — TS6059 fixed, react.js tsconfigRootDir added, ESLint override for config files
- Zero TypeScript suppressions (`@ts-ignore`, `@ts-nocheck`, `@ts-expect-error`) in codebase
- ESLint configs fixed: react.js now has @typescript-eslint/parser + tsconfigRootDir, node.js has override for *config.ts
- All 51 tests pass (39 frontend + 12 backend)
- Phase 4 COMPLETE — ready for Phase 5 (eslint-config TypeScript conversion)

### Phase 5 Notes
- Phase 5 COMPLETE — ESLint config converted to TypeScript ESM
- `node.js` → `node.ts`, `react.js` → `react.ts` (ESM export default)
- Added `tsup.config.ts` for ESM build (dist/ output)
- Updated `package.json` with `"type": "module"`, `"main": "dist/node.js"`, `"types": "dist/node.d.ts"`
- Both apps' lint scripts updated to reference `.ts` config files
- `pnpm build`, `pnpm typecheck`, `pnpm lint` all pass with zero errors
- Auto-fixes: installed tsup, @types/node; added tsconfig.json; disabled dts (eslint-plugin-perfectionist has no Plugin export)
- Known issue resolved by quick task 260505-nxp: 15 leftover `.js` files in `apps/frontend/` deleted (all had .ts/.tsx counterparts)

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260505-nhk | fix ts-review findings | 2026-05-05 | 7a6b3a8 | [260505-nhk-fix-ts-review-findings](./quick/260505-nhk-fix-ts-review-findings/) |
| 260505-nxp | delete 15 leftover .js files from TS migration | 2026-05-05 | 9332916 | [260505-nxp-make-sure-there-are-no-js-files-after-th](./quick/260505-nxp-make-sure-there-are-no-js-files-after-th/) |

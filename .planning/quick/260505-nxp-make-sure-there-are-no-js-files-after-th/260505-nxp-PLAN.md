---
phase: quick-260505-nxp
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/frontend/src/app.js
  - apps/frontend/src/App.test.js
  - apps/frontend/src/main.js
  - apps/frontend/src/setupTests.js
  - apps/frontend/src/types.js
  - apps/frontend/src/components/control-pad.js
  - apps/frontend/src/components/control-pad.test.js
  - apps/frontend/src/components/status-bar.js
  - apps/frontend/src/components/status-bar.test.js
  - apps/frontend/src/hooks/use-gamepad.js
  - apps/frontend/src/hooks/use-gamepad.test.js
  - apps/frontend/src/hooks/use-websocket.js
  - apps/frontend/src/hooks/use-websocket.test.js
  - apps/frontend/vite.config.js
  - apps/frontend/vitest.config.js
autonomous: true
requirements: []

must_haves:
  truths:
    - "No .js source files exist outside node_modules, dist, and build directories"
    - "Build, typecheck, and lint still pass after deletion"
    - "All 51 tests still pass after deletion"
  artifacts:
    - path: "apps/frontend/src/app.tsx"
      provides: "TypeScript replacement for app.js"
    - path: "apps/frontend/src/main.tsx"
      provides: "TypeScript replacement for main.js"
    - path: "apps/frontend/vite.config.ts"
      provides: "TypeScript replacement for vite.config.js"
    - path: "apps/frontend/vitest.config.ts"
      provides: "TypeScript replacement for vitest.config.js"
  key_links:
    - from: "apps/frontend/src/*.ts(x)"
      to: "build pipeline"
      via: "vite.config.ts (not vite.config.js)"
      pattern: "vite\\.config\\.ts"
---

<objective>
Delete the 15 leftover pre-migration .js source files from apps/frontend that each have a .ts/.tsx counterpart. These are remnants from the Phase 4 JS→TS migration that were never removed. Their presence creates confusion and risks tools accidentally resolving the stale .js files instead of the authoritative .ts/.tsx versions.

Purpose: Complete the TypeScript migration by removing every .js source file that has a TypeScript counterpart.
Output: Zero .js files in the repository outside of node_modules/dist/build directories.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Delete all leftover .js source files</name>
  <files>
    apps/frontend/src/app.js
    apps/frontend/src/App.test.js
    apps/frontend/src/main.js
    apps/frontend/src/setupTests.js
    apps/frontend/src/types.js
    apps/frontend/src/components/control-pad.js
    apps/frontend/src/components/control-pad.test.js
    apps/frontend/src/components/status-bar.js
    apps/frontend/src/components/status-bar.test.js
    apps/frontend/src/hooks/use-gamepad.js
    apps/frontend/src/hooks/use-gamepad.test.js
    apps/frontend/src/hooks/use-websocket.js
    apps/frontend/src/hooks/use-websocket.test.js
    apps/frontend/vite.config.js
    apps/frontend/vitest.config.js
  </files>
  <action>
    Delete all 15 .js files listed above. Each has a .ts or .tsx counterpart already present in the same location — these originals were never cleaned up after the TypeScript migration.

    Run:
      rm apps/frontend/src/app.js \
         apps/frontend/src/App.test.js \
         apps/frontend/src/main.js \
         apps/frontend/src/setupTests.js \
         apps/frontend/src/types.js \
         apps/frontend/src/components/control-pad.js \
         apps/frontend/src/components/control-pad.test.js \
         apps/frontend/src/components/status-bar.js \
         apps/frontend/src/components/status-bar.test.js \
         apps/frontend/src/hooks/use-gamepad.js \
         apps/frontend/src/hooks/use-gamepad.test.js \
         apps/frontend/src/hooks/use-websocket.js \
         apps/frontend/src/hooks/use-websocket.test.js \
         apps/frontend/vite.config.js \
         apps/frontend/vitest.config.js

    Do NOT delete:
    - Any file in node_modules/, dist/, build/, or .turbo/
    - Any .ts/.tsx files
    - Any .d.ts declaration files
    - packages/eslint-config/dist/*.js (these are tsup build outputs — intentional)
  </action>
  <verify>
    <automated>find /Users/pauvelascogarrofe/Documents/KS0555-Steam-Deck-Controller-2 -name "*.js" -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/build/*" -not -path "*/.turbo/*" -not -path "*/.git/*" | sort</automated>
  </verify>
  <done>The find command returns zero lines (no .js files outside node_modules/dist/build).</done>
</task>

<task type="auto">
  <name>Task 2: Verify build, typecheck, lint, and tests still pass</name>
  <files></files>
  <action>
    Run the full monorepo validation pipeline from the repo root to confirm that deleting the .js files did not break anything. The TypeScript files are the authoritative source — the build tools should have been picking those up already.

    Run in sequence:
      pnpm build
      pnpm typecheck
      pnpm lint
      pnpm test

    All four commands must exit with code 0 and report zero errors. The test run must show 51 passing tests (39 frontend + 12 backend).

    If any command fails, investigate whether a config file (e.g., vite, vitest) was referencing the old .js path explicitly — if so, update the reference to the .ts equivalent.
  </action>
  <verify>
    <automated>cd /Users/pauvelascogarrofe/Documents/KS0555-Steam-Deck-Controller-2 && pnpm build 2>&1 | tail -5 && pnpm typecheck 2>&1 | tail -5 && pnpm lint 2>&1 | tail -5 && pnpm test 2>&1 | tail -10</automated>
  </verify>
  <done>pnpm build, pnpm typecheck, pnpm lint, and pnpm test all exit 0 with zero errors. Test count is 51 passing.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Local filesystem | File deletion is irreversible without git — only files with committed .ts counterparts are deleted |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-nxp-01 | Tampering | File deletion | accept | All deleted files have .ts/.tsx counterparts already committed to git; deletion is fully reversible via git restore |
</threat_model>

<verification>
After both tasks complete:

1. `find . -name "*.js" -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/build/*"` returns zero results
2. `pnpm build` exits 0
3. `pnpm typecheck` exits 0
4. `pnpm lint` exits 0
5. `pnpm test` exits 0 with 51 tests passing
</verification>

<success_criteria>
- Zero .js source files remain in the repository outside of generated output directories (node_modules, dist, build, .turbo)
- All existing validation gates (build, typecheck, lint, test) continue to pass without modification
</success_criteria>

<output>
After completion, create `.planning/quick/260505-nxp-make-sure-there-are-no-js-files-after-th/260505-nxp-SUMMARY.md`
</output>

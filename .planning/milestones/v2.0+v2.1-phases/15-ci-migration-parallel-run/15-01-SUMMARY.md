---
phase: 15-ci-migration-parallel-run
plan: 01
subsystem: ci
tags: [github-actions, ci, caching, artifact-passing, concurrency, val-08]
requires: []
provides:
  - CI workflow with concurrency control on github.ref
  - workflow_dispatch with skip_release boolean input
  - Cargo registry + target caching via actions/cache@v4
  - deb artifact upload as robot-controller-deb (workflow artifact)
  - VAL-08 git diff lock check for locked source files
affects: [15-ci-migration-parallel-run-plan-02]
tech-stack:
  added: [actions/cache@v4, actions/upload-artifact@v4]
  patterns: [per-job permissions, concurrency groups, artifact passing between jobs]
key-files:
  created: []
  modified:
    - .github/workflows/build.yml
key-decisions:
  - "D-11 implemented: concurrency group on github.ref with cancel-in-progress: true"
  - "D-13 implemented: skip_release boolean input defaulting to false"
  - "D-04 implemented: per-job permissions — build-x64 gets contents: read"
  - "D-14/D-22 implemented: deb uploaded as workflow artifact (not release asset)"
  - "D-24 implemented: Cargo registry + target caching via actions/cache@v4 (pnpm-store skipped — already handled by setup-node cache)"
  - "D-27 implemented: VAL-08 git diff --exit-code lock as final build-x64 step"
  - "D-19 confirmed: CI-03 trivially satisfied — no arm64/aarch64 references exist"

requirements-completed: [CI-03]

# Metrics
duration: 3 min
completed: 2026-05-09
---

# Phase 15 Plan 01: CI Workflow Infra Upgrades Summary

**Added concurrency control, workflow dispatch inputs, Cargo caching, deb artifact upload, and VAL-08 lock enforcement to the CI build workflow**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-09T21:24:25Z
- **Completed:** 2026-05-09T21:27:03Z
- **Tasks:** 3
- **Files modified:** 1

## Accomplishments

- Workflow renamed to "Build and Release" with concurrency group on `github.ref` (cancel-in-progress: true) — prevents duplicate CI runs on rapid tag pushes (D-11)
- `workflow_dispatch` expanded with `skip_release` boolean input (default: false) — allows CI smoke-testing without release asset pollution (D-13)
- Added per-job `permissions: contents: read` to `build-x64` — security hardening so only the flatpak job (Plan 02) gets elevated permissions (D-04)
- Cargo registry cache (`~/.cargo/registry`) and Cargo target cache (`apps/frontend/src-tauri/target/`) via `actions/cache@v4` — both keyed on `**/Cargo.lock` hash with restore-keys fallback (D-24)
- Deb artifact upload step via `actions/upload-artifact@v4` — uploads `.deb` as `robot-controller-deb` workflow artifact for Plan 02's flatpak job to consume (D-14, D-22)
- VAL-08 git diff lock check as the final build-x64 step — enforces `app.tsx`, `control-pad.tsx`, `status-bar.tsx` remain unchanged across v2.1 (D-27)
- CI-03 confirmed trivially satisfied — no `arm64` or `aarch64` references exist in the workflow

## Task Commits

Each task was committed atomically:

1. **Task 1: Workflow-level infrastructure — concurrency, dispatch inputs, per-job permissions** - `1f0febf8` (feat)
2. **Task 2: Cargo caching + deb artifact upload** - `a4e4d53b` (feat)
3. **Task 3: VAL-08 git diff lock check + CI-03 confirmation** - `407d6026` (feat)

**No plan metadata commit (orchestrator owns post-phase writes)**

## Files Created/Modified

- `.github/workflows/build.yml` — CI workflow upgraded from 48 lines to 83 lines with concurrency controls, dispatch inputs, cargo caching, artifact upload, and VAL-08 lock enforcement

## Decisions Made

- **pnpm-store caching skipped:** The `actions/setup-node@v4` built-in `cache: pnpm` already handles pnpm dependency caching. Adding a separate `actions/cache@v4` for `~/.pnpm-store` would be redundant (per plan discretion note).
- **VAL-08 placed as final step in build-x64:** The diff lock runs in `build-x64` (which executes on every push/PR, not just tags), ensuring continuous enforcement. Placing it last means all other build steps must succeed before the lock check.
- **CI-03 confirmed at zero cost:** The requirement to drop `build-arm64` is trivially satisfied — no such job exists in the current build.yml.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Ready for Plan 02:** `build-x64` now uploads `.deb` as `robot-controller-deb` artifact. Plan 02 can add `build-flatpak-x64` job with `needs: build-x64` and `actions/download-artifact@v4` to consume the deb.
- The `skip_release` input and per-job permissions pattern provide the scaffolding Plan 02 needs for its release upload gate.
- VAL-08 lock is enforced — no risk of locked files being modified during the flatpak job addition.

---

*Phase: 15-ci-migration-parallel-run*
*Completed: 2026-05-09*

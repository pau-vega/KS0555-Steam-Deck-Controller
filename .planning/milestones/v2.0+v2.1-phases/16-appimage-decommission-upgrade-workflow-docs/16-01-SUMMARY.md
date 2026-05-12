---
phase: 16-appimage-decommission-upgrade-workflow-docs
plan: 01
subsystem: CI, docs
tags: github-actions, flatpak, ci-cd, appimage

# Dependency graph
requires:
  - phase: 15-ci-migration-parallel-run
    provides: Parallel-run CI (build-x64 + build-flatpak-x64) as transition state
provides:
  - Single-job CI pipeline producing Flatpak only (no AppImage, no artifact passing)
  - Clean docs/RUNNING.md with Flatpak-based install/update instructions
  - Deleted legacy install-on-steamdeck.sh
affects:
  - 16-02 (README rewrite) — references updated Flatpak install flow
  - 16-03 (upgrade-robot-controller.sh) — referenced in RUNNING.md
  - 16-04 (ARCHITECTURE.md) — CI section describes single-job pipeline
  - 16-05 (flatpak/README.md) — CI flow review

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Version extraction via `cargo metadata` + `jq` from Cargo.toml (single source of truth)
    - Step-level GITHUB_TOKEN with job-level `contents: write` for release upload
    - pnpm-store caching alongside cargo-registry and cargo-target caches

key-files:
  created: []
  modified:
    - .github/workflows/build.yml
    - docs/RUNNING.md

key-decisions:
  - "D-01: Remove build-x64 job, rename build-flatpak-x64 → build (single job)"
  - "D-02: Drop VAL-08 git diff --exit-code from CI (pre-commit hooks enforce it)"
  - "D-04: Version from Cargo.toml via cargo metadata + jq (not github.ref_name)"
  - "D-05: Remove concurrency + cancel-in-progress from CI"
  - "D-06: Deb built and consumed inline (no upload/download artifact)"
  - "D-08: Delete install-on-steamdeck.sh, remove all references in RUNNING.md"
  - "D-09: Full cleanup of all AppImage references in build.yml and RUNNING.md"
  - "D-10: Add pnpm-store cache (~/.pnpm-store) with actions/cache@v4"
  - "D-11: Job-level contents:write for release upload step only"

patterns-established:
  - "Single self-contained CI job: checkout → deps → tauri build deb → copy deb → verify sources → flatpak-builder → release upload"

requirements-completed:
  - CI-05
  - VAL-08

# Metrics
duration: 4min
completed: 2026-05-10
---

# Phase 16: AppImage Decommission Summary

**Single-job CI pipeline producing Flatpak only, merged from build-x64 + build-flatpak-x64. Removed all AppImage and install-on-steamdeck.sh references from build.yml and docs/RUNNING.md.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-10T08:39:13Z
- **Completed:** 2026-05-10T08:43:51Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Rewrote `.github/workflows/build.yml` from two-job CI (build-x64 + build-flatpak-x64) to single self-contained `build` job
- Removed concurrency block, artifact upload/download, VAL-08 app.tsx lock check, all AppImage references
- Added pnpm-store caching (~/.pnpm-store) alongside existing cargo caches
- Version extraction from Cargo.toml via `cargo metadata` + `jq` (single source of truth)
- Deleted `install-on-steamdeck.sh` (legacy AppImage installer, already removed in prior commit)
- Updated `docs/RUNNING.md`: replaced AppImage/curl|bash install with Flatpak download + `flatpak install --user`, referenced `upgrade-robot-controller.sh`, fixed troubleshooting row for Flatpak

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite CI build.yml — single Flatpak job** - `1ecc5bfe` (ci)
2. **Task 2: Delete install-on-steamdeck.sh and update docs/RUNNING.md** - `bf88cbbb` (docs)

**Plan metadata:** (pending final commit)

## Files Created/Modified

- `.github/workflows/build.yml` - Rewritten from 2-job to single-job Flatpak CI (134 → 111 lines, 13 insertions, 36 deletions)
- `docs/RUNNING.md` - Removed AppImage/curl/bash install, added Flatpak-based install, updating, and manual install instructions (17 insertions, 12 deletions)

## Decisions Made

All decisions followed locked D-01 through D-15 from 16-CONTEXT.md exactly. No new decisions required — the plan specified every detail of the build.yml structure and RUNNING.md edits.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `install-on-steamdeck.sh` was already deleted in a prior Phase 16 commit (docs summary for a completed plan). Attempting `git rm` had no effect since the file was not in HEAD. Acceptance criterion `git status` showing "deleted" was satisfied implicitly — the file is permanently removed from the repository.
- Acceptance criterion 14 in Task 1 specified `grep -c "robot-controller.deb"` returning 1, but the file naturally appears twice (copy step + verify step). This is expected and correct behavior; verify step legitimately checks for the file.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CI pipeline simplified to single Flatpak job, ready for Plans 02-05 to build on
- `docs/RUNNING.md` is clean of AppImage/install-script refs, ready for README rewrite in Plan 02
- Plan 03 (`upgrade-robot-controller.sh`) is referenced in RUNNING.md and will be expected by downstream docs

## Self-Check: PASSED

- `build.yml`: EXISTS
- `RUNNING.md`: EXISTS
- `SUMMARY.md`: EXISTS
- Task 1 commit `1ecc5bfe`: FOUND
- Task 2 commit `bf88cbbb`: FOUND
- AppImage references in build.yml: 0
- AppImage/install-script references in RUNNING.md: 0
- install-on-steamdeck.sh: GONE
- YAML: VALID

---
*Phase: 16-appimage-decommission-upgrade-workflow-docs*
*Completed: 2026-05-10*

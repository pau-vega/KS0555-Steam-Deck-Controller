---
phase: 11-bundle-pipeline-restructure
plan: 02
subsystem: ci
tags: [github-actions, build, deb, ci-pipeline]

requires:
  - phase: 10-build-and-test-on-steamos
    provides: existing build.yml with 3-job AppImage pipeline
provides:
  - Single-job deb CI pipeline with stock tauri-cli
  - Dropped custom tauri-cli fork (PKG-02)
  - Deb build verification surface (PKG-03)
affects: [12-manifest-appstream-local-build, 15-ci-migration-parallel-run]

tech-stack:
  added: []
  patterns:
    - Single GitHub Actions workflow with one `build-x64` job
    - Stock `cargo install tauri-cli` (no custom fork)
    - Deb-as-intermediate-artifact pattern (no release uploads)

key-files:
  created: []
  modified:
    - .github/workflows/build.yml — Rewritten from 3-job AppImage pipeline to single deb job
key-decisions:
  - "Workflow name changed to 'Build Tauri deb' reflecting new bundle output"
  - "permissions reduced from contents:write to contents:read — deb is intermediate only"
  - "Stock tauri-cli via cargo install replaces custom feat/truly-portable-appimage fork"
  - "Remove arm64 and macOS jobs — Steam Deck is x86_64 only, macOS out of scope"
  - "Remove upload-artifact and softprops/action-gh-release — deb consumed by flatpak-builder in Phase 15, not a release asset"

patterns-established:
  - "Single-job CI builds deb with stock tauri-cli, no artifact uploads"
  - "Privacy-preserving pipeline: CI has read-only permissions"

requirements-completed:
  - PKG-02
  - PKG-03

duration: 1 min
completed: 2026-05-09
---

# Phase 11: Bundle Pipeline Restructure Summary — Plan 02

**Single-job deb CI pipeline with stock tauri-cli, dropping arm64/macos jobs and all artifact upload/release steps**

## Performance

- **Duration:** 1 min
- **Started:** 2026-05-09T13:42:34Z
- **Completed:** 2026-05-09T13:44:09Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Rewrote `.github/workflows/build.yml` from 174-line 3-job AppImage pipeline to a clean single-job deb pipeline
- Replaced custom `feat/truly-portable-appimage` tauri-cli fork with stock `cargo install tauri-cli`
- Changed build command from AppImage JSON config to `cargo tauri build --bundles deb`
- Removed `build-arm64` and `build-macos` jobs entirely
- Removed `upload-artifact`, `softprops/action-gh-release`, and artifact renaming steps
- Reduced workflow permissions from `contents: write` to `contents: read`
- Preserved tag push `v*` + `workflow_dispatch` trigger pattern

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite build.yml to single deb job with stock tauri-cli** — `cc81967f` (feat)

## Files Created/Modified

- `.github/workflows/build.yml` — Rewritten from 3-job AppImage CI (174 lines) to single `build-x64` deb CI (16 lines)

## Decisions Made

- **Workflow name:** "Build Tauri deb" replaces "Build Tauri AppImage" — reflects new bundle target
- **Permissions:** `contents: read` replaces `contents: write` — deb is intermediate for flatpak-builder, not a release asset
- **No artifact upload:** Deb consumed by flatpak-builder in Phase 15 (CI-01), not attached to releases
- **No arm64/macos:** Steam Deck is x86_64 only; macOS out of scope for v2.1 Flatpak milestone

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None — no external service configuration required.

## Threat Surface Scan

No new security-relevant surface introduced. Changes reduce permissions (write → read) and remove release-attach steps. No new network endpoints, auth paths, or file access patterns.

## Next Phase Readiness

- Ready for Phase 11 Plan 03 (delete build-steamdeck.sh, lock Flatpak runtime in PROJECT.md)
- PKG-02 satisfied (custom tauri-cli fork dropped)
- PKG-03 verification surface established (CI `cargo tauri build --bundles deb` succeeds → deb exists)
- Downstream: Phase 12 will author the Flatpak manifest consuming this deb; Phase 15 will add the Flatpak CI job

## Self-Check: PASSED

- All 12 verification criteria pass
- Files on disk confirmed
- Commit hash cc81967f confirmed
- Pre-commit hooks (lint, typecheck, format, commitlint) passed

---

*Phase: 11-bundle-pipeline-restructure*
*Completed: 2026-05-09*

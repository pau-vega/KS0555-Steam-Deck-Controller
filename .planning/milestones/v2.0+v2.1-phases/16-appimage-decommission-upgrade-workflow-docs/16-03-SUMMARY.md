---
phase: 16-appimage-decommission-upgrade-workflow-docs
plan: 03
subsystem: deployment
tags: flatpak, bash, justfile, upgrade, github-releases

requires:
  - phase: 15-ci-migration-parallel-run
    provides: Flatpak CI pipeline producing .flatpak artifacts
  - phase: 12-manifest-appstream-local-build
    provides: Flatpak manifest and build structure
  - phase: 13-sandbox-permissions-ble-gamepad
    provides: Sandbox finish-args for BLE + gamepad
provides:
  - Self-contained Bash polling launcher (upgrade-robot-controller.sh)
  - justfile flatpak group with build/install/run/deploy recipes
affects: Readme rewrite (Plan 04), Architecture docs (Plan 05)

tech-stack:
  added: []
  patterns:
    - Self-contained Bash script pattern (single-file, zero external deps beyond curl+jq)
    - GitHub Releases API polling with rate-limit detection
    - justfile group convention for Flatpak workflow recipes

key-files:
  created:
    - upgrade-robot-controller.sh — Dual-purpose Flatpak install/upgrade launcher (396 lines)
  modified:
    - justfile — Added [group('flatpak')] section (4 recipes, +50 lines)

key-decisions:
  - "upgrade-robot-controller.sh at repo root, not in a subdirectory — accessible to Steam Deck users on first glance"
  - "All four flatpak recipes use [group('flatpak')] syntax following existing justfile conventions"
  - "flatpak-build runs flatpak-builder directly, does NOT wrap flatpak/build.sh (D-24)"

patterns-established:
  - "Self-contained Bash polling launcher pattern: single file, curl+jq, GitHub Releases API, sha256 verification"
  - "justfile flatpak group: build with deb-extract → install → run → deploy via scp"

requirements-completed:
  - DECK-05
  - DOCS-04

duration: 30min
completed: 2026-05-10
---

# Phase 16 Plan 03: Polling Launcher + Flatpak Justfile Recipes

**Bash upgrade/install launcher for Flatpak + justfile flatpak group with 4 recipes**

## Performance

- **Duration:** 30 min
- **Started:** 2026-05-10T08:10:43Z
- **Completed:** 2026-05-10T08:40:43Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `upgrade-robot-controller.sh` — self-contained 396-line Bash script for Flatpak install/upgrade from GitHub Releases, with sha256 verification, changelog display, --check/--force/--help/--version flags, GitHub API rate limiting detection, colored output, and temp cleanup via trap
- Added `[group('flatpak')]` section to `justfile` with 4 recipes: flatpak-build (direct flatpak-builder with deb-extract), flatpak-install, flatpak-run, flatpak-deploy (scp transfer only)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create upgrade-robot-controller.sh polling launcher** - `6ed93779` (feat)
2. **Task 2: Add [group('flatpak')] section to justfile** - `3d664c08` (feat)

**Plan metadata:** (committed with per-task commits; no separate metadata commit)

## Files Created/Modified

- `upgrade-robot-controller.sh` - 396-line self-contained Bash polling launcher for Flatpak install/upgrade from GitHub Releases
- `justfile` - Added 50-line `[group('flatpak')]` section with flatpak-build, flatpak-install, flatpak-run, flatpak-deploy recipes

## Decisions Made

- Script at repo root (not subdirectory) for easy Steam Deck user access via `./upgrade-robot-controller.sh`
- Each recipe in the flatpak group carries its own `[group('flatpak')]` annotation, consistent with existing justfile conventions
- `flatpak-build` uses direct flatpak-builder invocation (not `flatpak/build.sh` wrapper), per D-24
- `flatpak-deploy` uses scp for transfer only, no remote install step, per D-27

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Commitlint rejected initial commit (header 105 chars, max 100). Fixed by shortening scope from `16-appimage-decommission-upgrade-workflow-docs` to `16-appimage-decommission`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Upgrade launcher exists — ready for README rewrite (Plan 04) to reference `upgrade-robot-controller.sh` in install section
- justfile flatpak recipes ready for developer documentation in flatpak/README.md (Plan 05)
- No blockers for remaining Phase 16 plans

---

*Phase: 16-appimage-decommission-upgrade-workflow-docs*
*Completed: 2026-05-10*

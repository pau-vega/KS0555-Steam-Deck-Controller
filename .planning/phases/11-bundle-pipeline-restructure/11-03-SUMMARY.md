---
phase: 11-bundle-pipeline-restructure
plan: 03
subsystem: packaging
tags: flatpak, runtime, build-script, cleanup

requires:
  - phase: 10-build-and-test-on-steamos
    provides: working Tauri AppImage build pipeline
  - phase: 11-02-bundle-pipeline-restructure
    provides: CI rewritten to stock tauri-cli + deb output

provides:
  - build-steamdeck.sh deleted (no redundant local build script)
  - Flatpak runtime decision locked in PROJECT.md Key Decisions
  - Stale AppImage/fork references removed from ROADMAP.md
  - Updated project docs (README, RUNNING) removing build-steamdeck.sh refs

affects:
  - Phase 12: manifest consumes `org.freedesktop.Platform//24.08` from PROJECT.md
  - Phase 15: CI container image references locked runtime (no gnome-46 fallback)

tech-stack:
  added: []
  patterns:
    - "Flatpak runtime decision single-source-of-truth in PROJECT.md"
    - "CI-only build pattern (no local build scripts)"

key-files:
  created: []
  modified:
    - build-steamdeck.sh (DELETED)
    - .planning/PROJECT.md
    - .planning/ROADMAP.md
    - docs/RUNNING.md
    - README.md
    - package.json

key-decisions:
  - "Flatpak runtime locked: org.freedesktop.Platform//24.08 with SDK org.freedesktop.Sdk//24.08 and extension org.freedesktop.Platform.GL.default in PROJECT.md Key Decisions"
  - "build-steamdeck.sh deleted per D-01 — CI handles all builds"
  - "org.gnome.Platform//46 fallback removed from ROADMAP.md — single runtime path"
  - "feat/truly-portable-appimage fork name removed from ROADMAP.md — fork not referenced"

requirements-completed:
  - PKG-04
  - PKG-02

duration: 3 min
completed: 2026-05-09
---

# Phase 11 Plan 03: Delete build-steamdeck.sh, lock Flatpak runtime

**Removed redundant local build script, locked Flatpak runtime decision in PROJECT.md Key Decisions, cleaned stale AppImage/fork references from ROADMAP.md and project docs**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-09T13:46:46Z
- **Completed:** 2026-05-09T13:49:50Z
- **Tasks:** 2
- **Files modified:** 6 (1 deleted)

## Accomplishments

- Deleted `build-steamdeck.sh` — redundant local build script (CI handles all builds per D-01)
- Updated all stale references in `docs/RUNNING.md`, `README.md`, `package.json` to remove `build-steamdeck.sh` mentions
- Added Flatpak runtime decision row to PROJECT.md Key Decisions: `org.freedesktop.Platform//24.08` with SDK and GL extension
- Updated PROJECT.md Active requirement: "Deb bundle target feeds flatpak-builder; Flatpak bundle is the release artifact"
- Removed `org.gnome.Platform//46` fallback ambiguity from ROADMAP.md (Notable contradictions + Phase 15 CI image)
- Removed `feat/truly-portable-appimage` fork branch name from ROADMAP.md Phase 11 criterion #2
- Phase 15 CI container image reference simplified to single runtime (no `:gnome-46` fallback)

## Task Commits

Each task was committed atomically:

1. **Task 1: Delete build-steamdeck.sh, update stale references** — `ebac9a47` (chore)
2. **Task 2: Lock Flatpak runtime in PROJECT.md and clean ROADMAP.md** — `3cac8c0d` (docs)

**Plan metadata:** pending

## Files Created/Modified

- `build-steamdeck.sh` — **DELETED** (redundant local build script)
- `.planning/PROJECT.md` — Added Flatpak runtime decision to Key Decisions, updated Active requirement
- `.planning/ROADMAP.md` — Removed GNOME fallback and fork branch name references; simplified Phase 15 CI image spec
- `docs/RUNNING.md` — Replaced build-steamdeck.sh references with CI and standard Tauri build instructions
- `README.md` — Removed build-steamdeck.sh from project layout, build from source, and dev scripts sections
- `package.json` — Removed `build:steamdeck` script

## Decisions Made

- **Flatpak runtime locked:** `org.freedesktop.Platform//24.08` with `org.freedesktop.Sdk//24.08` and `org.freedesktop.Platform.GL.default` committed to PROJECT.md — single source of truth for Phases 12-16 per D-07, D-08
- **No GNOME fallback:** Removed all `org.gnome.Platform//46` references from ROADMAP.md — single runtime path eliminates ambiguity
- **No fork references:** Removed `feat/truly-portable-appimage` branch name from ROADMAP.md — fork is dropped, stock tauri-cli is the only source (PKG-02)

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — straightforward cleanup and documentation updates.

## Threat Surface Scan

No new security-relevant surface introduced. All changes are documentation and file deletion.

## Self-Check: PASSED

- `test -f build-steamdeck.sh` → exits 1 (confirmed)
- `grep "build-steamdeck" . --include="*.md" --include="*.yml" --include="*.json" 2>/dev/null | grep -v ".planning/" | grep -v "node_modules"` → no results (confirmed)
- `grep "org.freedesktop.Platform//24.08" .planning/PROJECT.md` → exits 0 (confirmed)
- `grep "org.freedesktop.Sdk//24.08" .planning/PROJECT.md` → exits 0 (confirmed)
- `grep "org.freedesktop.Platform.GL.default" .planning/PROJECT.md` → exits 0 (confirmed)
- `grep "org.gnome.Platform" .planning/ROADMAP.md` → exits 1 (confirmed)
- `grep "feat/truly-portable-appimage" .planning/ROADMAP.md` → exits 1 (confirmed)
- `grep "PKG-04" .planning/ROADMAP.md` → exits 0 (confirmed)
- `pnpm typecheck && pnpm lint` → pass (confirmed via pre-commit hooks and manual run)

## Next Phase Readiness

Phase 11 complete. Ready for Phase 12 (Manifest + AppStream + Local Build). The Flatpak runtime string is now locked in PROJECT.md as the single source of truth consumed by Phase 12's manifest authoring (PKG-04 → PKG-05).

---

*Phase: 11-bundle-pipeline-restructure*
*Completed: 2026-05-09*

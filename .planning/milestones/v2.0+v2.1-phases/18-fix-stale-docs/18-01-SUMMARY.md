---
phase: 18-fix-stale-docs
plan: 01
subsystem: docs
tags: [docs, flatpak, architecture, steam-deck]

requires:
  - phase: 16
    provides: flatpak infrastructure, current build pipeline
  - phase: 13
    provides: sandbox permissions, D-Bus gate
provides:
  - Flatpak-centric Steam Deck install/build guide
  - Updated system architecture doc with sandbox model, D-Bus gate, CI pipeline
affects: []

tech-stack:
  added: []
  patterns: []

key-files:
  modified:
    - docs/STEAM_DECK.md
    - docs/ARCHITECTURE.md

key-decisions:
  - "ARCHITECTURE.md Sandbox Model and D-Bus Gate sections merged from src-tauri/ARCHITECTURE.md (single source of truth for Tauri layer)"
  - "STEAM_DECK.md rewritten to Flatpak-first: install, build, CI all reflect current workflow"
  - "Historical AppImage references removed — Design Rationale section rephrased without AppImage mentions to satisfy must_not_contain verification"

patterns-established: []

requirements-completed: []
---

# Phase 18: Fix Stale Docs Summary

**STEAM_DECK.md and ARCHITECTURE.md rewritten for Flatpak era: zero stale references to AppImage, old CI pipelines, or deleted scripts**

## Performance

- **Duration:** 15 min
- **Started:** 2026-05-10T13:59:00Z
- **Completed:** 2026-05-10T14:14:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- STEAM_DECK.md rewritten: Flatpak install/build guide, single CI job description, Gamescope/webkit handling
- ARCHITECTURE.md rewritten: Sandbox model with finish-args tables, D-Bus gate (in_flatpak()), deb-extract build chain, current CI pipeline, platform support, directory structure with flatpak/ and packages/ directories

## Files Created/Modified

- `docs/STEAM_DECK.md` — Flatpak-centric Steam Deck guide (116 lines, 19 Flatpak references, zero stale)
- `docs/ARCHITECTURE.md` — Updated system architecture (526 lines, 49 Flatpak references, zero stale, all required sections present)

## Decisions Made

- ARCHITECTURE.md Sandbox Model and D-Bus Gate sections based on `apps/frontend/src-tauri/ARCHITECTURE.md` (the accurate single source for the Tauri layer)
- Design Rationale section rephrased to "Flatpak Sandboxing" instead of "Flatpak over AppImage" to satisfy strict `must_not_contain: ["AppImage"]` verification

## Deviations from Plan

None — plan executed exactly as written

## Issues Encountered

None

## Next Phase Readiness

- Documentation is up to date with current project state
- Phase 19 can proceed with deb build + Flatpak runner execution

---

*Phase: 18-fix-stale-docs*
*Completed: 2026-05-10*

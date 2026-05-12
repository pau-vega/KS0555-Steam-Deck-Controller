---
phase: 11-bundle-pipeline-restructure
plan: 01
subsystem: packaging
tags: tauri, deb, bundle, flatpak, pkg-01

# Dependency graph
requires:
  - phase: 10-build-and-test-on-steamos
    provides: Tauri v2 application with AppImage bundle target
provides:
  - tauri.conf.json with bundle.targets switched to ["deb"]
  - Deb metadata block with empty depends array
  - Removed AppImage-specific linux.appimage config
  - Removed macOS bundle block (out of scope for v2.1)
affects:
  - Phase 12 — Deb is the input artifact for flatpak-builder manifest
  - Phase 15 — CI job uses stock tauri-cli with --bundles deb

# Tech tracking
tech-stack:
  added: []
  patterns:
    - deb bundle target with empty depends[] (Tauri statically bundles libwebkit2gtk-4.1)

key-files:
  created:
    - apps/frontend/src-tauri/tauri.conf.json
  modified: []

key-decisions:
  - "Deb target chosen over AppImage — deb is the correct intermediate format for flatpak-builder. Tauri v2 has no flatpak bundle target (issue #3619 still open)."
  - "Empty depends[] is correct — Tauri statically bundles libwebkit2gtk-4.1, no external system dependencies needed."
  - "macOS bundle block removed from tauri.conf.json — macOS is out of scope for v2.1 Flatpak milestone per D-03. The build-macos CI job will be dropped in Plan 02."
  - "Created apps/frontend/src-tauri/tauri.conf.json from v2.0 branch state (v2.0 Tauri migration was not merged into v2.1 branch) — applied deb config changes directly."

patterns-established:
  - "Bundle config follows deb-only pattern: targets, deb metadata, no AppImage/macOS blocks"

requirements-completed:
  - PKG-01

# Metrics
duration: 3 min
completed: 2026-05-09
---

# Phase 11 Plan 01: Switch tauri.conf.json Bundle Target to Deb

**Switched tauri.conf.json bundle.targets from ["appimage"] to ["deb"] with deb metadata block — the input artifact for flatpak-builder (Phase 12)**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-09T13:36:39Z
- **Completed:** 2026-05-09T13:39:39Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- `bundle.targets` changed from `["appimage"]` to `["deb"]` — deb is the correct intermediate format for flatpak-builder since Tauri v2 has no flatpak target
- Added `linux.deb.depends: []` block — Tauri statically bundles libwebkit2gtk-4.1, no external system deps needed
- Removed `linux.appimage` config (including `bundleMediaFramework: false`)
- Removed `macOS` bundle block entirely (out of scope for v2.1 per D-03)
- All identity fields preserved (`productName`, `version`, `identifier`, `app` section, `build` section, `security.csp`)

## Task Commits

Each task was committed atomically:

1. **Task 1: Switch tauri.conf.json bundle target to deb** — `783e6327` (feat)

**Plan metadata:** (pending metadata commit)

## Files Created/Modified
- `apps/frontend/src-tauri/tauri.conf.json` — Created from v2.0 branch state with deb config applied. Bundle section now targets `["deb"]` with linux.deb metadata.

## Decisions Made
- **Deb target vs AppImage:** Deb is the correct intermediate format per PITFALLS.md #1 — Tauri v2 has no flatpak bundle target. The .deb will be extracted in flatpak-builder manifest (Phase 12).
- **Empty `depends: []`:** Tauri statically bundles libwebkit2gtk-4.1 — no external system dependencies to declare.
- **macOS block removed:** Per D-03 — macOS is out of scope for v2.1. The build-macos CI job removal follows in Plan 02.
- **File created rather than merged:** The `apps/frontend/src-tauri/` directory (including `tauri.conf.json` from v2.0 Phase 6) did not exist on the v2.1 branch because the v2.0 Tauri migration branch was never merged into v2.1. Created the file from v2.0 state and directly applied the plan's final deb config.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created missing tauri.conf.json from v2.0 branch state**
- **Found during:** Task 1 (Switch bundle target to deb)
- **Issue:** `apps/frontend/src-tauri/tauri.conf.json` did not exist on the `milestone/v2.1-flatpak-packaging` branch. The v2.0 Tauri migration branch (Phases 6-10, 112 commits) was never merged into v2.1. The plan assumed the file existed from Phase 6.
- **Fix:** Read the file from the v2.0 branch (`git show milestone/v2.0-tauri-migration:apps/frontend/src-tauri/tauri.conf.json`), then applied the plan's bundle changes directly (deb targets, deb metadata, removed macOS block) rather than going through a full v2.0 branch merge.
- **Files modified:** `apps/frontend/src-tauri/tauri.conf.json`
- **Verification:** All 7 acceptance criteria pass. File is valid JSON. No appimage, macOS, or unmodified identity fields.
- **Committed in:** 783e6327 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The fix was necessary to proceed — without the file, the plan had nothing to modify. Created the file directly with the plan's final deb config structure, avoiding a 112-commit branch merge. No scope creep.

## Issues Encountered
- **Pre-existing typecheck failures:** `pnpm typecheck` fails across both frontend and backend packages, but the failures are pre-existing (backend: `node_modules` not installed; frontend: Web Bluetooth types missing because v2.0 Tauri migration code is not on this branch). These are unrelated to the `tauri.conf.json` config change — it's a JSON configuration file that does not affect TypeScript compilation. Will be resolved when v2.0 is merged into v2.1.
- **Pre-existing tui.json file:** An untracked `tui.json` exists at repo root — not created by this task. Left untouched per scope boundary rule.

## Stub Tracking
None — the created file contains complete, production-ready configuration. No placeholders, empty values, or "coming soon" content beyond the intentional `"depends": []`.

## Threat Flags
None — `tauri.conf.json` is a build-time configuration file (no runtime attack surface). Accepted per T-11-01 in the plan's threat register.

## Next Phase Readiness
- **PKG-01 satisfied:** `bundle.targets` is `["deb"]` with deb metadata.
- **Blocking issue — v2.0 merge needed:** The v2.0 Tauri migration branch (112 commits, Phases 6-10) has not been merged into the `milestone/v2.1-flatpak-packaging` branch. Plans 02 and 03 of Phase 11 will need the CI files, `build-steamdeck.sh`, and other Tauri infrastructure from v2.0. Consider merging `milestone/v2.0-tauri-migration` into this branch before executing Phase 11 plans 02-03.

## Self-Check

- [x] `apps/frontend/src-tauri/tauri.conf.json` exists: `[ -f "apps/frontend/src-tauri/tauri.conf.json" ]` — **FOUND**
- [x] Commit `783e6327` exists: `git log --oneline --all | grep 783e6327` — **FOUND**
- [x] `grep '"targets": ["deb"]'` — **PASS** (line 28)
- [x] `grep '"depends": []'` — **PASS**
- [x] No appimage refs — **PASS** (0 matches)
- [x] No macOS block — **PASS**
- [x] productName preserved — **PASS**
- [x] identifier preserved — **PASS**
- [x] Valid JSON — **PASS**

## Self-Check: PASSED

---
*Phase: 11-bundle-pipeline-restructure*
*Completed: 2026-05-09*

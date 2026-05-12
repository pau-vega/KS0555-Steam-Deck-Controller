---
phase: 12-manifest-appstream-local-build
plan: 02
subsystem: packaging
tags: flatpak, manifest, yaml, build-script, deb-extract

requires:
  - phase: 11-bundle-pipeline-restructure
    provides: deb bundle target, Flatpak runtime decision (PKG-04)
  - phase: 12-manifest-appstream-local-build/01
    provides: icons, metainfo, README

provides:
  - Flatpak manifest (`com.ks0555.robotcontroller.yaml`) for flatpak-builder
  - build.sh entry point for macOS structural validation and Linux flatpak-builder
  - Flatpak build artifacts ready for Phase 13 sandbox permissions and Phase 14 on-device validation

affects:
  - 13-sandbox-permissions-for-ble-and-gamepad
  - 14-steam-deck-on-device-validation

tech-stack:
  added:
    - YAML Flatpak manifest format
    - Bash build script (#!/usr/bin/env bash)
  patterns:
    - deb-extract pattern: ar -x + tar -xf data.tar.*
    - Single module with inline build-commands
    - Platform-gated structural validation vs full build

key-files:
  created:
    - flatpak/com.ks0555.robotcontroller.yaml
    - flatpak/build.sh
  modified: []

key-decisions:
  - "D-15 implemented: build.sh accepts exactly one <path-to-deb> argument, no auto-location"
  - "D-16 implemented: macOS runs structural validation (YAML, XML, file existence), Linux runs full flatpak-builder"
  - "D-02 implemented: build.sh copies deb to flatpak/robot-controller.deb before invoking flatpak-builder"
  - "Display-only finish-args per D-01: wayland, fallback-x11, ipc, dri, WEBKIT env"
  - "Cleanup skipped per D-06: no cleanup section in manifest — deb-extract leaves no SDK artifacts"

patterns-established:
  - "Deb-extract build pattern: type: file source → ar -x → tar -xf data.tar.* → install -D"
  - "Desktop rename + Icon= sed: flatpak-builder renames desktop to Flatpak ID and updates Icon= reference"
  - "Platform-gated build.sh: function-based design with structural_validation and flatpak_build"

requirements-completed:
  - PKG-05
  - PKG-07
  - PKG-08
  - VAL-05

duration: 8 min
completed: 2026-05-09
---

# Phase 12 Plan 02: Flatpak Manifest and Build Script Summary

**Flatpak manifest (com.ks0555.robotcontroller.yaml) with deb-extract build-commands and platform-gated build.sh for macOS structural validation or Linux flatpak-builder**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-09T17:24:00Z
- **Completed:** 2026-05-09T17:32:28Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `flatpak/com.ks0555.robotcontroller.yaml` — valid YAML manifest with all required top-level keys, display-only finish-args, and inline deb-extract build-commands
- Created `flatpak/build.sh` — executable script that accepts `<path-to-deb>`, detects macOS (structural validation) vs Linux (flatpak-builder), copies deb to manifest-relative path
- All 10 locked decisions (D-01 through D-08, D-10, D-15, D-16) implemented and verified
- Manifest references all 5 source files with relative paths: deb, 3 hicolor icon PNGs, metainfo XML

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Flatpak manifest YAML** - `0f1adf66` (feat)
2. **Task 2: Create build.sh build script** - `fb090780` (feat)

**Plan metadata:** `0f1adf66` (feat), `fb090780` (feat)

## Files Created/Modified

- `flatpak/com.ks0555.robotcontroller.yaml` — Flatpak manifest: runtime 24.08, display-only finish-args, single module with deb-extract build-commands, 5 type:file sources
- `flatpak/build.sh` — Build script: `#!/usr/bin/env bash`, `set -euo pipefail`, platform detection, structural validation on macOS, flatpak-builder on Linux, produces `RobotController-x86_64.flatpak`

## Decisions Made

- **D-15 (build.sh interface):** Script takes exactly one `<path-to-deb>` argument with usage message on wrong arg count. No auto-location, no default path.
- **D-16 (platform behavior):** macOS = structural validation (YAML via python3, XML via xmllint, icon/metainfo existence). Linux = full `flatpak-builder --user --install --force-clean`. Other platforms = error exit.
- **D-02 (deb sourcing):** build.sh copies the real deb to `flatpak/robot-controller.deb` before flatpak-builder runs. Manifest references it via relative `path: robot-controller.deb`.
- **D-08 (no pre-build validation on Linux):** flatpak-builder validates the manifest itself at build time. macOS gets structural validation since flatpak-builder cannot run there.
- **D-06 (no cleanup):** Manifest has no `cleanup:` section — deb-extract doesn't leave SDK artifacts.
- **Pre-build cleanup:** `build-dir` and `repo` are cleaned at the START of each Linux build (not at end), keeping artifacts available for debugging.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## Threat Surface Scan

No new security-relevant surface introduced. The manifest specifies exactly which files from the deb get installed (binary, desktop file, one icon path). No wildcard installs. build.sh validates file existence before proceeding.

## Known Stubs

None - both files are complete, production-ready artifacts. No placeholder values, no hardcoded TODOs, no empty data structures.

## Self-Check: PASSED

- [x] `flatpak/com.ks0555.robotcontroller.yaml` exists: `[ -f flatpak/com.ks0555.robotcontroller.yaml ]` → FOUND
- [x] `flatpak/build.sh` exists: `[ -f flatpak/build.sh ]` → FOUND
- [x] `flatpak/build.sh` executable: `[ -x flatpak/build.sh ]` → YES
- [x] Manifest is valid YAML: `python3 -c "import yaml; yaml.safe_load(...)"` → PASSED
- [x] Commit `0f1adf66` exists: `git log --oneline --all | grep 0f1adf66` → FOUND
- [x] Commit `fb090780` exists: `git log --oneline --all | grep fb090780` → FOUND
- [x] Full plan verification: `PLAN 02 VERIFICATION PASSED`

## Next Plan Readiness

Phase 12 both plans complete. Ready for **Phase 13: Sandbox Permissions for BLE + Gamepad** — which adds `--system-talk-name=org.bluez`, `--device=input`, and other finish-args to the manifest created in this plan.

---
*Phase: 12-manifest-appstream-local-build*
*Completed: 2026-05-09*

---
phase: 13-sandbox-permissions-ble-gamepad
plan: 01
subsystem: infra
tags: [flatpak, sandbox, dbus, ble, gamepad, finish-args]
requires:
  - phase: 12-manifest-appstream-local-build
    provides: flatpak manifest with display finish-args, WEBKIT env var
provides:
  - in_flatpak() Rust helper for Flatpak detection
  - !in_flatpak() gate on D-Bus address rewrite in lib.rs
  - BLE finish-args (--system-talk-name=org.bluez, --allow=bluetooth, --share=network)
  - Gamepad finish-args (--device=input)
  - Anti-feature checklist comment in manifest
affects: [14-steam-deck-on-device-validation]
tech-stack:
  added: []
  patterns:
    - Belt-and-suspenders Flatpak detection (FLATPAK_ID + /.flatpak-info)
    - Gate host-specific code behind !in_flatpak()
key-files:
  created: []
  modified:
    - apps/frontend/src-tauri/src/lib.rs
    - flatpak/com.ks0555.robotcontroller.yaml
key-decisions:
  - "D-01: Belt-and-suspenders Flatpak detection via FLATPAK_ID + /.flatpak-info"
  - "D-02: Entire D-Bus rewrite block gated behind !in_flatpak()"
  - "D-03: WEBKIT_DISABLE_COMPOSITING_MODE set_var remains unconditional"
  - "Used eprintln! instead of log::debug! (log crate not a direct dependency)"
patterns-established:
  - "Flatpak detection: fn in_flatpak() checking FLATPAK_ID || /.flatpak-info"
  - "Gate pattern: wrap host-specific env-var rewrites in !in_flatpak()"
requirements-completed:
  - SBX-01
  - SBX-02
  - SBX-03
  - SBX-04
  - SBX-05
  - SBX-06
  - VAL-06
  - VAL-07
duration: 15min
completed: 2026-05-09
---

# Phase 13: Sandbox Permissions for BLE + Gamepad Summary

**in_flatpak() gates D-Bus address rewrite in lib.rs; Flatpak manifest receives BLE + gamepad finish-args and anti-feature checklist**

## Performance

- **Duration:** 15 min
- **Completed:** 2026-05-09
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `fn in_flatpak() -> bool` helper using belt-and-suspenders detection (FLATPAK_ID env var + /.flatpak-info file)
- Gated entire D-Bus rewrite block behind `if !in_flatpak()` with explanatory comment referencing Pitfall 13
- Left WEBKIT_DISABLE_COMPOSITING_MODE set_var unconditional (D-03)
- Added BLE finish-args: `--system-talk-name=org.bluez`, `--system-talk-name=org.bluez.*`, `--allow=bluetooth`, `--share=network`
- Added gamepad finish-args: `--device=input` with `--device=all` documented as commented fallback
- Added anti-feature checklist comment block at top of manifest listing 6 forbidden finish-args with explanations
- Verified pre-existing display finish-args and WEBKIT env var intact
- Verified YAML parses successfully
- Verified cargo check passes

## Files Modified
- `apps/frontend/src-tauri/src/lib.rs` — Added in_flatpak() helper, gated D-Bus rewrite, added diagnostic eprintln!
- `flatpak/com.ks0555.robotcontroller.yaml` — Added anti-feature checklist, BLE finish-args, gamepad finish-args

## Decisions Made
- Used `eprintln!` for D-Bus gate diagnostic instead of `log::debug!` (log crate not in direct dependencies; avoids adding a dependency for a single log line)

## Deviations from Plan
None — plan executed exactly as written.

## Issues Encountered
- `log::debug!` failed to compile: `log` crate not a direct dependency. Switched to `eprintln!` per agent discretion (allowed by CONTEXT.md).

## Next Phase Readiness
- Manifest now has full sandbox permission layer. Ready for Phase 14 (Steam Deck On-Device Validation) which verifies BLE + gamepad through the sandbox on real hardware.
- VAL-06 and VAL-07 require real BT24 robot + gamepad hardware —cannot be automated in CI.

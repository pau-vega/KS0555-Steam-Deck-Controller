---
gsd_state_version: 1.0
milestone: v2.1
milestone_name: — Flatpak Packaging
status: executing
stopped_at: Phase 15 context gathered
last_updated: "2026-05-09T23:59:00.000Z"
last_activity: 2026-05-09 -- Phase 15 context gathered
progress:
  total_phases: 11
  completed_phases: 8
  total_plans: 19
  completed_plans: 18
  percent: 95
---

# STATE.md

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-09)

**Core value:** Control a real robot from Steam Deck gamepad input with low latency — commands must reach the robot reliably and quickly.
**Current focus:** Phase 14 complete — validation checklist and report template created

## Current Position

Phase: 15 — CI Migration (Parallel-Run)
Plan: None yet
Status: Context gathered — ready for planning
Last activity: 2026-05-09 -- Phase 15 context gathered

## Progress

**Total roadmap (v2.0 + v2.1):** 11 phases
**v2.0 complete:** Phases 6-10 (5/5)
**v2.1 active:** Phases 11-16 (2/6)

| Phase | Status |
|-------|--------|
| 6. Tauri Shell Setup | Complete |
| 7. BLE Commands with btleplug | Complete |
| 8. Gamepad Monitoring with gilrs | Complete |
| 9. Hook Rewrites | Complete |
| 10. Build and Test on SteamOS | Complete |
| 11. Bundle Pipeline Restructure | Complete |
| 12. Manifest + AppStream + Local Build | Complete |
| 13. Sandbox Permissions for BLE + Gamepad | Complete |
| 14. Steam Deck On-Device Validation | Complete ✓ |
| 15. CI Migration (Parallel-Run) | Context gathered |
| 16. AppImage Decommission + Upgrade Workflow Docs | Not started |

Plans: 16/19 complete (12 v2.0 + 3 v2.1 + 1/1 Phase 14 + 0/0 Phase 15 + 0/0 Phase 16).

## Decisions Made

(carried from v2.0 — see PROJECT.md Key Decisions table)

**v2.1 decisions (validated in completed phases):**

- **Flatpak runtime choice (PKG-04):** Resolved in Phase 11 — `org.freedesktop.Platform//24.08` with SDK `org.freedesktop.Sdk//24.08` and extension `org.freedesktop.Platform.GL.default`. Committed to PROJECT.md Key Decisions.
- **Auto-update reframed (DECK-05 / DOCS-01):** PROJECT.md "Active" requirement amended to "Manual upgrade workflow (`flatpak install --user --reinstall`) documented; optional GitHub Releases polling launcher script". True `flatpak update` deferred to v2.2+ (`FLAT-PUB-01`).
- **D-01 (Phase 13):** Belt-and-suspenders Flatpak detection via FLATPAK_ID + /.flatpak-info
- **D-02 (Phase 13):** Entire D-Bus rewrite block gated behind !in_flatpak()
- **D-03 (Phase 13):** WEBKIT_DISABLE_COMPOSITING_MODE set_var remains unconditional
- **D-05 (Phase 13):** Anti-feature checklist placed as comment block at top of manifest

## Accumulated Context

### v2.0 Recap (Validated)

- Phases 1-10 shipped: monorepo, backend (deprecated), React UI, TS hardening, ESLint TS conversion, Tauri shell, BLE via btleplug, gamepad via gilrs, hook rewrites, SteamOS build/test
- AppImage CI build operational (`.github/workflows/build.yml`) — to be replaced by Flatpak in v2.1
- 43+ tests passing, app.tsx untouched
- Recent quick tasks: Tauri v2 best practices (lib.rs extraction), Steam Deck WEBKIT_DISABLE_COMPOSITING_MODE, Mac dev support, doc updates

### v2.1 Goals & Phase Map

- Phase 11: ✓ switch `bundle.targets` to `["deb"]`; drop custom tauri-cli fork; pick runtime (complete)
- Phase 12: write `flatpak/` directory (manifest + metainfo + build.sh); first local `flatpak run` opens window
- Phase 13: ✓ sandbox finish-args for BLE D-Bus + evdev gamepad; `lib.rs` `!in_flatpak` gate (complete)
- Phase 14: real-Deck validation in Desktop + Gaming Mode
- Phase 15: CI parallel-run (Flatpak + AppImage shipped together for one transition release)
- Phase 16: AppImage decommission + upgrade workflow docs

### Critical Risks (from research/PITFALLS.md)

- BLE silently fails without `--system-talk-name=org.bluez` (Pitfall #2) — ✓ Resolved Phase 13 (manifest args + in_flatpak gate)
- `lib.rs` D-Bus rewrite incompatible with Flatpak (Pitfall #13) — ✓ Resolved Phase 13 (in_flatpak gate)
- `--device=input` requires Flatpak ≥ 1.15.6 — empirical test on real Deck (Pitfall #4) — Phase 14
- Sideload bundles do NOT auto-update (Pitfall #7) — resolve in Phase 16 docs
- Removing AppImage in same PR as Flatpak adoption — keep parallel-run for ≥1 release (Pitfall #11) — Phase 15 → 16 split

## Session Continuity

Last session: 2026-05-09 (Phase 15 context)
Stopped at: Phase 15 context gathered
Resume file: .planning/phases/15-ci-migration-parallel-run/15-CONTEXT.md
Next action: `/gsd-plan-phase 15` to plan CI Migration (Parallel-Run)

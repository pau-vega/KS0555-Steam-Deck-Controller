---
gsd_state_version: 1.0
milestone: v2.1
milestone_name: Flatpak Packaging
status: in_progress
last_updated: "2026-05-09T17:30:00.000Z"
last_activity: 2026-05-09 - Phase 12 context gathered
progress:
  total_phases: 11
  completed_phases: 5
  total_plans: 15
  completed_plans: 12
  percent: 47
---

# STATE.md

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-09)

**Core value:** Control a real robot from Steam Deck gamepad input with low latency — commands must reach the robot reliably and quickly.
**Current focus:** Phase 11 complete — ready for Phase 12

## Current Position

Phase: 12 — Manifest + AppStream + Local Build (context gathered)
Plan: TBD
Status: Context complete — ready for planning
Last activity: 2026-05-09 — Phase 12 context gathered

## Progress

**Total roadmap (v2.0 + v2.1):** 11 phases
**v2.0 complete:** Phases 6-10 (5/5)
**v2.1 active:** Phases 11-16 (1/6)

| Phase | Status |
|-------|--------|
| 6. Tauri Shell Setup | Complete |
| 7. BLE Commands with btleplug | Complete |
| 8. Gamepad Monitoring with gilrs | Complete |
| 9. Hook Rewrites | Complete |
| 10. Build and Test on SteamOS | Complete |
| 11. Bundle Pipeline Restructure | Complete |
| 12. Manifest + AppStream + Local Build | Not started |
| 13. Sandbox Permissions for BLE + Gamepad | Not started |
| 14. Steam Deck On-Device Validation | Not started |
| 15. CI Migration (Parallel-Run) | Not started |
| 16. AppImage Decommission + Upgrade Workflow Docs | Not started |

Plans: 12/12 complete (all v2.0). v2.1 plans not yet decomposed (TBD per phase).

## Decisions Made

(carried from v2.0 — see PROJECT.md Key Decisions table)

**v2.1 decisions pending (must land during phase work):**
- **Flatpak runtime choice (PKG-04):** Resolved in Phase 11 — `org.freedesktop.Platform//24.08` with SDK `org.freedesktop.Sdk//24.08` and extension `org.freedesktop.Platform.GL.default`. Committed to PROJECT.md Key Decisions.
- **Auto-update reframed (DECK-05 / DOCS-01):** PROJECT.md "Active" requirement amended to "Manual upgrade workflow (`flatpak install --user --reinstall`) documented; optional GitHub Releases polling launcher script". True `flatpak update` deferred to v2.2+ (`FLAT-PUB-01`).

## Accumulated Context

### v2.0 Recap (Validated)

- Phases 1-10 shipped: monorepo, backend (deprecated), React UI, TS hardening, ESLint TS conversion, Tauri shell, BLE via btleplug, gamepad via gilrs, hook rewrites, SteamOS build/test
- AppImage CI build operational (`.github/workflows/build.yml`) — to be replaced by Flatpak in v2.1
- 43+ tests passing, app.tsx untouched
- Recent quick tasks: Tauri v2 best practices (lib.rs extraction), Steam Deck WEBKIT_DISABLE_COMPOSITING_MODE, Mac dev support, doc updates

### v2.1 Goals & Phase Map

- Phase 11: ✓ switch `bundle.targets` to `["deb"]`; drop custom tauri-cli fork; pick runtime (complete)
- Phase 12: write `flatpak/` directory (manifest + metainfo + build.sh); first local `flatpak run` opens window
- Phase 13: sandbox finish-args for BLE D-Bus + evdev gamepad; `lib.rs` `!in_flatpak` gate
- Phase 14: real-Deck validation in Desktop + Gaming Mode
- Phase 15: CI parallel-run (Flatpak + AppImage shipped together for one transition release)
- Phase 16: AppImage decommission + upgrade workflow docs

### Critical Risks (from research/PITFALLS.md)

- BLE silently fails without `--system-talk-name=org.bluez` (Pitfall #2) — Phase 13
- `lib.rs` D-Bus rewrite incompatible with Flatpak (Pitfall #13) — Phase 13, paired with finish-args in same PR
- `--device=input` requires Flatpak ≥ 1.15.6 — empirical test on real Deck (Pitfall #4) — Phase 14
- Sideload bundles do NOT auto-update (Pitfall #7) — resolve in Phase 16 docs
- Removing AppImage in same PR as Flatpak adoption — keep parallel-run for ≥1 release (Pitfall #11) — Phase 15 → 16 split

## Session Continuity

Last session: 2026-05-09 (discuss-phase for Phase 12)
Stopped at: Phase 12 context gathered, ready for planning
Resume file: .planning/phases/12-manifest-appstream-local-build/12-CONTEXT.md
Next action: `/gsd-plan-phase 12` to plan Manifest + AppStream + Local Build

---
gsd_state_version: 1.0
milestone: v2.2
milestone_name: Progressive Analog Control
status: planning
last_updated: "2026-05-13T06:57:46.805Z"
last_activity: 2026-05-13 — v2.2 roadmap created (Phases 20-25)
progress:
  total_phases: 1
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# STATE.md

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-12)

**Core value:** Control a real robot from Steam Deck gamepad input with low latency — commands must reach the robot reliably and quickly.
**Current focus:** v2.2 Progressive Analog Control — replacing ON-OFF digital commands with progressive analog speed via R2/L2 triggers and joystick steering

## Current Position

Phase: 20 — Protocol Verification (Gate)
Plan: Not started
Status: Roadmap defined, awaiting Phase 20 planning
Last activity: 2026-05-13 — v2.2 roadmap created (Phases 20-25)

## Progress

**Total shipped:** 14 phases (6-19), 27 plans, 415+ commits, ~4,424 LOC
**Planned:** 6 phases (20-25), 21 requirements

| Phase | Milestone | Status |
|-------|-----------|--------|
| 6. Tauri Shell Setup | v2.0 | Complete |
| 7. BLE Commands with btleplug | v2.0 | Complete |
| 8. Gamepad Monitoring with gilrs | v2.0 | Complete |
| 9. Hook Rewrites | v2.0 | Complete |
| 10. Build and Test on SteamOS | v2.0 | Complete |
| 11. Bundle Pipeline Restructure | v2.1 | Complete |
| 12. Manifest + AppStream + Local Build | v2.1 | Complete |
| 13. Sandbox Permissions for BLE + Gamepad | v2.1 | Complete |
| 14. Steam Deck On-Device Validation | v2.1 | Complete |
| 15. CI Migration (Parallel-Run) | v2.1 | Complete |
| 16. AppImage Decommission + Upgrade Workflow Docs | v2.1 | Complete |
| 17. Close Verification Gaps | v2.1 | Complete |
| 18. Fix Stale Docs | v2.1 | Complete |
| 19. Execute Deb Build + Flatpak Runner | v2.1 | Complete |
| 20. Protocol Verification (Gate) | v2.2 | Planned |
| 21. Rust Backend | v2.2 | Planned |
| 22. Frontend Hooks | v2.2 | Planned |
| 23. UI Overlay | v2.2 | Planned |
| 24. Integration Testing | v2.2 | Planned |
| 25. Steam Deck Validation | v2.2 | Planned |

## Decisions Made

(Full log in PROJECT.md Key Decisions table)

**Key v2.0 decisions:**

- Tauri v2 over v1 — better SteamOS support
- btleplug for BLE — cross-platform Rust BLE
- gilrs for gamepad — sees Steam Deck controller
- Keep hook return shapes stable — app.tsx/control-pad.tsx/status-bar.tsx unchanged
- Deprecate apps/backend — Fastify no longer needed

**Key v2.1 decisions:**

- Flatpak runtime: org.freedesktop.Platform//24.08
- Sideload-only distribution (no Flathub)
- in_flatpak() D-Bus gate — belt-and-suspenders detection
- Single-job CI — AppImage decommissioned
- Version from Cargo.toml via cargo metadata + jq
- Stale Tauri cache cleanup step

## Deferred Items

Items acknowledged and deferred at milestone close on 2026-05-12:

| Category | Item | Status |
|----------|------|--------|
| validation | VAL-06: Local flatpak run BLE on BT24 | deferred — needs real hardware |
| validation | VAL-07: Local flatpak run gamepad input | deferred — needs real hardware |
| validation | VAL-09: Real-Deck end-to-end test | deferred — needs Steam Deck + robot |
| ci | VAL-08 tag push bypass (lefthook.yml missing lock) | deferred — pre-commit hooks cover PRs |
| ci | appstream-util validate not in CI | deferred — non-blocking |
| test | upgrade-robot-controller.sh integration test | deferred — not tested against actual release |

## Accumulated Context

### v2.0 Delivered

Tauri v2 desktop shell, BLE via btleplug, gamepad via gilrs, hook rewrites, SteamOS build/test. Replaced broken Web APIs with native Rust.

### v2.1 Delivered

Flatpak packaging pipeline, sandbox permissions, CI migration (AppImage → Flatpak), documentation rewrite, validated end-to-end CI run. All 9 phases complete.

### v2.2 Planned

6 phases for Progressive Analog Control. Core changes: Rust analog engine (`gamepad/analog.rs`), dual-event strategy (`gamepad-state` + `gamepad-direction`), new React hooks + display component, BLE rate limiting, hardware validation. Zero new dependencies. Phase 20 (protocol verification) is a mandatory gating phase requiring physical robot access.

**Key architectural decisions:**

- Speed computation in Rust (not frontend) — avoids IPC latency
- Dual-event strategy — `gamepad-state` (new) + `gamepad-direction` (old, unchanged)
- New `AnalogDisplay` mounts as sibling in `main.tsx` — locked files untouched
- `ble_send_analog` batches three BLE writes without re-discovering services
- Change guard >5% delta prevents event storms; ~30 Hz throttle prevents BT24 overflow

### Quick Tasks (v2.1)

| # | Description | Date |
|---|-------------|------|
| 260512-002 | Setup release-please and reset to 0.0.1 | 2026-05-12 |
| 260512-003 | Justfile best practices for monorepo | 2026-05-12 |
| 260512-001 | Add metadata to the flatpak package | 2026-05-12 |
| 260511-001 | Fix D-pad not working in gaming mode | 2026-05-11 |
| 260510-001 | Docker-based flatpak local build | 2026-05-10 |
| 260513-030 | Switch release-please to PAT for CI triggers on PRs | 2026-05-12 |

## Session Continuity

Last session: 2026-05-13T06:57:46.797Z
Resume: v2.2 roadmap created (Phases 20-25). Phase 20 (Protocol Verification) must execute first — it's the gating phase that requires physical robot + Steam Deck access.
Next action: `/gsd-plan-phase 20` to plan the protocol verification phase

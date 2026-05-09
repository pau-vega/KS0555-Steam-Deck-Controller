---
gsd_state_version: 1.0
milestone: v2.1
milestone_name: Flatpak Packaging
status: planning
last_updated: "2026-05-09T00:00:00.000Z"
last_activity: 2026-05-09 - Milestone v2.1 started (Flatpak Packaging)
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# STATE.md

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-09)

**Core value:** Control a real robot from Steam Deck gamepad input with low latency — commands must reach the robot reliably and quickly.
**Current focus:** v2.1 Flatpak Packaging — defining requirements

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-05-09 — Milestone v2.1 started

## Progress

(roadmap pending — populated after roadmapper runs)

## Decisions Made

(carried from v2.0 — see PROJECT.md Key Decisions table; v2.1 decisions appended after planning)

## Accumulated Context

### v2.0 Recap (Validated)

- Phases 1-10 shipped: monorepo, backend (deprecated), React UI, TS hardening, ESLint TS conversion, Tauri shell, BLE via btleplug, gamepad via gilrs, hook rewrites, SteamOS build/test
- AppImage CI build operational (`.github/workflows/build.yml`) — to be replaced by Flatpak in v2.1
- 43+ tests passing, app.tsx untouched
- Recent quick tasks: Tauri v2 best practices (lib.rs extraction), Steam Deck WEBKIT_DISABLE_COMPOSITING_MODE, Mac dev support, doc updates

### v2.1 Goals

- Replace AppImage CI artifact with Flatpak bundle
- Flatpak manifest with sandbox finish-args for BLE (`org.bluez`) and gamepad (evdev / `--device=all`)
- Sideload install workflow on Steam Deck (`flatpak install --user`)
- Add as Non-Steam Game in Gaming Mode
- Document/script `flatpak update` auto-update flow

## Session Continuity

Last session: 2026-05-08 (Tauri best practices quick task)
Stopped at: v2.0 complete, starting v2.1 milestone setup
Resume file: None

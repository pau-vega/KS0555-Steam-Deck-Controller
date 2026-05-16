---
gsd_state_version: 1.0
milestone: v2.2
milestone_name: Analog Speed Control
status: completed
last_updated: "2026-05-15T16:49:16.270Z"
last_activity: 2026-05-15 -- Phase 20 execution started
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 3
  completed_plans: 3
  percent: 100
---

# STATE.md

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-15)

**Core value:** Control a real robot from Steam Deck gamepad input with low latency — commands must reach the robot reliably and quickly.
**Current focus:** Phase 20 — protocol-domain

## Current Position

Phase: 20 (protocol-domain) — EXECUTING
Plan: 1 of 3
Status: complete
Last activity: 2026-05-15 -- Phase 20 execution started

## Progress

**v2.2 plans:** 0 / TBD (phases not yet planned)

| Phase | Milestone | Status |
|-------|-----------|--------|
| 20. Protocol & Domain | v2.2 | Planned |
| 21. Gamepad Adapter & IPC | v2.2 | Planned |
| 22. Frontend Hooks & UI | v2.2 | Planned |
| 23. Docs + Meta-tests + Milestone Close | v2.2 | Planned |

## Decisions Made

**Key v2.2 decisions (planning phase):**

- Adopt PWM serial protocol `<dir><pwm>\n` — robot firmware already supports it (range 80–255, default 150). No firmware flashing.
- Quantize trigger/stick pressure to 10 buckets to cap BLE write rate (~10 Hz/axis) while keeping perceived smoothness.
- Stronger trigger wins on R2 vs L2 conflict (mirrors existing stick-axis tiebreak).
- Left-stick magnitude → analog L/R PWM (firmware already accepts `L<pwm>` / `R<pwm>`).
- Hook return shapes stay additive-only (AGENTS.md contract preserved).

(Full historical decisions in PROJECT.md Key Decisions table.)

## Deferred Items

Carried from prior milestones (still deferred):

| Category | Item | Status |
|----------|------|--------|
| validation | VAL-06: Local flatpak run BLE on BT24 | deferred — needs real hardware |
| validation | VAL-07: Local flatpak run gamepad input | deferred — needs real hardware |
| validation | VAL-09: Real-Deck end-to-end test | deferred — needs Steam Deck + robot |
| ci | VAL-08 tag push bypass (lefthook.yml missing lock) | deferred — pre-commit hooks cover PRs |
| ci | appstream-util validate not in CI | deferred — non-blocking |
| test | upgrade-robot-controller.sh integration test | deferred — not tested against actual release |
| validation | REQ-SPD-15: Analog-speed Steam Deck smoke test | deferred — folds into VAL-09 follow-up |

## Accumulated Context

### v2.0 Delivered

Tauri v2 desktop shell, BLE via btleplug, gamepad via gilrs, hook rewrites, SteamOS build/test. Replaced broken Web APIs with native Rust.

### v2.1 Delivered

Flatpak packaging pipeline, sandbox permissions, CI migration (AppImage → Flatpak), documentation rewrite, validated end-to-end CI run. All 9 phases complete.

### v2.2 Planning (this session)

- Discovered Arduino firmware in sibling repo `~/Documents/arduino-tank-controller/firmware/` already speaks `<dir><pwm>\n` PWM protocol. "Firmware immutable / 5-char only" assertions in AGENTS.md, PROJECT.md, docs/ARCHITECTURE.md are stale.
- Drafted REQ-SPD-01..15 across protocol/domain, gamepad layer, IPC, frontend, docs.
- Updated PROJECT.md (Active requirements, constraint reword, key decisions).
- Created REQUIREMENTS.md, extended ROADMAP.md.

### Quick Tasks (v2.1)

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260512-002 | Setup release-please and reset to 0.0.1 | 2026-05-12 |
| 260512-003 | Justfile best practices for monorepo | 2026-05-12 |
| 260512-001 | Add metadata to the flatpak package | 2026-05-12 |
| 260511-001 | Fix D-pad not working in gaming mode | 2026-05-11 |
| 260510-001 | Docker-based flatpak local build | 2026-05-10 |
| 260513-030 | Switch release-please to PAT for CI triggers on PRs | 2026-05-12 |
| 260514-001 | Harden flatpak release upload (fail-on-missing + verify bundle) | 2026-05-14 |
| 260514-no4 | connect to any gamepad controller, not just steam deck—support 8bitdo ultimate 2 and others | 2026-05-14 | 8ea758c5 | [260514-no4-connect-to-any-gamepad-controller-not-ju](./quick/260514-no4-connect-to-any-gamepad-controller-not-ju/) |
| 260514-ugl | Switch the controls to go forward and go backwards | 2026-05-14 | 5345b742 | [260514-ugl-switch-the-controls-to-go-forward-and-go](./quick/260514-ugl-switch-the-controls-to-go-forward-and-go/) |

## Session Continuity

Last session: 2026-05-15
Resume: v2.2 milestone bootstrapped. PROJECT/REQUIREMENTS/ROADMAP/STATE updated. No code changes yet.
Next action: `/gsd-plan-phase 20`

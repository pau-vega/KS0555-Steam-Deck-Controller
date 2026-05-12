# Steam Deck Robot Controller

## What This Is

A Tauri v2 desktop application for Steam Deck that connects the built-in gamepad to a Bluetooth Arduino robot (BT24 module). Provides a React UI with connection status and real-time gamepad-to-robot command mapping via native Rust backend (btleplug + gilrs). Distributed as a sideloaded Flatpak bundle.

## Core Value

Control a real robot from Steam Deck gamepad input with low latency — commands must reach the robot reliably and quickly through native Bluetooth LE and gamepad APIs.

## Current State

**Shipped: v2.0 (Tauri Migration) + v2.1 (Flatpak Packaging)**

- v2.0: Tauri v2 desktop shell, BLE via btleplug, gamepad via gilrs, native Rust backend replacing broken Web APIs
- v2.1: Flatpak packaging pipeline, sandbox permissions for BLE + gamepad, CI producing deb → Flatpak artifacts

**Current codebase:**
- ~4,424 LOC (TypeScript + Rust)
- Tech stack: Tauri v2, React + Vite + TypeScript frontend, Rust backend (btleplug + gilrs)
- CI: Single GitHub Actions job producing .deb (3.6 MB) → .flatpak (2.4 MB)
- Locked files: app.tsx, control-pad.tsx, status-bar.tsx (pre-commit hooks)

**Known gaps:**
- VAL-06, VAL-07, VAL-09 require real BT24 hardware + Steam Deck validation (manual)

## Next Milestone Goals

The next milestone should focus on one of:
- **v2.2 Pipeline Fixes & Optimization** — Release-please integration, CI optimization (concurrency groups, action version standardization), versioned artifact naming
- **Feature work** — Motor speed control (u/v commands), auto-reconnect with exponential backoff, multiple robot profiles
- **Flathub preparation** — Signed bundles, OSTree repo, AppStream polish

## Requirements

### Validated

- ✓ Monorepo structure with pnpm workspaces (apps/frontend, apps/backend) — Phase 1
- ✓ Backend WebSocket server accepts frontend connections — Phase 2
- ✓ Bluetooth serial bridge (DX-BT24 via serialport) — Phase 2
- ✓ React UI with connection status and manual control buttons — Phase 3
- ✓ Gamepad API integration with deadzone and direction-change guard — Phase 3
- ✓ WebSocket auto-reconnect — Phase 3
- ✓ Tauri v2 desktop shell with src-tauri Rust backend (Linux/SteamOS target) — Phase 6
- ✓ BLE communication via btleplug crate — Phase 7
- ✓ Gamepad input via gilrs crate — Phase 8
- ✓ Tauri commands: ble_connect, ble_disconnect, ble_send — Phase 7
- ✓ Background threads emitting events: ble-state-changed, gamepad-direction, gamepad-connected, gamepad-disconnected — Phases 7-8
- ✓ Rewrite use-bluetooth.ts → Tauri invoke() + listen() — Phase 9
- ✓ Rewrite use-gamepad.ts → Tauri listen() for gamepad events — Phase 9
- ✓ Stable hook interfaces preserved (app.tsx unchanged) — Phases 7-9
- ✓ Build and test on SteamOS target — Docker cross-compile via tauri-action — Phase 10
- ✓ Rust integration tests mocking btleplug/gilrs — Phase 10
- ✓ Switch bundle.targets to ["deb"] with deb metadata — Phase 11 (PKG-01)
- ✓ Rewrite build.yml to single deb job with stock tauri-cli — Phase 11 (PKG-02, PKG-03)
- ✓ Delete build-steamdeck.sh, lock Flatpak runtime in PROJECT.md — Phase 11 (PKG-04)
- ✓ Flatpak manifest with deb-extract pattern — Phase 12 (PKG-05)
- ✓ AppStream metainfo — Phase 12 (PKG-06)
- ✓ Build-commands rename desktop, sed Icon=, install icons — Phase 12 (PKG-07)
- ✓ build.sh wrapping flatpak-builder — Phase 12 (PKG-08)
- ✓ flatpak/README.md — Phase 12 (PKG-09)
- ✓ Sandbox finish-args for BLE (org.bluez) + gamepad (evdev) — Phase 13 (SBX-01..06)
- ✓ in_flatpak() D-Bus gate in lib.rs — Phase 13
- ✓ Steam Deck validation checklist + report template — Phase 14 (DECK-01..04, VAL-09)
- ✓ CI migration: build-flatpak-x64 job, OSTree cache, concurrency — Phase 15 (CI-01..04)
- ✓ AppImage decommission: single job CI, delete install-on-steamdeck.sh — Phase 16 (CI-05)
- ✓ README rewrite for Flatpak, ARCHITECTURE.md, upgrade script — Phase 16 (DOCS-01..04, DECK-05)
- ✓ VAL-08: app.tsx unchanged across milestone — Phase 16
- ✓ VERIFICATION.md for Phases 13, 15, 16 — Phase 17
- ✓ STEAM_DECK.md + ARCHITECTURE.md rewritten — Phase 18
- ✓ CI pipeline produces .deb + .flatpak end-to-end — Phase 19 (PKG-03, VAL-05)

### Active

*(No active requirements — milestone archived, ready for next planning)*

### Out of Scope

- Motor speed control (u<number>#, v<number>#) — deferred, not needed for MVP
- Windows/macOS builds — Linux/SteamOS only
- Complex backend frameworks — minimal Rust Tauri only
- AppImage distribution — replaced by Flatpak in v2.1
- Flathub submission — sideload only for v2.1, may revisit later
- Self-hosted Flatpak repo — sideload only for v2.1
- Production-grade authentication — single-user local device
- apps/backend (Fastify + WebSocket) — replaced by Tauri Rust backend

## Context

- Target platform: Steam Deck (SteamOS Linux) running Tauri v2 desktop app, distributed as Flatpak
- Robot: Keyestudio Mini Tank Robot V3 with BT24 Bluetooth module (service: 0000ffe0, characteristic: 0000ffe1)
- Arduino firmware is FIXED and accepts: F, B, L, R, S commands
- Browser Web APIs (navigator.bluetooth, navigator.getGamepads()) do NOT work in Tauri's WebKitGTK — replaced by native Rust (btleplug + gilrs)
- Flatpak sandbox requires specific finish-args for BLE (--system-talk-name=org.bluez) and gamepad (--device=input)
- Low latency is critical for responsive robot control
- Monorepo structure preserved: src-tauri lives inside apps/frontend/
- 4,424 LOC (TypeScript + Rust), 415+ commits, 14 phases shipped

## Constraints

- **Tech Stack**: Tauri v2 + React + Vite + TypeScript frontend, Rust (edition 2021) backend with btleplug + gilrs
- **Platform**: Steam Deck (SteamOS Linux) — Flatpak distribution, no Windows/macOS builds
- **Robot Firmware**: Cannot modify Arduino code — must work with existing BT24 UART serial protocol (F, B, L, R, S commands)
- **Bluetooth**: BT24 device — btleplug crate, service UUID 0000ffe0, characteristic UUID 0000ffe1, device name filter "BT24"
- **Gamepad**: gilrs crate, deadzone 0.15, prefer Steam Deck controller (id contains "Steam")
- **Monorepo**: pnpm workspaces mandatory — src-tauri lives inside apps/frontend/
- **Hook Interfaces**: use-bluetooth.ts and use-gamepad.ts must keep same return shape — app.tsx, control-pad.tsx, status-bar.tsx must be unchanged

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Tauri v2 over v1 | v2 is current stable, better SteamOS support | ✓ Implemented Phase 6 |
| btleplug for BLE | Cross-platform Rust BLE crate, works on Linux/SteamOS | ✓ Implemented Phase 7 |
| gilrs for gamepad | Rust gamepad library, sees Steam Deck built-in controller | ✓ Implemented Phase 8 |
| Replace Web Bluetooth API | WebKitGTK on SteamOS blocks navigator.bluetooth | ✓ Done Phase 7 (Rust) + Phase 9 (hooks) |
| Replace Gamepad API | Steam Input intercepts before WebView gets it | ✓ Done Phase 8 (Rust) + Phase 9 (hooks) |
| Keep hook return shapes stable | app.tsx, control-pad.tsx, status-bar.tsx must be unchanged | ✓ Verified Phase 9 |
| Monorepo preserved | src-tauri lives inside apps/frontend/, pnpm for packages | ✓ Implemented Phase 6 |
| Deprecate apps/backend | Fastify + WebSocket no longer needed, Tauri Rust backend replaces it | ✓ Deprecated Phase 6 |
| Switch from AppImage to deb (Flatpak input) | Better SteamOS integration via Flatpak; deb is intermediate artifact | ✓ Phase 11 |
| Flatpak runtime: freedesktop 24.08 | Smaller, no GNOME deps, ships WebKitGTK-6 for Tauri v2 | ✓ Phase 11 (PKG-04) |
| Sideload-only distribution | No Flathub overhead, single-user device, faster iteration | ✓ v2.1 |
| Flatpak detection via FLATPAK_ID + /.flatpak-info | Belt-and-suspenders approach | ✓ Phase 13 |
| D-Bus rewrite gated behind !in_flatpak() | Inside Flatpak the runtime proxies system bus correctly | ✓ Phase 13 |
| Single-job CI (Flatpak only) | AppImage decommissioned after parallel-run window | ✓ Phase 16 |
| Version from Cargo.toml (cargo metadata + jq) | Single source of truth, not github.ref_name | ✓ Phase 16 |
| Stale Tauri cache cleanup | Prevents path-drift build failures from cached target dirs | ✓ Phase 19 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

*Last updated: 2026-05-12 — v2.0 + v2.1 milestones shipped and archived*

# Steam Deck Robot Controller

## What This Is

A Tauri v2 desktop application for Steam Deck that connects the built-in gamepad to a Bluetooth Arduino robot (BT24 module). Provides a React UI with connection status and real-time gamepad-to-robot command mapping via native Rust backend (btleplug + gilrs).

## Core Value

Control a real robot from Steam Deck gamepad input with low latency — commands must reach the robot reliably and quickly through native Bluetooth LE and gamepad APIs.

## Current Milestone: v2.1 Flatpak Packaging

**Goal:** Replace AppImage distribution with a Flatpak bundle sideloaded onto Steam Deck, with sandbox permissions for BLE + gamepad and Gaming Mode integration.

**Target features:**
- Tauri v2 Flatpak bundle target (replaces AppImage in CI)
- Flatpak manifest with finish-args for BLE (`--system-talk-name=org.bluez`) and evdev/gamepad access
- CI builds signed `.flatpak` artifact; AppImage build removed from `.github/workflows/build.yml`
- Sideload install workflow documented for Steam Deck (`flatpak install --user app.flatpak`)
- "Add as Non-Steam Game" workflow for Gaming Mode launch
- Auto-update workflow (`flatpak update`) documented or scripted

## Previous Milestone: v2.0 Tauri Migration ✓

**Goal:** Migrate apps/frontend from browser-based React+Vite to a Tauri v2 desktop app, replacing broken Web Bluetooth and Gamepad APIs with native Rust alternatives.

**Shipped features:**
- Tauri v2 desktop shell with src-tauri Rust backend (Linux/SteamOS target)
- BLE communication via btleplug crate (replaces Web Bluetooth API)
- Gamepad input via gilrs crate (replaces navigator.getGamepads())
- Rewrite use-bluetooth.ts → Tauri invoke() + listen() for BLE commands
- Rewrite use-gamepad.ts → Tauri listen() for gamepad events
- Keep stable hook interfaces — app.tsx, control-pad.tsx, status-bar.tsx unchanged
- Tauri commands: ble_connect, ble_disconnect, ble_send
- Background threads emitting events: ble-state-changed, gamepad-direction, gamepad-connected, gamepad-disconnected

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

### Active

- [ ] Flatpak bundle build target replaces AppImage in CI
- [ ] Flatpak manifest with BLE (`org.bluez`) and gamepad/evdev finish-args
- [ ] Sideload install + "Add as Non-Steam Game" docs for Steam Deck Gaming Mode
- [ ] Auto-update workflow (`flatpak update`) documented or scripted

### Validated (v2.0)

- ✓ Build and test on SteamOS target — Docker cross-compile via tauri-action — Phase 10
- ✓ Rust integration tests mocking btleplug/gilrs for event pipeline validation — Phase 10

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

- Target platform: Steam Deck (SteamOS Linux) running Tauri v2 desktop app
- Robot: Keyestudio Mini Tank Robot V3 with BT24 Bluetooth module (service UUID: 0000ffe0-0000-1000-8000-00805f9b34fb, characteristic UUID: 0000ffe1-0000-1000-8000-00805f9b34fb)
- Arduino firmware is FIXED and accepts: F, B, L, R, S, and optional motor speed commands
- Web Bluetooth API (navigator.bluetooth) does NOT work in Tauri's WebKitGTK on Linux/SteamOS
- Steam Input intercepts built-in gamepad before WebView gets it via navigator.getGamepads()
- Replace broken browser APIs with native Rust: btleplug (BLE) + gilrs (gamepad)
- Low latency is critical for responsive robot control
- Monorepo structure preserved: src-tauri lives inside apps/frontend/

## Constraints

- **Tech Stack**: Tauri v2 + React + Vite + TypeScript frontend, Rust (edition 2021) backend with btleplug + gilrs
- **Platform**: Steam Deck (SteamOS Linux) — Tauri AppImage target, no Windows/macOS builds
- **Robot Firmware**: Cannot modify Arduino code — must work with existing BT24 UART serial protocol (F, B, L, R, S commands)
- **Bluetooth**: BT24 device — btleplug crate, service UUID 0000ffe0, characteristic UUID 0000ffe1, device name filter "BT24"
- **Gamepad**: gilrs crate, deadzone 0.15, prefer Steam Deck controller (id contains "Steam"), same axis logic as current use-gamepad.ts
- **Monorepo**: pnpm workspaces mandatory — src-tauri lives inside apps/frontend/
- **Hook Interfaces**: use-bluetooth.ts and use-gamepad.ts must keep same return shape — app.tsx, control-pad.tsx, status-bar.tsx must be unchanged
- **No new UI components** — only infrastructure changes

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
| Switch from AppImage to Flatpak | Better SteamOS integration, sandboxed permissions, easier auto-update on read-only filesystem | Pending v2.1 |
| Sideload-only distribution | No Flathub overhead, single-user device, faster iteration | Pending v2.1 |

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
*Last updated: 2026-05-09 — start v2.1 Flatpak Packaging milestone*

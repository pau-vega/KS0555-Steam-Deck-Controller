# Steam Deck Robot Controller

## What This Is

A minimal monorepo application that connects a Steam Deck's gamepad to a Bluetooth Arduino robot (DX-BT24 module). Provides a React UI with connection status and manual control buttons, plus real-time gamepad-to-robot command mapping via WebSocket.

## Core Value

Control a real robot from Steam Deck gamepad input with low latency — commands must reach the robot reliably and quickly.

## Current Milestone: v1.1 TypeScript Migration

**Goal:** Remove leftover JS files, convert remaining JS packages to TypeScript, and enforce TypeScript best practices (no `any`) across the entire codebase.

**Target features:**
- Delete 12 leftover `.js` files in frontend (superseded by `.ts`/`.tsx`)
- Convert `packages/eslint-config/src/node.js` and `react.js` to TypeScript
- Eliminate all `any` types from test and source files
- Apply TypeScript best practices: explicit return types, `import type`, discriminated unions, `interface extends`

## Requirements

### Validated

- ✓ Monorepo structure with pnpm workspaces (apps/frontend, apps/backend) — Phase 1
- ✓ Backend WebSocket server accepts frontend connections — Phase 2
- ✓ Bluetooth serial bridge (DX-BT24 via serialport) — Phase 2
- ✓ React UI with connection status and manual control buttons — Phase 3
- ✓ Gamepad API integration with deadzone and direction-change guard — Phase 3
- ✓ WebSocket auto-reconnect — Phase 3

### Active

- [ ] TypeScript migration: delete leftover JS files from frontend
- [ ] TypeScript migration: convert eslint-config package to TypeScript
- [ ] TypeScript quality: eliminate all `any` types across codebase
- [ ] TypeScript quality: explicit return types on all top-level non-hook/non-component functions
- [ ] TypeScript quality: `import type` for all type-only imports

### Out of Scope

- Motor speed control (u<number>#, v<number>#) — deferred, not needed for MVP
- Tauri/Rust/Electron — Steam Deck Desktop Mode is the target
- Complex backend frameworks — minimal Node.js only
- Flatpak packaging — run from source for MVP
- Production-grade authentication — single-user local device

## Context

- Target platform: Steam Deck Desktop Mode (Linux x86_64)
- Robot: Keyestudio Mini Tank Robot V3 with DX-BT24 Bluetooth module
- Arduino firmware is FIXED and accepts: F, B, L, R, S, and optional motor speed commands
- Bluetooth serial operates in UART mode
- Low latency is important for responsive robot control
- This is an MVP — simplicity over architecture perfection

## Constraints

- **Tech Stack**: React + Vite + TypeScript frontend, minimal Node.js backend — user specified, keep it simple
- **Platform**: Steam Deck Desktop Mode first — no native packaging required
- **Robot Firmware**: Cannot modify Arduino code — must work with existing serial protocol
- **Bluetooth**: DX-BT24 module — standard UART serial over Bluetooth
- **Monorepo**: pnpm workspaces mandatory — user requirement

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| WebSocket for frontend↔backend | Low latency, bidirectional, simple | — Pending |
| `serialport` library for Bluetooth | Standard Node.js serial library, well-maintained | — Pending |
| Gamepad API via browser | Steam Deck Desktop Mode runs Chromium — native support | — Pending |
| No shared package yet | Keep monorepo minimal, add if duplication emerges | — Pending |

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
*Last updated: 2026-05-05 after milestone v1.1 start*

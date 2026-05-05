# Requirements: Steam Deck Robot Controller

**Defined:** 2026-05-05
**Core Value:** Control a real robot from Steam Deck gamepad input with low latency — commands must reach the robot reliably and quickly.

## v1.0 Requirements (Completed)

All requirements from initial milestone shipped across Phases 1–3.

- ✓ **MONO-01–04**: pnpm monorepo with frontend + backend, TypeScript, dev scripts — Phase 1
- ✓ **BACK-01–06**: WebSocket server, Bluetooth serial bridge, auto-reconnect, command logging — Phase 2
- ✓ **FRONT-01–08**: React UI, manual controls, gamepad input, deadzone, direction-change guard, auto-reconnect — Phase 3
- ✓ **SAFE-01–02**: Stop on gamepad disconnect, stop on WebSocket disconnect — Phases 2–3

## v1.1 Requirements

### JS Cleanup

- [x] **CLEAN-01**: All leftover `.js` files in `apps/frontend/src/` deleted — 13 files superseded by `.ts`/`.tsx` equivalents
- [ ] **CLEAN-02**: `packages/eslint-config/src/node.js` converted to TypeScript ESM module
- [ ] **CLEAN-03**: `packages/eslint-config/src/react.js` converted to TypeScript ESM module
- [ ] **CLEAN-04**: All consuming apps continue importing eslint-config without errors after conversion

### TypeScript Quality

- [ ] **TS-01**: Zero `any` types remain across all `.ts`/`.tsx` files in the monorepo
- [ ] **TS-02**: All top-level non-hook/non-component functions have explicit return types
- [ ] **TS-03**: All type-only imports use `import type` syntax throughout the codebase

### Validation Gates

- [ ] **VAL-01**: `pnpm build` completes with zero errors across all packages
- [ ] **VAL-02**: `pnpm typecheck` (tsc --noEmit) passes with zero errors across all packages
- [ ] **VAL-03**: `pnpm lint` passes with zero errors across all packages
- [ ] **VAL-04**: TypeScript rules agent (ts-reviewer) runs and passes at end of each phase

## v2 Requirements

### Motor Speed Control

- **MOTOR-01**: UI sliders for left/right motor speed
- **MOTOR-02**: Send `u<number>#` and `v<number>#` commands

### Connection Management

- **CONN-01**: Bluetooth device discovery and pairing from UI
- **CONN-02**: Connection history and diagnostics
- **CONN-03**: Configurable WebSocket server port

### Customization

- **CUST-01**: Customizable gamepad button/axis mapping
- **CUST-02**: Multiple robot profiles
- **CUST-03**: Adjustable deadzone threshold

## Out of Scope

| Feature | Reason |
|---------|--------|
| Authentication | Single-user local device, no security needed |
| Mobile app | Steam Deck Desktop Mode only |
| Cloud connectivity | Local control only |
| Video feed | Adds complexity, not core to control |
| Autonomous/path planning | Manual control only |
| Tauri/Electron/Rust | Browser is sufficient |
| Flatpak packaging | Run from source |
| ESLint rule additions | Only convert existing rules to TypeScript — no new lint rules |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MONO-01 | Phase 1 | Done |
| MONO-02 | Phase 1 | Done |
| MONO-03 | Phase 1 | Done |
| MONO-04 | Phase 1 | Done |
| BACK-01 | Phase 2 | Done |
| BACK-02 | Phase 2 | Done |
| BACK-03 | Phase 2 | Done |
| BACK-04 | Phase 2 | Done |
| BACK-05 | Phase 2 | Done |
| BACK-06 | Phase 2 | Done |
| SAFE-01 | Phase 2 | Done |
| SAFE-02 | Phase 3 | Done |
| FRONT-01 | Phase 3 | Done |
| FRONT-02 | Phase 3 | Done |
| FRONT-03 | Phase 3 | Done |
| FRONT-04 | Phase 3 | Done |
| FRONT-05 | Phase 3 | Done |
| FRONT-06 | Phase 3 | Done |
| FRONT-07 | Phase 3 | Done |
| FRONT-08 | Phase 3 | Done |
| CLEAN-01 | Phase 4 | Done |
| TS-01 | Phase 4 | Pending |
| TS-02 | Phase 4 | Pending |
| TS-03 | Phase 4 | Pending |
| VAL-01 | Phase 4 | Pending |
| VAL-02 | Phase 4 | Pending |
| VAL-03 | Phase 4 | Pending |
| VAL-04 | Phase 4 | Pending |
| CLEAN-02 | Phase 5 | Pending |
| CLEAN-03 | Phase 5 | Pending |
| CLEAN-04 | Phase 5 | Pending |

**Coverage:**
- v1.1 requirements: 11 total
- Mapped to phases: 11/11 ✓
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-05*
*Last updated: 2026-05-05 after milestone v1.1 roadmap created*

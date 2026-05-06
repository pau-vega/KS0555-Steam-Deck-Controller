# Roadmap: Steam Deck Robot Controller — Milestone v2.0 Tauri Migration

**Milestone:** v2.0 Tauri Migration
**Goal:** Migrate apps/frontend from browser-based React+Vite to a Tauri v2 desktop app, replacing broken Web Bluetooth and Gamepad APIs with native Rust alternatives.
**Granularity:** Coarse (5 phases)

---

## Phases

- [x] **Phase 6: Tauri Shell Setup** - Initialize Tauri v2 project with Cargo.toml, tauri.conf.json, Vite integration
- [ ] **Phase 7: BLE Commands with btleplug** - Implement Rust BLE module for BT24 robot communication via Tauri commands
- [ ] **Phase 8: Gamepad Monitoring with gilrs** - Background thread polling gilrs and emitting gamepad events
- [ ] **Phase 9: Hook Rewrites** - Rewrite use-bluetooth.ts and use-gamepad.ts to use Tauri IPC with stable interfaces
- [ ] **Phase 10: Build and Test on SteamOS** - Validate full stack on target platform with production AppImage

---

## Phase Details

### Phase 6: Tauri Shell Setup
**Goal**: Tauri v2 project initialized and configured inside apps/frontend/ with proper IPC setup
**Depends on**: Nothing (first phase of milestone)
**Requirements**: TAUR-01, TAUR-02, TAUR-03, TAUR-04, TAUR-05
**Success Criteria** (what must be TRUE):
  1. `apps/frontend/src-tauri/` directory exists with Cargo.toml, tauri.conf.json, and main.rs entrypoint
  2. `pnpm --filter @ks0555/frontend tauri dev` starts without errors and loads the Vite frontend at http://localhost:5173
  3. tauri.conf.json configured with productName "Robot Controller", identifier "com.ks0555.robotcontroller", devUrl "http://localhost:5173", and AppImage bundle target for Linux
  4. Vite config has Tauri integration: clearScreen false, strictPort true, port 5173, watch ignore for src-tauri/
   5. Cargo.toml includes btleplug@0.12.0, gilrs@0.11.1, serde, and tokio with Rust edition 2021
**Plans**: 2 plans

Plans:
- [x] 06-01-PLAN.md — Initialize Tauri v2 project with Cargo.toml, tauri.conf.json, main.rs, and update frontend package.json with Tauri dependencies
- [x] 06-02-PLAN.md — Configure Vite for Tauri integration (clearScreen, strictPort, port 5173, watch ignore)

### Phase 7: BLE Commands with btleplug
**Goal**: Rust BLE module implemented with Tauri commands for BT24 robot communication
**Depends on**: Phase 6
**Requirements**: BLE-01, BLE-02, BLE-03, BLE-04, BLE-05, BLE-06
**Success Criteria** (what must be TRUE):
  1. `invoke('ble_connect')` scans for BT24 device (filter by name "BT24", service UUID 0000ffe0-0000-1000-8000-00805f9b34fb), connects, and emits "ble-state-changed" with "connecting" then "connected"
  2. `invoke('ble_send', { command: 'F' })` writes command string to BT24 characteristic UUID 0000ffe1-0000-1000-8000-00805f9b34fb using WriteType::WithoutResponse
  3. `invoke('ble_disconnect')` disconnects from BT24 peripheral and emits "ble-state-changed" with "disconnected"
  4. Connected Peripheral stored in Tauri managed state (app.manage()) for access across commands
  5. Unexpected disconnections (CentralEvent::DeviceDisconnected) auto-emit "ble-state-changed" with "disconnected"
**Plans**: 3 plans

Plans:
- [ ] 07-01-PLAN.md — BLE Connection Command with State Management (BLE-01, BLE-04, BLE-05)
- [ ] 07-02-PLAN.md — BLE Send and Disconnect Commands (BLE-02, BLE-03)
- [x] 07-03-PLAN.md — Tauri Permissions and Linux Filtering (BLE-06)

### Phase 8: Gamepad Monitoring with gilrs
**Goal**: Background thread polls gilrs and emits gamepad events to frontend
**Depends on**: Phase 6
**Requirements**: GPAD-01, GPAD-02, GPAD-03, GPAD-04, GPAD-05, GPAD-06
**Success Criteria** (what must be TRUE):
  1. Steam Deck built-in controller detected by checking gamepad.name() contains "Steam", emits "gamepad-connected" event on EventType::Connected
  2. Gamepad direction changes (F/B/L/R/S with 0.15 deadzone on LeftStickX/Y) emit "gamepad-direction" events only when direction actually changes (direction change guard)
  3. Controller disconnect emits "gamepad-disconnected" event on EventType::Disconnected
  4. Background thread uses std::thread::spawn or tauri::async_runtime::spawn with cloned AppHandle (not Window) for cross-thread event emitting
  5. Scan results post-filtered by device name "BT24" on Linux since BlueZ merges discovery filters across all D-Bus clients
**Plans**: TBD

### Phase 9: Hook Rewrites
**Goal**: Frontend hooks rewritten to use Tauri IPC instead of Web APIs while preserving interfaces
**Depends on**: Phase 7, Phase 8
**Requirements**: HOOK-01, HOOK-02, HOOK-03, HOOK-04, HOOK-05
**Success Criteria** (what must be TRUE):
  1. `useBluetooth()` returns identical shape `{ connected, connecting, unsupported, connect, send }` — uses invoke("ble_connect"), invoke("ble_disconnect"), invoke("ble_send"), and listen("ble-state-changed")
  2. `useGamepad()` returns identical shape `{ direction, gamepadConnected }` — uses listen("gamepad-direction"), listen("gamepad-connected"), listen("gamepad-disconnected")
  3. app.tsx, control-pad.tsx, status-bar.tsx work unchanged (verified: git diff shows no changes to these files after migration)
  4. @types/web-bluetooth removed from apps/frontend dependencies (no longer needed after Tauri migration)
**Plans**: TBD

### Phase 10: Build and Test on SteamOS
**Goal**: Full stack validated on target platform with production build
**Depends on**: Phase 9
**Requirements**: VAL-01, VAL-02, VAL-03, VAL-04
**Success Criteria** (what must be TRUE):
  1. `pnpm --filter @ks0555/frontend tauri dev` starts without errors on Linux/SteamOS
  2. Gamepad events flow through Rust gilrs → Tauri event → React without using navigator.getGamepads()
  3. BLE connect/send works through Rust btleplug without using navigator.bluetooth
  4. app.tsx is unchanged after migration (verified with git diff)
**Plans**: TBD

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 6. Tauri Shell Setup | 2/2 | Complete | ✓ |
| 7. BLE Commands with btleplug | 1/3 | In Progress | 07-03 complete |
| 8. Gamepad Monitoring with gilrs | 0/3 | Not started | - |
| 9. Hook Rewrites | 0/2 | Not started | - |
| 10. Build and Test on SteamOS | 0/2 | Not started | - |

---

## Coverage Summary

**Total v2.0 requirements:** 26
**Mapped to phases:** 26 ✓
**Unmapped:** 0 ✓

| Requirement | Phase |
|-------------|-------|
| TAUR-01 | Phase 6 |
| TAUR-02 | Phase 6 |
| TAUR-03 | Phase 6 |
| TAUR-04 | Phase 6 |
| TAUR-05 | Phase 6 |
| BLE-01 | Phase 7 |
| BLE-02 | Phase 7 |
| BLE-03 | Phase 7 |
| BLE-04 | Phase 7 |
| BLE-05 | Phase 7 |
| BLE-06 | Phase 7 |
| GPAD-01 | Phase 8 |
| GPAD-02 | Phase 8 |
| GPAD-03 | Phase 8 |
| GPAD-04 | Phase 8 |
| GPAD-05 | Phase 8 |
| GPAD-06 | Phase 8 |
| HOOK-01 | Phase 9 |
| HOOK-02 | Phase 9 |
| HOOK-03 | Phase 9 |
| HOOK-04 | Phase 9 |
| HOOK-05 | Phase 9 |
| VAL-01 | Phase 10 |
| VAL-02 | Phase 10 |
| VAL-03 | Phase 10 |
| VAL-04 | Phase 10 |

---

*Roadmap created: 2026-05-05*
*Milestone: v2.0 Tauri Migration*

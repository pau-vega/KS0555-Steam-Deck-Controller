# Requirements: Steam Deck Robot Controller

**Defined:** 2026-05-05
**Core Value:** Control a real robot from Steam Deck gamepad input with low latency — commands must reach the robot reliably and quickly through native Bluetooth LE and gamepad APIs.

## v2.0 Requirements (Tauri Migration)

Requirements for Tauri v2 migration milestone. Each maps to roadmap phases.

### Tauri Infrastructure

- [ ] **TAUR-01**: Initialize Tauri v2 project inside apps/frontend/src-tauri/ with Cargo.toml, tauri.conf.json, and main.rs entrypoint
- [ ] **TAUR-02**: Configure tauri.conf.json with productName "Robot Controller", identifier "com.ks0555.robotcontroller", devUrl "http://localhost:5173", and AppImage bundle target for Linux
- [ ] **TAUR-03**: Add @tauri-apps/cli@^2.10.1 and @tauri-apps/api@^2.10.1 to apps/frontend with pnpm, add tauri and tauri:build scripts
- [ ] **TAUR-04**: Configure vite.config.ts with Tauri integration: clearScreen false, strictPort true, port 5173, and watch ignore for src-tauri/
- [ ] **TAUR-05**: Add btleplug@0.12.0, gilrs@0.11.1, serde, and tokio to src-tauri/Cargo.toml with Rust edition 2021

### BLE Communication (btleplug)

- [ ] **BLE-01**: Implement ble_connect Tauri command that scans for BT24 device (filter by name "BT24", service UUID 0000ffe0-0000-1000-8000-00805f9b34fb), connects, and emits "ble-state-changed" with "connecting" then "connected"
- [ ] **BLE-02**: Implement ble_disconnect Tauri command that disconnects from BT24 peripheral and emits "ble-state-changed" with "disconnected"
- [ ] **BLE-03**: Implement ble_send Tauri command that writes command string (F/B/L/R/S) to BT24 characteristic UUID 0000ffe1-0000-1000-8000-00805f9b34fb using WriteType::WithoutResponse
- [ ] **BLE-04**: Store connected Peripheral in Tauri managed state (app.manage()) for access across commands
- [ ] **BLE-05**: Handle btleplug CentralEvent::DeviceDisconnected to auto-emit "ble-state-changed" with "disconnected" when robot disconnects unexpectedly
- [ ] **BLE-06**: Post-filter scan results by device name "BT24" on Linux since BlueZ merges discovery filters across all D-Bus clients

### Gamepad Input (gilrs)

- [ ] **GPAD-01**: Spawn gilrs background thread in Tauri setup() hook that continuously calls next_event() to detect gamepad connect/disconnect and direction changes
- [ ] **GPAD-02**: Emit "gamepad-connected" event when gilrs detects EventType::Connected, and "gamepad-disconnected" when EventType::Disconnected fires
- [ ] **GPAD-03**: Implement direction detection logic in Rust: read Axis::LeftStickX/Y, apply 0.15 deadzone, output "F"/"B"/"L"/"R"/"S" using same logic as getDirectionFromAxes() in current use-gamepad.ts
- [ ] **GPAD-04**: Emit "gamepad-direction" event only when direction actually changes (direction change guard), not on every poll, to prevent Tauri event rate limiting crashes
- [ ] **GPAD-05**: Prefer Steam Deck built-in controller by checking gamepad.name() contains "Steam" (same logic as current use-gamepad.ts index 0 fallback)
- [ ] **GPAD-06**: Use std::thread::spawn or tauri::async_runtime::spawn with cloned AppHandle (not Window) for cross-thread event emitting to avoid Rust Send trait violations

### Frontend Hooks (Stable Interfaces)

- [ ] **HOOK-01**: Rewrite use-bluetooth.ts to use invoke("ble_connect"), invoke("ble_disconnect"), invoke("ble_send", { command }) and listen("ble-state-changed") for state updates
- [ ] **HOOK-02**: Rewrite use-gamepad.ts to use listen("gamepad-direction"), listen("gamepad-connected"), listen("gamepad-disconnected") for direction and connection state
- [ ] **HOOK-03**: Preserve useBluetooth() return shape: { connected, connecting, unsupported, connect, send } — app.tsx, control-pad.tsx, status-bar.tsx must be unchanged
- [ ] **HOOK-04**: Preserve useGamepad() return shape: { direction, gamepadConnected } — app.tsx, control-pad.tsx, status-bar.tsx must be unchanged
- [ ] **HOOK-05**: Remove @types/web-bluetooth from apps/frontend dependencies (no longer needed after Tauri migration)

### Validation

- [ ] **VAL-01**: `pnpm --filter @ks0555/frontend tauri dev` starts without errors on Linux/SteamOS
- [ ] **VAL-02**: Gamepad events flow through Rust gilrs → Tauri event → React without using navigator.getGamepads()
- [ ] **VAL-03**: BLE connect/send works through Rust btleplug without using navigator.bluetooth
- [ ] **VAL-04**: app.tsx is unchanged after migration (verify with git diff)

## v2.1 Requirements (Deferred)

### Enhanced Features

- **MTRS-01**: Motor speed control (u<number>#, v<number># commands) — adds protocol complexity, not needed for MVP
- **MTRS-02**: Multiple robot profiles — save/load BT24 device mappings for different robots
- **RECN-01**: Auto-reconnect on BLE disconnect with exponential backoff — nice-to-have, not core to MVP
- **FLAT-01**: Flatpak packaging — AppImage works for Steam Deck distribution, Flatpak deferred

## Out of Scope

| Feature | Reason |
|---------|--------|
| Windows/macOS builds | Target is Linux/SteamOS only |
| apps/backend (Fastify + WebSocket) | Replaced by Tauri Rust backend, no longer needed |
| Motor speed control (u/v commands) | Deferred to v2.1, not needed for MVP |
| Multiple robot support | Single BT24 device is the use case |
| Flatpak packaging | AppImage sufficient for Steam Deck |
| Production-grade authentication | Single-user local device |
| New UI components | Only infrastructure changes, no UI modifications |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TAUR-01 | Phase 6 | Pending |
| TAUR-02 | Phase 6 | Pending |
| TAUR-03 | Phase 6 | Pending |
| TAUR-04 | Phase 6 | Pending |
| TAUR-05 | Phase 6 | Pending |
| BLE-01 | Phase 7 | Pending |
| BLE-02 | Phase 7 | Pending |
| BLE-03 | Phase 7 | Pending |
| BLE-04 | Phase 7 | Pending |
| BLE-05 | Phase 7 | Pending |
| BLE-06 | Phase 7 | Pending |
| GPAD-01 | Phase 8 | Pending |
| GPAD-02 | Phase 8 | Pending |
| GPAD-03 | Phase 8 | Pending |
| GPAD-04 | Phase 8 | Pending |
| GPAD-05 | Phase 8 | Pending |
| GPAD-06 | Phase 8 | Pending |
| HOOK-01 | Phase 9 | Pending |
| HOOK-02 | Phase 9 | Pending |
| HOOK-03 | Phase 9 | Pending |
| HOOK-04 | Phase 9 | Pending |
| HOOK-05 | Phase 9 | Pending |
| VAL-01 | Phase 10 | Pending |
| VAL-02 | Phase 10 | Pending |
| VAL-03 | Phase 10 | Pending |
| VAL-04 | Phase 10 | Pending |

**Coverage:**
- v2.0 requirements: 26 total
- Mapped to phases: 26 ✓
- Unmapped: 0 ✓
- Phase range: Phase 6 through Phase 10

---
*Requirements defined: 2026-05-05*
*Last updated: 2026-05-05 after Tauri Migration milestone definition*

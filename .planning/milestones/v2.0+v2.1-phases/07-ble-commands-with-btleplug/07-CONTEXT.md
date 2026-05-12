# Phase 7: BLE Commands with btleplug - Context

**Gathered:** 2026-05-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement Rust BLE module in `apps/frontend/src-tauri/src/` with Tauri commands (`ble_connect`, `ble_disconnect`, `ble_send`) for BT24 robot communication. Uses btleplug 0.12.0 for Bluetooth LE. Emits `ble-state-changed` events. Stores connected Peripheral in Tauri managed state. No gamepad logic yet (Phase 8).

</domain>

<decisions>
## Implementation Decisions

### Reconnection Behavior
- **D-01:** Auto-reconnect with backoff when BT24 disconnects unexpectedly (CentralEvent::DeviceDisconnected). Matches backend serial port pattern from Phase 1-5. User just wants it to work.

### Write Reliability
- **D-02:** Use `WriteType::WithoutResponse` for BLE commands (F/B/L/R/S). Low latency, matches current WebSocket approach. If command lost, next gamepad poll resends. Robot keeps running last command anyway.

### Connection Timeout
- **D-03:** `ble_connect` scan timeout: 5 seconds. BT24 should be discovered quickly if powered and in range. Short timeout = responsive UI.

### Error Propagation
- **D-04:** Tauri commands return `Result<(), String>` for immediate errors (scan fail, connect fail, write fail). Frontend gets error via try/catch on `invoke()`. Async errors (unexpected disconnect) via `ble-state-changed` event with "disconnected" state.

### State Management
- **D-05:** Store connected `Peripheral` in Tauri managed state via `app.manage()`. Accessible across commands (from Phase 6 CONTEXT.md D-16).

### the agent's Discretion
- Hook interfaces must stay stable — `useBluetooth()` return shape `{ connected, connecting, unsupported, connect, send }` preserved for Phase 9 rewrite (from PROJECT.md)
- src-tauri lives inside apps/frontend/ (monorepo preserved, from PROJECT.md Constraints)
- Low latency is critical for responsive robot control (from PROJECT.md Context)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Project Context
- `.planning/REQUIREMENTS.md` — BLE-01 through BLE-06 (BLE Communication requirements)
- `.planning/PROJECT.md` § Constraints — Monorepo preserved, src-tauri in apps/frontend/, hook interfaces stable, low latency critical
- `.planning/ROADMAP.md` § Phase 7 — Goal, success criteria, dependencies (Phase 6)
- `.planning/phases/06-tauri-shell-setup/06-CONTEXT.md` — Tauri shell setup decisions (D-09 through D-25 for BLE permissions)

### Code Locations
- `apps/frontend/src-tauri/src/main.rs` — Current minimal entrypoint (Phase 6), will add BLE commands here
- `apps/frontend/src-tauri/Cargo.toml` — Has btleplug 0.12.0, gilrs 0.11.1, tokio with rt-multi-thread (from Phase 6)
- `apps/frontend/src/hooks/use-bluetooth.ts` — Will be rewritten in Phase 9 to use Tauri invoke/listen
- `apps/frontend/src/app.tsx` — Must remain unchanged (from PROJECT.md)
- `apps/frontend/src/types.ts` — Direction type (`"F" | "B" | "L" | "R" | "S"`)

### BT24 Device Specs
- Device name filter: "BT24"
- Service UUID: `0000ffe0-0000-1000-8000-00805f9b34fb`
- Characteristic UUID: `0000ffe1-0000-1000-8000-00805f9b34fb`
- Commands: Single character (F/B/L/R/S), WriteType::WithoutResponse

### Tauri v2 Documentation
- Tauri v2 commands: `invoke()` from `@tauri-apps/api@^2.10.1`
- Tauri v2 events: `listen()` for `ble-state-changed`
- Tauri managed state: `app.manage()` for Peripheral storage
- Permissions: `src-tauri/permissions/` with .toml files (from Phase 6 CONTEXT.md D-24)

### btleplug Crate
- btleplug 0.12.0 with `bluez` feature for Linux/SteamOS (from Phase 6 CONTEXT.md D-11)
- CentralEvent::DeviceDisconnected for auto-reconnect (BLE-05)
- Linux/BlueZ: Post-filter scan results by device name "BT24" (BLE-06, from REQUIREMENTS.md)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/frontend/src-tauri/src/main.rs` — Minimal Tauri setup exists, just needs BLE command handlers added
- `apps/frontend/src-tauri/Cargo.toml` — Already has btleplug, gilrs, tokio, serde dependencies
- `apps/frontend/src/types.ts` — Direction type definition can be reused for command validation

### Established Patterns
- Tauri commands return `Result<(), String>` for error propagation
- Tauri events via `app_handle.emit()` for async state changes
- Managed state via `app.manage()` for cross-command data sharing
- tokio async runtime with `rt-multi-thread` feature (from Phase 6)

### Integration Points
- `apps/frontend/src-tauri/src/main.rs` — Add `#[tauri::command]` functions here: `ble_connect`, `ble_disconnect`, `ble_send`
- `tauri.conf.json` — Verify permissions allow BLE commands and events (from Phase 6 CONTEXT.md D-24)
- Frontend `use-bluetooth.ts` — Phase 9 will call `invoke("ble_connect")` etc.

</code_context>

<specifics>
## Specific Ideas

- Auto-reconnect with backoff when BT24 disconnects (matches backend serial port pattern from Phase 1-5)
- 5-second scan timeout for responsive UI
- `WriteType::WithoutResponse` for low latency (robot keeps running last command anyway)
- Error propagation via `Result<(), String>` return type (frontend try/catch)
- Linux/BlueZ needs post-filter by device name "BT24" since discovery filters merge across D-Bus clients (BLE-06)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 7 scope

</deferred>

---
*Phase: 7-BLE Commands with btleplug*
*Context gathered: 2026-05-06*

# Phase 7: BLE Commands with btleplug - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-06
**Phase:** 7-BLE Commands with btleplug
**Areas discussed:** Reconnection behavior, Write reliability, Connection timeout, Error propagation

---

## Reconnection Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-reconnect (Recommended) | Retry with backoff when DeviceDisconnected event fires. Matches backend serial port pattern. User just wants it to work. | ✓ |
| Notify only | Emit 'ble-state-changed' with 'disconnected' and stop. User must manually reconnect. Simpler, no retry logic. | |
| Agent decides | Let downstream planner choose based on btleplug best practices. | |

**User's choice:** Auto-reconnect (Recommended)
**Notes:** Matches backend serial port pattern from Phase 1-5. User just wants it to work.

---

## Write Reliability

| Option | Description | Selected |
|--------|-------------|----------|
| WithoutResponse (Recommended) | Low latency, matches current WebSocket approach. If command lost, next gamepad poll resends. Robot keeps running last command anyway. | ✓ |
| WithResponse | Wait for ACK from BT24 after each write. Higher reliability but adds latency. May block if robot doesn't ACK. | |
| Agent decides | Let planner choose based on btleplug best practices and latency requirements. | |

**User's choice:** WithoutResponse (Recommended)
**Notes:** Low latency is critical. Robot keeps running last command anyway. Next gamepad poll resends if needed.

---

## Connection Timeout

| Option | Description | Selected |
|--------|-------------|----------|
| 5 seconds (Recommended) | BT24 should be discovered quickly if powered and in range. Short timeout = responsive UI. | ✓ |
| 10 seconds | More tolerant if BT24 slow to advertise. But UI feels sluggish if device not present. | |
| No timeout | Scan until device found or user cancels. Needs cancel mechanism (new Tauri command). | |

**User's choice:** 5 seconds (Recommended)
**Notes:** BT24 should be discovered quickly if powered and in range. Short timeout = responsive UI.

---

## Error Propagation

| Option | Description | Selected |
|--------|-------------|----------|
| invoke Result (Recommended) | Tauri commands return Result<(), String>. Frontend gets error in try/catch. Simple, matches request-response pattern. | ✓ |
| Events + Result | Commands return Result for immediate errors (scan fail). Async errors (unexpected disconnect) via 'ble-state-changed' event with error payload. | |
| Events only | Commands return Ok/Err only. All detailed errors via separate 'ble-error' event. Frontend listens for errors separately. | |

**User's choice:** invoke Result (Recommended)
**Notes:** Simple, matches request-response pattern. Frontend gets error in try/catch on `invoke()`.

---

## The agent's Discretion

- Hook interfaces must stay stable — `useBluetooth()` return shape preserved for Phase 9 rewrite
- src-tauri lives inside apps/frontend/ (monorepo preserved)
- Low latency is critical for responsive robot control

---

## Deferred Ideas

None — discussion stayed within Phase 7 scope

---
phase: 07-ble-commands-with-btleplug
slug: ble-commands-with-btleplug
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-06
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | cargo test (Rust built-in) |
| **Config file** | apps/frontend/src-tauri/Cargo.toml |
| **Quick run command** | `cd apps/frontend/src-tauri && cargo test` |
| **Full suite command** | `cd apps/frontend/src-tauri && cargo test --workspace` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cargo test`
- **After every plan wave:** Run `cargo test --workspace`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | BLE-01 | T-07-01 / T-07-05 | ble_connect scans for BT24, connects, emits 'ble-state-changed' events | integration | `cargo test --test ble_connect_test` | ✅ | ✅ green |
| 07-01-02 | 01 | 1 | BLE-04 | — | Connected Peripheral stored in Tauri managed state (BleState) | unit | `cargo test --test ble_state_test` | ✅ | ✅ green |
| 07-01-03 | 01 | 1 | BLE-05 | — | Unexpected disconnections auto-emit 'ble-state-changed' with 'disconnected' | integration | `cargo test --test ble_event_test` | ✅ | ✅ green |
| 07-02-01 | 02 | 1 | BLE-02 | T-07-11 | ble_disconnect disconnects and emits 'ble-state-changed' with 'disconnected' | integration | `cargo test --test ble_disconnect_test` | ✅ | ✅ green |
| 07-02-02 | 02 | 1 | BLE-03 | T-07-08 | ble_send writes command to BT24 characteristic using WriteType::WithoutResponse | integration | `cargo test --test ble_send_test` | ✅ | ✅ green |
| 07-03-03 | 03 | 1 | BLE-06 | T-07-13 | Post-filter by device name 'BT24' on Linux (BlueZ filter merge) | integration | `cargo test --test ble_linux_filter_test` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/ble_state_test.rs` — unit tests for BleState (BLE-04)
- [x] `tests/ble_connect_test.rs` — integration tests for ble_connect (BLE-01)
- [x] `tests/ble_event_test.rs` — integration tests for disconnect detection (BLE-05)
- [x] `tests/ble_disconnect_test.rs` — integration tests for ble_disconnect (BLE-02)
- [x] `tests/ble_send_test.rs` — integration tests for ble_send (BLE-03)
- [x] `tests/ble_linux_filter_test.rs` — integration tests for Linux post-filter (BLE-06)

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-06

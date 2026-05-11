---
phase: 13
slug: sandbox-permissions-ble-gamepad
status: verified
nyquist_compliant: true
created: 2026-05-10
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for Flatpak sandbox permission layer.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Rust integration tests (`#[test]` with content-scanning) |
| **Config file** | `apps/frontend/src-tauri/Cargo.toml` |
| **Quick run command** | `cargo test -p robot-controller flatpak_sandbox_tests 2>&1` |
| **Full suite command** | `cargo test -p robot-controller 2>&1` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cargo test -p robot-controller flatpak_sandbox_tests`
- **After every plan wave:** Run `cargo test -p robot-controller 2>&1`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|--------|
| 13-01-01 | 01 | 1 | SBX-05 | T-13-02 | D-Bus rewrite gated behind `!in_flatpak()` prevents silent BLE breakage inside Flatpak | content-scan grep | `flatpak_sandbox_tests::test_in_flatpak_function_exists` | ✅ green |
| 13-01-01 | 01 | 1 | SBX-05 | T-13-02 | D-Bus rewrite gated behind `!in_flatpak()` prevents silent BLE breakage inside Flatpak | content-scan grep | `flatpak_sandbox_tests::test_dbus_rewrite_gated_on_not_in_flatpak` | ✅ green |
| 13-01-01 | 01 | 1 | SBX-05 | T-13-02 | WEBKIT set_var stays unconditional (D-03) | content-scan grep | `flatpak_sandbox_tests::test_webkit_set_var_remains_unconditional` | ✅ green |
| 13-01-01 | 01 | 1 | SBX-05 | — | lib.rs structure intact (Builder, handlers, pub fn run) | content-scan grep | `flatpak_sandbox_tests::test_lib_rs_has_no_flatpak_gate_outside_db_block` | ✅ green |
| 13-01-02 | 01 | 1 | SBX-01 | T-13-01, T-13-04 | BLE uses D-Bus system-talk-name, not AF_BLUETOOTH `--device=bluetooth` | content-scan grep | `flatpak_sandbox_tests::test_manifest_has_ble_finish_args` | ✅ green |
| 13-01-02 | 01 | 1 | SBX-02 | T-13-01 | Gamepad uses `--device=input` (least privilege), `--device=all` documented as comment only | content-scan grep | `flatpak_sandbox_tests::test_manifest_has_gamepad_finish_args` | ✅ green |
| 13-01-02 | 01 | 1 | SBX-03 | — | Display finish-args intact (wayland, fallback-x11, ipc, dri) | content-scan grep | `flatpak_sandbox_tests::test_manifest_has_display_finish_args_intact` | ✅ green |
| 13-01-02 | 01 | 1 | SBX-04 | — | WEBKIT env var intact in manifest | content-scan grep | `flatpak_sandbox_tests::test_manifest_has_webkit_env_var_intact` | ✅ green |
| 13-01-02 | 01 | 1 | SBX-06 | T-13-01, T-13-03, T-13-04 | Anti-feature checklist documents 6 forbidden items; active finish-args contain none | content-scan grep | `flatpak_sandbox_tests::test_manifest_has_anti_feature_checklist` | ✅ green |
| 13-01-02 | 01 | 1 | SBX-06 | T-13-01, T-13-03, T-13-04 | Anti-feature checklist documents 6 forbidden items; active finish-args contain none | content-scan grep | `flatpak_sandbox_tests::test_manifest_has_no_anti_features_in_active_finish_args` | ✅ green |
| 13-01-02 | 01 | 1 | SBX-06 | T-13-04 | Active finish-args use `--system-talk-name` not bare `--talk-name` | content-scan grep | `flatpak_sandbox_tests::test_manifest_uses_system_talk_name_not_session` | ✅ green |
| 13-01-02 | 01 | 1 | SBX-03 | — | Manifest modules/build-commands/sources sections unchanged | content-scan grep | `flatpak_sandbox_tests::test_manifest_structure_intact` | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky · ⏳ deferred*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No Wave 0 setup needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `flatpak run` connects to BT24 robot via BLE through sandbox | VAL-06 | Requires real BT24 robot hardware — cannot run in CI | Build Flatpak, install, launch, connect to BT24, verify `ble-state-changed=connected`, check D-Bus proxy with `dbus-monitor --system` |
| `flatpak run` reads gamepad input through sandbox | VAL-07 | Requires real gamepad hardware — cannot run in CI | Connect gamepad, launch Flatpak, verify `/dev/input/event*` visible inside sandbox, move joystick and verify `gamepad-direction` events |

---

## Validation Audit 2026-05-10

| Metric | Count |
|--------|-------|
| Gaps found | 6 |
| Resolved | 6 |
| Escalated | 0 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-10

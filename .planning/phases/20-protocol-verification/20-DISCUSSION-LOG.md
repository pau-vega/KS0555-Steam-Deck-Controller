# Phase 20: Protocol Verification - Discussion Log

**Date:** 2026-05-13
**Mode:** Interactive (default)

## Areas Discussed

### 1. Test Methodology
**Question:** How do you want to run the protocol tests?
**Options:** Tauri dev mode, Standalone Rust test binary, External BLE tool
**Selection:** Tauri dev mode

**Question:** How should speed commands be triggered during testing?
**Options:** Temporary test component, Tauri CLI commands only, Modify ControlPad (NOT ALLOWED)
**Selection:** Temporary test component

**Question:** How should speed commands reach the BLE characteristic?
**Options:** Relax ble_send validation, New ble_send_raw command, Three separate ble_send calls
**Selection:** Relax ble_send validation

**Question:** What command sequence should the test component send?
**Options:** Speed first then direction, Direction first then speed, Single batched write
**Selection:** Speed first then direction

### 2. Speed Value Mapping
**Question:** What value range should `u<val>#` use?
**Options:** 0–255, 0–100, Empirical — test both
**Selection:** 0–255

**Question:** How to determine minimum speed?
**Options:** Find empirically, Start at ~50, Skip for now
**Selection:** Find empirically

**Question:** How many speed values to test?
**Options:** 5 values, 3 values, Full sweep
**Selection:** 5 values (0, 64, 128, 192, 255)

### 3. Verification Scope
**Question:** What's the minimum verification needed to proceed?
**Options:** Speed variation works, Independent motor control, Full protocol matrix
**Selection:** Speed variation works

**Question:** How to confirm speed actually varies?
**Options:** Visual comparison, Timed distance test, Start visual adjust
**Selection:** Visual comparison

**Question:** Beyond speed variation, what else should we verify?
**Options:** Stop after speed, Speed change before direction, Both, Minimum only
**Selection:** Stop after speed

**Question:** Should we also verify gamepad trigger axis values?
**Options:** Log trigger axes, Skip — BLE only, If BLE passes
**Selection:** Log trigger axes

### 4. Documentation + Go/No-Go
**Question:** Where and how to document the protocol verification results?
**Options:** VERIFICATION.md, Update CONTEXT.md, Both files
**Selection:** VERIFICATION.md

**Question:** What specific conditions determine proceed vs fall back?
**Options:** Both conditions, Speed variation only, 3+ distinguishable speeds
**Selection:** Both conditions (speed variation AND stop works)

**Question:** How to express confidence in the findings?
**Options:** Binary pass/fail, Confidence levels, Pass/fail + notes
**Selection:** Binary pass/fail

**Question:** If speed commands don't work, what's the fallback?
**Options:** Skip analog entirely, Research alternatives, Decide later
**Selection:** Skip analog entirely

## Deferred Ideas

None

---

*Phase: 20-Protocol Verification*
*Discussion log: 2026-05-13*

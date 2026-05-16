---
status: complete
phase: 20-protocol-domain
source: [20-01-SUMMARY.md, 20-02-SUMMARY.md, 20-03-SUMMARY.md, 20-04-SUMMARY.md]
started: 2026-05-15T16:56:57Z
updated: 2026-05-16T00:00:00Z
regression_complete: 2026-05-16
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. App launches cleanly
expected: Run `pnpm dev`. Vite serves at :5173, Rust shell compiles, Tauri window opens with the Robot Controller UI (title, StatusBar, Connect button, ControlPad). No panic on Rust crate load, no red errors in WebView console.
result: pass

### 2. Rust unit tests green
expected: Run `cargo test --manifest-path apps/frontend/src-tauri/Cargo.toml`. All test binaries pass, including 44 in `domain::direction::tests` and 18 in `ble::tests`. Reported total ≥ 123 tests, 0 failed.
result: pass

### 3. BLE connect button still works
expected: With BT24 module powered nearby, click "Connect Bluetooth". StatusBar transitions disconnected → connecting → connected. No error string under the button. The button disappears once connected.
result: pass

### 4. On-screen ControlPad drives robot (regression after 20-04)
expected: With BLE connected, click each ControlPad button. Robot drives in the corresponding direction. Click "S" → robot stops. "Last command: X" updates on screen. Previously failed (bare-char payload swallowed by validator); plan 20-04 wired encodeCommand into useBluetooth.send and surfaces invoke rejections via bleError.
result: pass
regression_verified: 2026-05-16
prior_result: issue
prior_reported: "the robot do not respond to any of the inputs"
prior_severity: blocker

### 5. Gamepad drives robot via triggers/stick (regression after 20-04)
expected: With BLE + gamepad connected, push stick forward / back / left / right and press R2/L2. Robot drives in each direction. Release/center → robot stops. "Current direction" still updates. Previously failed because gilrs_adapter still emits bare Direction char (Phase 21 owns full adapter rewrite); 20-04's FE encoder normalises the bare char into a valid wire payload as a stopgap.
result: pass
regression_verified: 2026-05-16
prior_result: issue
prior_reported: "The indicator on the screen is showing the correct inputs, but the robot does not move"
prior_severity: blocker

### 6. Invalid payload error stays scrubbed
expected: From the Tauri WebView devtools console, run `await window.__TAURI__.core.invoke("ble_send", { command: "X" })`. Promise rejects with an error string that ONLY mentions the rejected payload (quoted) and the expected format ('<dir><pwm>\\n' or 'S\\n'). No MAC, UUID, file path, or BleState internals appear in the message.
result: skipped
reason: "`window.__TAURI__.core` undefined in dev (global Tauri not exposed by default in v2). Coverage already exists via 18 Rust unit tests in ble::tests (T-20-14 reject branches assert scrubbed error string)."

## Summary

total: 6
passed: 5
issues: 0
pending: 0
skipped: 1
blocked: 0
regression: 2  # Tests 4 + 5 verified on hardware 2026-05-16 after plan 20-04 closure

## Gaps

- truth: "On-screen ControlPad button click drives the robot in the corresponding direction"
  status: failed
  reason: "User reported: the robot do not respond to any of the inputs"
  severity: blocker
  test: 4
  root_cause: "Plan 20-03 tightened ble_send to require wire format `^[FBLR]\\d{2,3}\\n$|^S\\n$`, but FE producers were not migrated. ControlPad → App.sendCommand → useBluetooth.send passes single-char Direction (`F`/`B`/`L`/`R`/`S`) to `invoke(\"ble_send\", { command: data })`. Validator rejects, `state.port().write` never reached. Rejection silently swallowed by `void invoke(...)` at use-bluetooth.ts:58 (no `.catch`, no `setError`). `setLastCommand(cmd)` runs unconditionally so UI looks healthy."
  artifacts:
    - path: "apps/frontend/src/hooks/use-bluetooth.ts"
      issue: "send() emits single-char payload and uses `void invoke(...)` — rejection swallowed silently (line 56-59)"
    - path: "apps/frontend/src/app.tsx"
      issue: "sendCommand(cmd) forwards bare Direction char to send(); setLastCommand runs even on BLE failure (line 16-22)"
    - path: "apps/frontend/src/components/control-pad.tsx"
      issue: "BUTTONS values are bare Direction chars, passed through applyDirectionInversion unchanged (line 15-19, 82)"
    - path: "apps/frontend/src-tauri/src/ble/mod.rs"
      issue: "Validator (working as designed) rejects legacy single-char payloads at line 15-16, 67-74"
  missing:
    - "FE-side `encodeCommand(direction: Direction): string` helper that maps `S` → `\"S\\n\"` and `F|B|L|R` → `\"{dir}{pwm}\\n\"` (constant default PWM like 150 until Phase 21 wires analog speed)"
    - "Wire encodeCommand into useBluetooth.send (or App.sendCommand) so payloads emitted to ble_send match the new wire format"
    - "Stop swallowing the invoke rejection in use-bluetooth.ts — chain `.catch` that surfaces the error via setError, mirroring the connect path"
  debug_session: .planning/debug/controlpad-robot-no-response.md

- truth: "Gamepad triggers/stick drive the robot via BLE"
  status: failed
  reason: "User reported: The indicator on the screen is showing the correct inputs, but the robot does not move"
  severity: blocker
  test: 5
  root_cause: "Shared root cause with Test 4 plus a Rust-side producer gap. gilrs_adapter.emit_direction (gilrs_adapter.rs:45-50) still emits `{ direction: direction.as_char() }` — a single ASCII char — using legacy compute_combined/compute_trigger. useGamepad listener writes the char to state, App effect calls sendCommand which calls send(direction). ble_send validator rejects, BLE write never happens. UI `Current direction` updates because it's driven by the `gamepad-direction` event, not by the BLE write outcome — so user sees correct on-screen state while the robot stays still. Phase 20 deliberately deferred the adapter rewrite to Phase 21 (per 20-03-SUMMARY.md:166-178, 188-192), which created the gap between phases."
  artifacts:
    - path: "apps/frontend/src-tauri/src/adapters/gilrs_adapter.rs"
      issue: "emit_direction emits bare Direction::as_char(); still calls legacy compute_combined (line 127, 150) and compute_trigger (line 63) instead of the Phase-20 Command-returning variants (line 45-50)"
    - path: "apps/frontend/src/hooks/use-gamepad.ts"
      issue: "Listens to gamepad-direction with payload typed `{ direction: Direction }` — bare char (line 29-33). Sets FE direction state which then feeds sendCommand, also bare char."
    - path: "apps/frontend/src/hooks/use-bluetooth.ts"
      issue: "Same fire-and-forget swallowing as Test 4 (line 56-59) — failure invisible to user"
    - path: "apps/frontend/src-tauri/src/domain/direction.rs"
      issue: "Command::Display already produces correct wire format (`F138\\n`, `S\\n`) at line 48-55; compute_stick_command (line 136-165) and compute_trigger_command (line 272-312) are present but unused by the adapter"
  missing:
    - "Rewire gilrs_adapter to compute Command via compute_stick_command / compute_trigger_command and emit its Display form as the gamepad-direction payload (or via a new event), so FE passes the wire string through verbatim to ble_send"
    - "OR (minimal alternative) keep gilrs_adapter emitting Direction and have App.sendCommand encode via encodeCommand before invoking ble_send — defers analog speed to Phase 21 but unblocks UAT today"
    - "Defense-in-depth: surface ble_send rejections in use-bluetooth.ts via setError so silent BLE failures stop masquerading as hardware issues"
  debug_session: .planning/debug/gamepad-robot-no-response.md

## Closure Attempt

plan: 20-04-fe-wire-encoder-PLAN.md
date: 2026-05-15
rationale: |
  FE-only fix. Encoded Phase-20 wire format in
  apps/frontend/src/lib/encode-command.ts and routed every payload
  through it in useBluetooth.send. Added .catch on the invoke promise
  so future producer/validator regressions surface in the UI's
  bleError state instead of being silently swallowed.

  gilrs_adapter.rs is unchanged — Phase 21 still owns the adapter
  rewrite to emit analog (direction, pwm) payloads. Until then this
  FE shim uses DEFAULT_PWM = 150 (firmware default per PROJECT.md
  Context section, within validator accept range 80..=255).

verification_done:
  - "just check (pnpm lint + typecheck + test) exits 0"
  - "cargo test --manifest-path apps/frontend/src-tauri/Cargo.toml exits 0; ble::tests count unchanged at 18"
  - "pnpm exec prettier --check . from repo root exits 0"

regression_required:
  scope: "User must re-run UAT Tests 4 and 5 with real hardware (BT24 + Steam Deck or gamepad)."
  steps:
    - "pnpm dev (or the installed Flatpak on the Deck)."
    - "Click Connect Bluetooth; wait for StatusBar to reach connected."
    - "Test 4: Click each ControlPad button (L, S, R; plus stick-driven F/B if applicable). Robot must drive in each direction; clicking S must stop it."
    - "Test 5: With a gamepad connected, push the left stick forward/backward/left/right and press R2/L2. Robot must drive. Release to center; robot must stop."
    - "Bonus T-20-16 visibility check: in the Tauri WebView devtools console, run window.__TAURI_INTERNALS__.invoke('ble_send', { command: 'X' }) once. The on-screen bleError area below the Connect button must now display the rejection message (it did NOT before this plan)."

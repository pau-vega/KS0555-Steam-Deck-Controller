---
status: diagnosed
trigger: "Gamepad triggers/stick drive the robot via BLE — UI updates correctly but robot does not move (Phase 20 UAT Test 5)"
created: 2026-05-15T00:00:00Z
updated: 2026-05-15T00:00:00Z
---

## Current Focus

reasoning_checkpoint:
  hypothesis: "gilrs_adapter emits legacy single-char 'F'/'B'/'L'/'R'/'S' via 'gamepad-direction' event payload `{ direction: dir.as_char() }`. useGamepad listener stores the bare char in `direction` state. app.tsx useEffect calls `send(direction)`, which `invoke('ble_send', { command: 'F' })`. Phase 20 plan 20-03 replaced the legacy `command.len() != 1` check with regex `^[FBLR]\\d{2,3}\\n$|^S\\n$`; bare 'F'/'B'/'L'/'R' fail the regex (no digits, no newline), the invoke promise rejects with 'Invalid BLE payload \"F\": expected ...', use-bluetooth.ts:58 fires `void invoke(...)` with no await/catch so the rejection is swallowed. UI still updates because the rejection is on the BLE write path, not the event-listen path."
  confirming_evidence:
    - "apps/frontend/src-tauri/src/adapters/gilrs_adapter.rs:45-50 — emit_direction calls `sink.emit('gamepad-direction', json!({ \"direction\": direction.as_char() }))`."
    - "apps/frontend/src-tauri/src/domain/direction.rs:20-28 — Direction::as_char() returns &'static str of bare 'F'/'B'/'L'/'R'/'S' (no pwm digits, no newline)."
    - "apps/frontend/src-tauri/src/adapters/gilrs_adapter.rs:127, :150, :63 — adapter uses compute_combined / compute_trigger (legacy Direction-only fns), not compute_stick_command / compute_trigger_command (the new Command-returning fns added in Phase 20 plan 20-01/20-02)."
    - "apps/frontend/src/hooks/use-gamepad.ts:29-33 — listener receives `event.payload.direction` typed as `Direction` ('F'|'B'|'L'|'R'|'S'), pipes it through applyDirectionInversion, calls setDirection(effective)."
    - "apps/frontend/src/app.tsx:14, :24-29 — useEffect compares `direction !== prevDirectionRef.current`, calls `sendCommand(direction)` -> `send(direction)`."
    - "apps/frontend/src/hooks/use-bluetooth.ts:56-59 — `send` callback calls `void invoke('ble_send', { command: data })`. The `void` prefix discards the promise; no `.then`, `.catch`, `await`, or try/catch wraps it. Rejection is silently dropped."
    - "apps/frontend/src-tauri/src/ble/mod.rs:15-16 — BLE_COMMAND_RE = `^[FBLR]\\d{2,3}\\n$|^S\\n$`. 'F' (bare) matches neither alternation: first branch needs `\\d{2,3}\\n`, second branch needs literal 'S'."
    - "apps/frontend/src-tauri/src/ble/mod.rs:67-74 — ble_send body: `validate_ble_payload(&command)?;` returns Err on failure; the IPC rejection propagates to the JS invoke promise."
    - "apps/frontend/src-tauri/src/ble/mod.rs:158-167 — unit test `rejects_legacy_single_char` already proves 'F', 'B', 'L', 'R' fail validation. Just ran `cargo test ble::tests` — 18/18 pass including this one."
    - "Phase 20 plan 20-03 summary confirms the gap: `gilrs_adapter.rs` is on the no-touch list (lines 166-178 of 20-03-SUMMARY.md). The validator was relaxed but the producer was deliberately not rewired in this phase — that work is queued for Phase 21 (per 20-03-SUMMARY.md lines 188-192)."
  falsification_test: "Run `validate_ble_payload(\"F\")` (or any bare single char from `Direction::as_char()` except 'S') and confirm it returns Err. Then check that use-bluetooth.ts:56-59 has no error handling around the invoke call. If validate_ble_payload accepts bare 'F', or if use-bluetooth.ts has a real `.catch` that surfaces the error, the hypothesis is wrong. Both checks performed: validator rejects (unit test rejects_legacy_single_char passes), use-bluetooth.ts confirmed fire-and-forget at line 58."
  fix_rationale: "(diagnose-only — no fix applied) Two changes are needed but only one fully closes the gap: (a) rewire gilrs_adapter.rs to emit wire-format strings using compute_trigger_command / compute_stick_command and Command::Display (which produces `F138\\n`, `S\\n`, etc.); (b) propagate invoke rejection in use-bluetooth.ts:56-59 so future contract regressions surface visibly. (a) is the root cause fix; (b) is defense-in-depth that would have made this UAT failure self-reporting."
  blind_spots: "1. Test 4 (ControlPad) was also reported failing with the same symptom class — that path is `<button>` -> `ControlPad.onCommand` -> `App.sendCommand('F')` -> `send('F')` -> `invoke('ble_send', { command: 'F' })`. The bare-char payload problem applies there too, so this root cause likely covers Test 4 as well. Not independently verified here; called out in the parent prompt. 2. The Arduino's actual UART grammar wasn't re-checked — but plan 20-03 already justifies the regex against the firmware grammar `<dir><pwm>\\n`/`S\\n`, and Test 5's symptom (robot does not move) is consistent with BLE writes never occurring rather than the firmware silently ignoring valid frames. 3. I did not exercise the running app to capture the actual rejection error text in the WebView console — but the rejection is mechanically certain given the regex contents and the invoke-without-catch."

hypothesis: confirmed (see reasoning_checkpoint above)
test: code trace + cargo test ble::tests (18/18 pass)
expecting: file:line evidence at each link (collected)
next_action: return_diagnosis (goal: find_root_cause_only — do NOT fix)

## Symptoms

expected: Gamepad triggers/stick drive the robot via BLE (Phase 20 UAT Test 5)
actual: "The indicator on the screen is showing the correct inputs, but the robot does not move" (user verbatim)
errors: None reported. UI direction indicator updates correctly, so FE event-listen path is fine; only BLE write fails.
reproduction: With BLE BT24 + gamepad connected, press R2/L2 or push stick -> on-screen "Current direction" updates, robot stays still.
started: Phase 20 UAT — Test 5. Same symptom class as Test 4 (ControlPad).

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-05-15T00:01:00Z
  checked: apps/frontend/src-tauri/src/adapters/gilrs_adapter.rs:45-50 (emit_direction)
  found: "emit_direction emits `gamepad-direction` with payload `{ \"direction\": direction.as_char() }` — i.e., a bare single-char string."
  implication: "The producer of the FE event sends legacy 1-byte values; no pwm digits, no newline."

- timestamp: 2026-05-15T00:01:00Z
  checked: apps/frontend/src-tauri/src/domain/direction.rs:20-28 (Direction::as_char)
  found: "Returns `&'static str` of exactly 'F'|'B'|'L'|'R'|'S' (one byte each)."
  implication: "Confirms gilrs_adapter sends exactly one of those five bare chars over IPC."

- timestamp: 2026-05-15T00:01:00Z
  checked: apps/frontend/src-tauri/src/adapters/gilrs_adapter.rs:127, :150, :63
  found: "Adapter calls `compute_combined` and `compute_trigger` (Direction-only legacy fns). The Phase 20 plan 20-01/20-02 additions `compute_stick_command` and `compute_trigger_command` (which return `Command` = `Drive { dir, pwm } | Stop` and have `Display` producing wire-format `F138\\n`/`S\\n`) are NOT used here."
  implication: "Producer was not migrated to the new analog-aware API in Phase 20."

- timestamp: 2026-05-15T00:01:00Z
  checked: apps/frontend/src/hooks/use-gamepad.ts:29-33
  found: "Listener: `listen<{ direction: Direction }>('gamepad-direction', ...)`, then `setDirection(applyDirectionInversion(event.payload.direction, invertedRef.current))`."
  implication: "FE state `direction` is a bare 'F'|'B'|'L'|'R'|'S'. types.ts:1 confirms Direction = \"F\"|\"B\"|\"L\"|\"R\"|\"S\". UI renders this string verbatim (app.tsx:53) — which is why the on-screen 'Current direction' looks correct even when the BLE write fails."

- timestamp: 2026-05-15T00:01:00Z
  checked: apps/frontend/src/app.tsx:14-29
  found: "useEffect: `if (direction !== prevDirectionRef.current) { sendCommand(direction); prevDirectionRef.current = direction }`. `sendCommand` (line 16-22) calls `send(cmd)` then `setLastCommand(cmd)`."
  implication: "On every direction change, `send` is invoked with the bare char (e.g. 'F'). `setLastCommand` runs unconditionally — so the UI 'Last command' display updates even if `send` fails. That matches the user's observation ('indicator shows correct inputs but robot does not move')."

- timestamp: 2026-05-15T00:01:00Z
  checked: apps/frontend/src/hooks/use-bluetooth.ts:56-59
  found: "`const send = useCallback((data: string) => { if (!isTauri()) return; void invoke('ble_send', { command: data }) }, [])`."
  implication: "FIRE-AND-FORGET. The `void` operator discards the Promise. No `.catch`, no `try/await`. Any rejection from `ble_send` (including the new validate_ble_payload Err) disappears silently. Contrast with `connect` (lines 41-54) which has full try/catch and propagates the error to UI via `setError`."

- timestamp: 2026-05-15T00:01:00Z
  checked: apps/frontend/src-tauri/src/ble/mod.rs:15-16, :20-52, :67-74
  found: "BLE_COMMAND_RE = `^[FBLR]\\d{2,3}\\n$|^S\\n$`. `validate_ble_payload` early-returns Err with message `'Invalid BLE payload {:?}: expected '<dir><pwm>\\n' ...'`. `ble_send` body is `validate_ble_payload(&command)?; state.port().write(command.as_bytes()).await` — Err propagates back to JS as an invoke rejection."
  implication: "Bare 'F'/'B'/'L'/'R' (no digits, no newline) fail the first alternation (needs `\\d{2,3}\\n`) and don't match the second (needs literal 'S\\n'). Bare 'S' also fails (needs trailing \\n). All five values from `Direction::as_char()` are rejected. `state.port().write` is NEVER reached, so no BLE I/O happens — robot stays still."

- timestamp: 2026-05-15T00:01:00Z
  checked: cargo test --manifest-path apps/frontend/src-tauri/Cargo.toml --lib -- ble::tests
  found: "18/18 tests pass. `rejects_legacy_single_char` (mod.rs:158-167) asserts that 'F', 'B', 'L', 'R' all produce Err. `rejects_no_newline` (mod.rs:170-173) asserts 'F138' (without \\n) produces Err."
  implication: "Empirical confirmation that the new validator rejects exactly the payload shape the gilrs_adapter is producing. The Err contract is also verified — the IPC layer will surface it as a promise rejection on the JS side."

- timestamp: 2026-05-15T00:01:00Z
  checked: ".planning/phases/20-protocol-domain/20-03-SUMMARY.md (gilrs_adapter.rs out-of-scope confirmation, lines 166-178 + 188-192)"
  found: "Plan 20-03 explicitly lists `gilrs_adapter.rs`, `gamepad/mod.rs`, `domain/direction.rs` as unchanged vs base. 'Next Phase Readiness' notes: 'Phase 21 (Gamepad Adapter & IPC) is unblocked from the BLE side. When phase 21's `gilrs_adapter.rs` rewrite starts emitting `format!(\"{}{}\\n\", dir.as_char(), pwm)` strings, `ble_send` will validate them without further change.'"
  implication: "The contract mismatch is a known, planned-for gap. Phase 20 relaxed the validator anticipating the Phase 21 producer rewrite. We are between those two phases — the producer has not been rewired yet, so every gamepad-driven write fails validation. Same applies to the ControlPad button path (sends bare 'F') — that explains Test 4 having identical symptoms."

## Resolution

root_cause: |
  Contract mismatch between BLE producer and validator, introduced by Phase 20 plan 20-03 in isolation.

  Phase 20 plan 20-03 (commit d98fc59b) tightened `ble_send` to require wire-format payloads matching `^[FBLR]\d{2,3}\n$|^S\n$` with pwm ∈ 80..=255 (apps/frontend/src-tauri/src/ble/mod.rs:15-52). It also explicitly listed `gilrs_adapter.rs` (and `gamepad/mod.rs`, `domain/direction.rs`) on its no-touch list (20-03-SUMMARY.md:166-178), deferring the producer-side rewrite to Phase 21.

  Result: the producer path that fires on every gamepad axis/button change is

      gilrs_adapter::emit_direction        (gilrs_adapter.rs:45-50)
        → emits `gamepad-direction` with payload `{ direction: Direction::as_char() }` — a BARE 1-char string ("F" | "B" | "L" | "R" | "S")
        → use-gamepad.ts:29-33 sets FE `direction` state to that bare char
        → app.tsx:24-29 useEffect calls `sendCommand(direction)` → `send("F")` on change
        → use-bluetooth.ts:56-59 `send` does `void invoke("ble_send", { command: "F" })` — FIRE-AND-FORGET
        → ble/mod.rs:67-74 `ble_send` calls `validate_ble_payload("F")` → Err (regex rejects: needs F\d{2,3}\n or S\n)
        → IPC returns rejection to JS; the `void invoke(...)` swallows it silently
        → `state.port().write(...)` is never reached; no BLE write hits BT24; robot does not move

  Two contributing bugs stack to produce the user-visible symptom:

  1. PRIMARY: gilrs_adapter still emits the legacy single-char "direction" payload via `Direction::as_char()` while the BLE validator now requires `<dir><pwm>\n` / `S\n` wire-format. Every gamepad-driven `ble_send` invocation is rejected by `validate_ble_payload`.

  2. SECONDARY (masking): `use-bluetooth.ts:58` uses `void invoke(...)` with no `.catch` or `await`/try-catch. The rejection is dropped, so the UI sees no error, the "Current direction" label keeps updating from the FE state, and the failure is invisible from the user's perspective. This is also why Test 5's symptom is "indicator correct, robot does not move" rather than a visible error toast.

  Symptom equivalence with Test 4 (ControlPad): clicking a ControlPad button calls `App.sendCommand("F")` → `send("F")` → same `invoke("ble_send", { command: "F" })` → same regex rejection → same swallowed promise. Both UAT failures share this root cause.

fix: "(none — goal=find_root_cause_only)"
verification: "(none — diagnose-only)"
files_changed: []

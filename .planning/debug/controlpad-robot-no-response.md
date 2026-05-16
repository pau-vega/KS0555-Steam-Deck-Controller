---
status: diagnosed
trigger: "Test 4 (ControlPad) and Test 5 (Gamepad) UAT failures after Phase 20: robot does not respond to any FE-issued direction commands, even though BLE shows connected and the on-screen 'Last command' / 'Current direction' indicators update correctly."
created: 2026-05-15T17:10:00Z
updated: 2026-05-15T17:35:00Z
---

## Current Focus

reasoning_checkpoint:
  hypothesis: "After Phase 20 (plan 20-03), `ble_send` rejects every command sent by the FE because the FE still emits single-character payloads (\"F\", \"B\", \"L\", \"R\", \"S\") but the new Rust validator `validate_ble_payload` requires `^[FBLR]\\d{2,3}\\n$` or `^S\\n$`. The rejection promise is swallowed by `void invoke(...)` in `useBluetooth.send`, so the UI gives no error and the user sees a dead robot."
  confirming_evidence:
    - "apps/frontend/src/components/control-pad.tsx:15-19 — BUTTONS array uses single-char Direction values ('L','S','R'). DirectionButton onClick passes def.command (a single char) unchanged."
    - "apps/frontend/src/components/control-pad.tsx:80-85 — handleCommand calls onCommand(applyDirectionInversion(raw,...)) which preserves single-char shape (see apply-direction-inversion.ts: only swaps F<->B, never appends digits or '\\n')."
    - "apps/frontend/src/app.tsx:16-22 — sendCommand calls send(cmd) where cmd:Direction = 'F'|'B'|'L'|'R'|'S' (single char per types.ts:1)."
    - "apps/frontend/src/hooks/use-bluetooth.ts:56-59 — send forwards data unchanged to invoke('ble_send', { command: data }). No newline, no PWM digits appended."
    - "apps/frontend/src-tauri/src/ble/mod.rs:15-16 — BLE_COMMAND_RE = `^[FBLR]\\d{2,3}\\n$|^S\\n$`. Single-char inputs cannot match."
    - "apps/frontend/src-tauri/src/ble/mod.rs:20-26 — validate_ble_payload returns Err for any non-matching payload."
    - "apps/frontend/src-tauri/src/ble/mod.rs:67-74 — ble_send calls validate_ble_payload(&command)?; before reaching state.port().write — failed payloads never hit BLE."
    - "apps/frontend/src-tauri/src/ble/mod.rs:158-167 — rejects_legacy_single_char test explicitly asserts 'F'|'B'|'L'|'R' are rejected, proving the regression is intentional in the validator and pre-existing FE payloads now lose."
    - "apps/frontend/src/hooks/use-bluetooth.ts:58 — `void invoke(...)` with no .catch and no setError, so the Rust rejection produces only an unhandled promise rejection in devtools (not visible without DevTools open) and never reaches React state."
    - "apps/frontend/src/app.tsx:18-21 — setLastCommand(cmd) runs unconditionally after send(cmd), so the UI 'Last command: X' updates even when BLE write was rejected upstream. This explains the user's perception that the click 'did' something."
    - ".planning/phases/20-protocol-domain/20-03-SUMMARY.md:190-192 — explicitly states 'Phase 22 (Frontend Hooks & UI) is similarly unblocked. useBluetooth.send can shape strings via an encodeCommand helper...' — confirming the FE wrapper is deferred to phase 22, leaving Phase 20 with a deliberate cross-phase breakage."
    - "Gamepad chain (Test 5) — apps/frontend/src-tauri/src/adapters/gilrs_adapter.rs:45-50 emits `{ direction: direction.as_char() }` (single char). use-gamepad.ts:29-33 sets state from event.payload.direction. app.tsx:24-29 effect sends that state via send() → same single-char payload → same rejection. Indicator updates correctly because that's pure FE state, BLE write fails silently — matches user's verbatim 'indicator is showing the correct inputs, but the robot does not move.'"
  falsification_test: "Open Tauri DevTools console while connected to BT24 and click ControlPad 'F'. If hypothesis is correct, the Network/console panel will show an unhandled promise rejection with text matching 'Invalid BLE payload \"F\": expected ...'. Alternatively, temporarily replace `void invoke(...)` with `await invoke(...).catch(e => console.error(e))` in use-bluetooth.ts:58; the error message printed will literally quote the Rust validator error string format. If neither shows the Rust validator error, the hypothesis is wrong."
  fix_rationale: "(Diagnose-only; not applying.) The root cause is a mismatch between Phase-20-updated validator and Phase-22-deferred FE encoder. Two valid directions: (a) ship a minimal FE 'encodeCommand' helper now (e.g., S → 'S\\n', F/B/L/R → '{dir}150\\n') so the FE produces the new wire format before phase 22 lands, which restores robot motion immediately and aligns with REQ-SPD plans; or (b) temporarily widen the validator to also accept single chars until phase 22 ships the proper FE wrapper. Option (a) is cleaner — phase 22 already plans an encodeCommand; this brings it forward minimally."
  blind_spots: "1) Did not run the dev build to confirm the unhandled rejection appears at runtime (logs not captured). 2) Did not verify the user actually had BT24 connected (StatusBar shows 'connected' per Test 3 passing, so this is well-supported but not directly inspected). 3) Did not check whether any other phase committed since 20-03 may have already added an FE-side wrapper — git log shows nothing of the sort, but only a grep, not full diff vs main. 4) Does not eliminate compounding causes (e.g., BLE write itself broken) — but the validator failure short-circuits before `state.port().write`, so even if BLE were also broken it wouldn't reach the write path."

## Symptoms

expected: "On-screen ControlPad button click drives the robot in the corresponding direction. Gamepad triggers/stick drive the robot via BLE."
actual: "Robot does not respond to any inputs (ControlPad clicks). For gamepad: the indicator on the screen shows the correct inputs, but the robot does not move."
errors: "None visible in UI. User did not check Rust stderr or WebView devtools console."
reproduction: "1) `pnpm dev`. 2) Click 'Connect Bluetooth' — StatusBar transitions to connected (Test 3 pass). 3) Click 'F' on ControlPad — robot does not move, 'Last command: F' updates on screen. 4) Same for B/L/R/S. 5) Same failure pattern via R2 trigger / left-stick on connected gamepad."
started: "Discovered during Phase 20 UAT execution, after merging Phase 20 (protocol-domain) into the worktree base (2026-05-15)."

## Eliminated

(none — single hypothesis, traced end-to-end and confirmed by code; no competing hypothesis was needed because evidence is direct)

## Evidence

- timestamp: 2026-05-15T17:15:00Z
  checked: "apps/frontend/src-tauri/src/ble/mod.rs (post-Phase-20)"
  found: "BLE_COMMAND_RE = ^[FBLR]\\d{2,3}\\n$|^S\\n$ at line 15-16. validate_ble_payload at line 20 returns Err for non-match. ble_send at line 67-74 calls validate_ble_payload(&command)?; before write — rejection short-circuits BLE write."
  implication: "Any payload that is not '<F|B|L|R><2-3 digits>\\n' or 'S\\n' is rejected before reaching the BLE adapter."

- timestamp: 2026-05-15T17:17:00Z
  checked: "apps/frontend/src/hooks/use-bluetooth.ts"
  found: "send (line 56-59): `void invoke('ble_send', { command: data })`. No .catch, no setError, no await."
  implication: "Rust rejections produce only an unhandled promise rejection visible in DevTools — not surfaced to React state, not shown in StatusBar/bleError, not logged unless DevTools is open."

- timestamp: 2026-05-15T17:19:00Z
  checked: "apps/frontend/src/components/control-pad.tsx + apps/frontend/src/types.ts + apps/frontend/src/lib/apply-direction-inversion.ts"
  found: "BUTTONS commands are Direction values ('L','S','R' visible plus presumably F/B in elided rows). Direction = 'F'|'B'|'L'|'R'|'S' (single char). applyDirectionInversion only swaps F<->B, never modifies shape. handleCommand passes single-char value to onCommand."
  implication: "ControlPad emits exactly one of {'F','B','L','R','S'} (single-character strings) to App.sendCommand."

- timestamp: 2026-05-15T17:21:00Z
  checked: "apps/frontend/src/app.tsx + apps/frontend/src-tauri/src/adapters/gilrs_adapter.rs"
  found: "sendCommand (app.tsx:16-22) calls send(cmd) where cmd is single-char Direction. The same App.sendCommand is invoked by useEffect when gamepad direction changes (lines 24-29). gilrs_adapter emits `{ direction: direction.as_char() }` (line 45-50) — single char Rust→FE."
  implication: "Both the ControlPad path and the gamepad path funnel through App.sendCommand → useBluetooth.send → invoke('ble_send', { command: <single-char> }). Both will be rejected by the new validator. This explains why Test 4 AND Test 5 both fail in the same way (robot stationary, FE indicators correct)."

- timestamp: 2026-05-15T17:23:00Z
  checked: "apps/frontend/src-tauri/src/ble/mod.rs:158-167 (rejects_legacy_single_char test)"
  found: "Test explicitly verifies validate_ble_payload returns Err for 'F','B','L','R'. (Note: 'S' alone is also rejected because regex requires '^S\\n$'; the test doesn't cover bare 'S' but the regex anchors guarantee it.)"
  implication: "The rejection of legacy single-char payloads is intentional and tested. Phase 20 deliberately broke this wire-format contract on the Rust side."

- timestamp: 2026-05-15T17:25:00Z
  checked: ".planning/phases/20-protocol-domain/20-03-SUMMARY.md (lines 190-192)"
  found: "'Phase 21 (Gamepad Adapter & IPC) is unblocked from the BLE side. When phase 21's gilrs_adapter.rs rewrite starts emitting format!(\"{}{}\\n\", dir.as_char(), pwm) strings, ble_send will validate them...' AND 'Phase 22 (Frontend Hooks & UI) is similarly unblocked. useBluetooth.send can shape strings via an encodeCommand helper...'"
  implication: "Phase 20's own SUMMARY confirms that producers (gilrs_adapter + useBluetooth) are NOT updated in this phase. The wire-format breakage is deliberate; the FE/adapter cutovers are deferred to phases 21 and 22 respectively. This is the gap the UAT exposed."

- timestamp: 2026-05-15T17:27:00Z
  checked: "Cross-test failure pattern — Test 4 (ControlPad) reports 'robot do not respond'; Test 5 (Gamepad) reports 'indicator correct, robot does not move'."
  found: "Both reports are consistent with the validator-rejects-single-char hypothesis. The FE indicator differs (ControlPad has 'Last command' updated by setLastCommand regardless of BLE outcome; gamepad has 'Current direction' updated by useGamepad state from Rust-emitted gamepad-direction event). Both paths converge at use-bluetooth.send."
  implication: "Single root cause explains two UAT failures (Tests 4 and 5). No separate gamepad bug needed."

## Resolution

root_cause: "Phase 20 plan 20-03 tightened `ble_send` to require the new PWM wire format (regex `^[FBLR]\\d{2,3}\\n$|^S\\n$`), but the producers on both the FE click path (use-bluetooth.ts:58 → invoke with single-char `data`) and the gamepad event path (gilrs_adapter.rs:46-49 emits single-char `direction.as_char()` → use-gamepad → app.tsx sendCommand → use-bluetooth.send with single char) were not updated. Every payload sent post-Phase-20 fails `validate_ble_payload`, returns `Err` to the Tauri IPC promise, and is silently dropped because `useBluetooth.send` uses `void invoke(...)` with no `.catch`. The 'Last command' UI updates because `setLastCommand` runs unconditionally; the 'Current direction' indicator updates because it's driven by the gamepad Rust event, not by the BLE write success."
fix: ""
verification: ""
files_changed: []

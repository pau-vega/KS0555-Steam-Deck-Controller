# Phase 20: Protocol Verification - Context

**Gathered:** 2026-05-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Confirm that speed command protocol (`u<val>#`/`v<val>#`) works on physical BT24 robot before any backend work begins. This is a mandatory gating phase — no analog code gets written until we know the robot actually accepts speed commands.

</domain>

<decisions>
## Implementation Decisions

### Test Methodology
- **D-01:** Run tests in Tauri dev mode (`pnpm dev`) — uses the actual BLE stack, realistic environment
- **D-02:** Use a temporary test component mounted as sibling in `main.tsx` to trigger speed commands — same pattern as Phase 23's AnalogDisplay
- **D-03:** Temporarily relax `ble_send` validation (`command.len() != 1` guard) to accept multi-char strings like `u128#` — revert after testing
- **D-04:** Send speed command first (`u128#`), then direction (`F`) — safer, robot won't move at full speed unexpectedly

### Speed Value Mapping
- **D-05:** Use 0–255 range for `u<val>#` — standard 8-bit PWM, most Arduino motor libraries use this
- **D-06:** Test 5 values: 0 (stop), 64 (25%), 128 (50%), 192 (75%), 255 (100%) — good coverage, quick to run
- **D-07:** Find minimum speed empirically — test with values like 20, 30, 40 to find where motors actually spin. Document as MIN_SPEED constant

### Verification Scope
- **D-08:** Core test: speed commands change motor speed (visual confirmation) — `u128#` + `F` should be slower than full-speed `F`
- **D-09:** Stop test: send `S` after speed commands, verify robot stops — confirms speed state doesn't interfere with stop
- **D-10:** Log R2/L2 trigger axis values from Steam Deck gamepad — confirm -1..1 range via gilrs (success criteria #3)

### Documentation + Go/No-Go
- **D-11:** Document results in `.planning/phases/20-protocol-verification/VERIFICATION.md` — structured markdown, machine-readable for downstream agents
- **D-12:** Binary pass/fail for each test — no ambiguity, easy for downstream agents to parse
- **D-13:** Go/no-go criteria: speed commands change motor speed (visual) AND stop command works after speed. If either fails → fall back to digital control (skip analog entirely for v2.2)

### Agent's Discretion
- Test component UI design — agent has flexibility on layout/styling
- Exact test sequence order — agent can optimize based on observed behavior

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### BLE Implementation
- `apps/frontend/src-tauri/src/ble/mod.rs` — Current BLE connection and send logic, `ble_send` validation to relax
- `apps/frontend/src-tauri/src/ble/state.rs` — BLE state management

### Gamepad Implementation
- `apps/frontend/src-tauri/src/gamepad/mod.rs` — Current gamepad monitoring, trigger axis logging to add here

### Frontend Entry
- `apps/frontend/src/main.tsx` — Where test component mounts as sibling (same pattern as Phase 23's AnalogDisplay)

### Project Context
- `.planning/PROJECT.md` — Robot firmware is FIXED (F/B/L/R/S commands only), BT24 service/characteristic UUIDs
- `.planning/REQUIREMENTS.md` — VAL-01 requirement for this phase

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ble_connect()` in `ble/mod.rs` — Existing BLE connection flow, reuse as-is
- `ble_send()` in `ble/mod.rs` — Existing send command, needs validation relaxation for testing
- `BleState` in `ble/state.rs` — State management for BLE peripheral, already handles connection lifecycle

### Established Patterns
- Sibling component mounting in `main.tsx` — Phase 23's AnalogDisplay will use this pattern; test component can follow same approach
- Tauri command pattern (`#[tauri::command]`) — Any new test commands follow this pattern
- Event emission pattern (`app.emit()`) — Used for BLE state changes, gamepad events

### Integration Points
- `ble_send` command — Single point where BLE writes happen, validation relaxation here affects all sends
- `gamepad/mod.rs` AxisChanged event — Where trigger axis logging would be added
- `main.tsx` React root — Where test component mounts

</code_context>

<specifics>
## Specific Ideas

- Test component should have buttons for each test value (0, 64, 128, 192, 255) plus direction (F/B/S)
- Trigger axis logging should print to console/terminal during dev mode
- Speed-first-then-direction sequence is mandatory for safety

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 20-Protocol Verification*
*Context gathered: 2026-05-13*

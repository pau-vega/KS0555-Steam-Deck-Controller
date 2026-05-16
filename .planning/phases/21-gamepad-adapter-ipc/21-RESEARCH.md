# Phase 21: Gamepad Adapter & IPC - Research

**Researched:** 2026-05-16
**Domain:** Tauri v2 IPC event pipeline, gilrs gamepad adapter, Command::Display wire-format
**Confidence:** HIGH

## Summary

Phase 21 wires `Command::Display` (wire-format string) through `gilrs_adapter.rs`, updates the `gamepad-direction` event payload from `{ direction: Direction }` to `{ command: string }`, and refreshes `ports_test.rs` mock-port assertions for the new shape.

Current state: `gilrs_adapter` emits `Direction` chars (`"F"`, `"B"`...) via `emit_direction()` → `sink.emit("gamepad-direction", json!({ "direction": "F" }))`. The domain layer already implements `Command` with `Display` (`F138\n`, `S\n`). The task is routing `Command` through the adapter instead of bare `Direction`.

**Key insight:** `Command` already has `fmt::Display` producing correct BT24 wire format. The adapter needs a new `emit_command()` function that calls `format!("{}", command)` and emits `{ command: "F138\n" }`. No change to `EventSink` trait, `tauri_event_sink`, or the Tauri event emission mechanism.

**Primary recommendation:** Add `emit_command(sink, command)` in `gilrs_adapter.rs`, replace `emit_direction` calls in `poll_triggers()` and `AxisChanged`/`ButtonChanged` branches, then update `use-gamepad.ts` payload field and `ports_test.rs` assertions.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|---------------|-----------|
| Gamepad polling + direction derivation | Rust/gilrs_adapter | — | gilrs blocks on `next_event()`; owned by `std::thread` per AGENTS.md |
| Command wire-format serialization | Rust/domain (Command::Display) | — | `fmt::Display` impl lives in `domain/direction.rs` |
| Tauri event emission | Rust/tauri_event_sink | — | `EventSink::emit` wraps `app.emit()` |
| Frontend event consumption | React/use-gamepad.ts | — | `listen("gamepad-direction")` in React effect |
| Test mock verification | Rust/ports_test.rs | — | `MockEventSink` captures `(event, payload)` tuples |

## Standard Stack

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `gilrs` | `0.12` (Cargo.lock) | Gamepad input polling | Steam Deck gamepad, native Linux, `gilrs::next_event()` blocks |
| `serde_json::Value` | `1.x` (Tauri) | Event payload type | `EventSink::emit(&self, event: &str, payload: Value)` |
| `tauri::{AppHandle, Emitter}` | `2.x` | Event emission to webview | `app.emit(event, payload)` in `TauriEventSink` |
| `async_trait` | `0.1` (tests) | `BluetoothPort` async trait | Used only in `ports_test.rs` mocks |

**No new dependencies required.** Phase is pure refactor within existing stack.

## Architecture Patterns

### Current Event Emission Flow

```
gilrs::next_event() → compute_combined() → Direction → emit_direction(sink, Direction)
                                                      ↓
                                              json!({ "direction": "F" })
                                                      ↓
                                              sink.emit("gamepad-direction", ...)
                                                      ↓
                                              TauriEventSink::emit() → app.emit()
```

### Target Event Emission Flow

```
gilrs::next_event() → compute_combined() → Direction → compute_stick_command() / compute_trigger_command()
                                                      ↓
                                              Command::{Drive {dir, pwm} | Stop}
                                                      ↓
                                              emit_command(sink, Command)
                                                      ↓
                                              format!("{}", cmd) → "F138\n"
                                                      ↓
                                              json!({ "command": "F138\n" })
                                                      ↓
                                              sink.emit("gamepad-direction", ...)
```

### Recommended Project Structure

```
apps/frontend/src-tauri/src/
├── adapters/
│   ├── gilrs_adapter.rs     ← emit_direction → emit_command (THE CHANGE)
│   └── tauri_event_sink.rs ← no change
├── domain/
│   └── direction.rs         ← Command enum + Display impl (already correct)
├── ports/
│   ├── event_sink.rs        ← no change
│   └── gamepad.rs           ← no change
└── lib.rs                   ← no change
```

### Pattern: EventSink emit

```rust
// Source: apps/frontend/src-tauri/src/adapters/tauri_event_sink.rs
impl EventSink for TauriEventSink {
    fn emit(&self, event: &str, payload: Value) {
        let _ = self.app.emit(event, payload);
    }
}
```

**Payload type is `serde_json::Value`**, constructed via `serde_json::json!({ "command": "F138\n" })`. The `Value` type is flexible enough to accept any JSON.

### Pattern: New emit_command helper

```rust
// Place inside gilrs_adapter.rs, alongside existing emit_direction
use crate::domain::direction::Command;

fn emit_command(sink: &dyn EventSink, cmd: Command) {
    sink.emit(
        "gamepad-direction",
        serde_json::json!({ "command": format!("{}", cmd) }),
    );
}
```

**Why this pattern:** `format!("{}", cmd)` invokes `Command`'s `Display` impl, producing `"F138\n"` or `"S\n"`. Single canonical serialization point. No repeated `to_string()` calls in callers.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Wire-format serialization | Custom string concat | `Command::Display` impl | Already implemented and tested in domain tests; changing `Display` risks BLE protocol desync |
| Event emission mechanism | Custom channel/queue | `EventSink` trait | Already abstracted; `TauriEventSink` wires to `app.emit()` |
| Direction→Command conversion | Rewrite compute functions | `compute_stick_command()` / `compute_trigger_command()` | Already exist in domain layer with full test coverage |

## Common Pitfalls

### Pitfall 1: Using Direction instead of Command in adapter
**What goes wrong:** `gamepad-direction` events still emit `{ direction: "F" }` instead of `{ command: "F138\n" }`.
**Why it happens:** `compute_combined()` returns `Direction`, not `Command`. Adapter needs to call `compute_stick_command()` or `compute_trigger_command()` instead.
**How to avoid:** Replace `compute_combined()` calls with `compute_stick_command()` for stick/dpad path, `compute_trigger_command()` for trigger path.

### Pitfall 2: Frontend payload field mismatch
**What goes wrong:** TypeScript `use-gamepad.ts` reads `event.payload.direction` but payload now has `command`.
**Why it happens:** Payload shape change `{ direction: Direction }` → `{ command: string }`.
**How to avoid:** Update `use-gamepad.ts` to read `event.payload.command`. Change state type from `Direction` to `string`.

### Pitfall 3: Mock port assertions still checking old field name
**What goes wrong:** `ports_test.rs` asserts `snap[2].1 == json!({ "direction": "F" })` but new payload is `json!({ "command": "F138\n" })`.
**Why it happens:** Test written for old payload shape.
**How to avoid:** Update `event_sink_records_emissions_in_order` test assertion and add new `gamepad-direction` command-shape assertions.

## Code Examples

### gilrs_adapter.rs — Current (before)

```rust
// Source: apps/frontend/src-tauri/src/adapters/gilrs_adapter.rs lines 45-50
fn emit_direction(sink: &dyn EventSink, direction: Direction) {
    sink.emit(
        "gamepad-direction",
        serde_json::json!({ "direction": direction.as_char() }),
    );
}

// In AxisChanged branch (line 127-132):
let new_direction = compute_combined(&inputs, DEADZONE);
if last_direction != Some(new_direction) {
    last_direction = Some(new_direction);
    last_send_time = Instant::now();
    emit_direction(sink.as_ref(), new_direction);
}
```

### gilrs_adapter.rs — Target (after)

```rust
use crate::domain::direction::{compute_stick_command, compute_trigger_command, Command};

fn emit_command(sink: &dyn EventSink, cmd: Command) {
    sink.emit(
        "gamepad-direction",
        serde_json::json!({ "command": format!("{}", cmd) }),
    );
}

// In AxisChanged branch — replace compute_combined with compute_stick_command:
let cmd = compute_stick_command(inputs.stick_x, inputs.stick_y);
if last_command != Some(cmd) {
    last_command = Some(cmd);
    last_send_time = Instant::now();
    emit_command(sink.as_ref(), cmd);
}
```

### use-gamepad.ts — Current (before)

```typescript
// Source: apps/frontend/src/hooks/use-gamepad.ts lines 12, 29-33
const [direction, setDirection] = useState<Direction>("S")

const unlistenDirection = await listen<{ direction: Direction }>("gamepad-direction", (event) => {
    const effective = applyDirectionInversion(event.payload.direction, invertedRef.current)
    setDirection(effective)
})
```

### use-gamepad.ts — Target (after)

```typescript
// State becomes string (wire format):
const [command, setCommand] = useState<string>("S\n")

const unlistenDirection = await listen<{ command: string }>("gamepad-direction", (event) => {
    // command is already wire format ("F138\n", "S\n")
    // Inversion logic applies to direction char only:
    const dirChar = event.payload.command[0]
    const effective = applyDirectionInversion(dirChar as Direction, invertedRef.current)
    setCommand(effective + event.payload.command.slice(1))
})
```

**Note:** Inversion operates on the direction character (`F`/`B`/`L`/`R`/`S`), not the full wire string. The PWM part passes through unchanged.

### ports_test.rs — Current (before)

```rust
// Source: apps/frontend/src-tauri/tests/ports_test.rs lines 147, 153-154
sink.emit("gamepad-direction", serde_json::json!({ "direction": "F" }));
// ...
assert_eq!(snap[2].0, "gamepad-direction");
```

### ports_test.rs — Target (after)

```rust
// Update existing assertion:
sink.emit("gamepad-direction", serde_json::json!({ "command": "F138\n" }));
// ...
assert_eq!(snap[2].0, "gamepad-direction");
assert_eq!(snap[2].1, serde_json::json!({ "command": "F138\n" }));

// Add command-shape test:
#[test]
fn gamepad_direction_payload_is_command_wire_format() {
    let sink = MockEventSink::new();
    sink.emit("gamepad-direction", serde_json::json!({ "command": "F138\n" }));
    sink.emit("gamepad-direction", serde_json::json!({ "command": "S\n" }));

    let snap = sink.snapshot();
    assert_eq!(snap.len(), 2);
    assert_eq!(snap[0].1, serde_json::json!({ "command": "F138\n" }));
    assert_eq!(snap[1].1, serde_json::json!({ "command": "S\n" }));
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Direction-based event `{ direction: "F" }` | Command-based event `{ command: "F138\n" }` | Phase 21 | Frontend reads full wire format; inversion applies per-char |
| `compute_combined()` returns `Direction` | `compute_stick_command()` returns `Command` | Phase 21 | Adapter calls Command-returning functions |
| `emit_direction(sink, Direction)` | `emit_command(sink, Command)` | Phase 21 | Single serialization point |

**No deprecated APIs used.** This phase completes the wire-format pipeline built in Phase 20.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `Command::Display` already produces correct wire format (`F138\n`, `S\n`) | Code Examples | Verified in `direction.rs` lines 48-55 — test `command_display_forward_138` asserts `"F138\n"` |
| A2 | Frontend inversion applies to direction char only | use-gamepad.ts | Inversion flips direction meaning (forward↔back, left↔right); PWM unchanged |
| A3 | `poll_triggers` path uses `compute_trigger`, which has equivalent `compute_trigger_command` | Common Pitfalls | `compute_trigger_command` exists in domain layer; heartbeat cadence unchanged per REQ-SPD-04 |

## Open Questions

1. **Inversion state type in use-gamepad.ts**
   - Current state: `useState<Direction>("S")` — a discriminated union
   - New state: `useState<string>("S\n")` — wire format string
   - Recommendation: Keep as `string`; inversion transforms `F↔B` or `L↔R` char and reconstructs the wire string by appending the PWM digits

2. **`poll_triggers` heartbeat cadence with `Command`**
   - `compute_trigger_command` returns `(Command, f32, f32)` — same effective pressures as `compute_trigger`
   - Heartbeat interval derivation (`compute_trigger_interval`) uses pressure magnitude, not command type
   - Cadence unchanged; no modification needed to `poll_triggers` logic

## Environment Availability

Step 2.6: SKIPPED — no external dependencies. Phase is pure refactor of existing Rust + TypeScript files.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Rust standard `#[test]` + `#[tokio::test]` |
| Config file | None — `cargo test` in `src-tauri/` |
| Quick run command | `cargo test --package app_lib --lib` |
| Full suite command | `cargo test --package app_lib` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-SPD-01 | `Command::Display` produces wire format | Unit | `cargo test command_display` | ✅ domain/direction.rs |
| VAL-02 | `gamepad-direction` event shape is `{ command: string }` | Integration | `cargo test gamepad_direction_event_name` | ✅ ports_test.rs |
| VAL-02 | Frontend reads `event.payload.command` | Unit | `cargo test gamepad_direction_payload_shape` | ✅ validation_test.rs |

### Wave 0 Gaps
- [ ] Update `ports_test.rs` `event_sink_records_emissions_in_order` for new payload shape
- [ ] Add `gamepad_direction_payload_is_command_wire_format` test in `ports_test.rs`
- [ ] Update `validation_test.rs` `test_gamepad_direction_payload_shape` assertion

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|--------|-----------------|
| V4 Access Control | No | N/A — IPC events not user-controlled |
| V5 Input Validation | Yes | `Command::Display` enforces `^[FBLR]\d{2,3}\n$` or `^S\n$` via existing regex validation in `ble/mod.rs` |

No security-sensitive changes in this phase. Event payloads are derived from gamepad hardware, not user input.

## Sources

### Primary (HIGH confidence)
- `apps/frontend/src-tauri/src/adapters/gilrs_adapter.rs` — current event emission (lines 45-50, 127-132)
- `apps/frontend/src-tauri/src/domain/direction.rs` — Command enum + Display impl (lines 42-55)
- `apps/frontend/src-tauri/src/ports/event_sink.rs` — EventSink trait definition

### Secondary (MEDIUM confidence)
- `apps/frontend/src-tauri/tests/ports_test.rs` — existing mock port tests (line 147)
- `apps/frontend/src/hooks/use-gamepad.ts` — frontend event consumption (lines 29-33)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — existing Tauri v2 + gilrs stack, no new deps
- Architecture: HIGH — EventSink trait already abstracts emission correctly
- Pitfalls: HIGH — all three pitfalls identified and mapped to prevention steps

**Research date:** 2026-05-16
**Valid until:** 2026-06-15 (60 days — stack is stable)
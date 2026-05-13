# Architecture: Progressive Analog Control

**Milestone:** v2.2 Progressive Analog Control
**Domain:** Tauri v2 desktop app — Steam Deck gamepad → BT24 BLE robot
**Researched:** 2026-05-13
**Overall confidence:** HIGH

---

## 1. Current Data Flow (Baseline)

```
gilrs event loop (std::thread, 8ms sleep)
  │
  ├─► EventType::AxisChanged(LeftStickX/Y or DPadX/Y)
  │     └─► compute_direction(x, y) → Direction { F, B, L, R, S }
  │         └─► if direction changed: emit "gamepad-direction" { direction: 'F' }
  │
  ├─► EventType::Connected → emit "gamepad-connected" { name }
  └─► EventType::Disconnected → emit "gamepad-disconnected" { name }

React hook useGamepad() ← listen('gamepad-direction')
  │  returns { direction, gamepadConnected, isDeck }
  ▼
app.tsx (LOCKED) useEffect on direction change:
  sendCommand(direction) → send(direction) → invoke("ble_send", { command: 'F' })

Rust ble_send() command handler:
  validate command.len() == 1
  discover_services → find 0000ffe1 → write raw byte (WriteType::WithoutResponse)
```

**Key bottlenecks for analog:**
1. Only single-char commands pass validation (`F`/`B`/`L`/`R`/`S`)
2. app.tsx only sends on `direction` changes — speed-only changes are invisible
3. No mechanism to carry speed data through the IPC pipeline
4. The `last_direction` guard in the gilrs loop blocks repeat emissions of the same direction

---

## 2. Target Data Flow

```
gilrs event loop (8ms sleep)
  │
  ├─► Track analog axes: LeftZ (L2), RightZ (R2), LeftStickX
  │     Normalize trigger values: (raw + 1.0) / 2.0 → 0..1 range
  │
  ├─► Compute MotorSpeeds { left: u8, right: u8 } + Direction from triggers + stick
  │     (Logic in new analog.rs module)
  │
  ├─► Emit "gamepad-state" on ANY analog change
  │     Payload: { direction, left_speed, right_speed, left_trigger, right_trigger, left_stick_x }
  │
  └─► Emit "gamepad-direction" on direction changes (UNCHANGED)
        Payload: { direction: 'F' }

Old path (UNCHANGED):
  useGamepad() ← listen('gamepad-direction')
    → app.tsx → invoke("ble_send", { command: direction })
    → ble_send writes single-char F/B/L/R/S

New path:
  useAnalogControl() ← listen('gamepad-state')
    → on change: invoke("ble_send_analog", { left_speed, right_speed, direction })
    → ble_send_analog writes: u<left>#, v<right>#, <direction>
    → (Three BLE writes, batched, without rediscovering services each time)

  useAnalogDisplay() (from context or sibling component)
    → shows live trigger/joystick/speed values in UI overlay
```

---

## 3. Module Changes

### 3.1 NEW: `gamepad/analog.rs`

Pure functions for speed computation. No Tauri dependencies.

```rust
// apps/frontend/src-tauri/src/gamepad/analog.rs

use serde::Serialize;

/// Raw analog values from the gamepad (normalized).
#[derive(Debug, Clone, Copy, Default)]
pub struct AnalogInput {
    pub left_trigger: f32,   // L2, 0.0 (released) .. 1.0 (fully pressed)
    pub right_trigger: f32,  // R2, 0.0 (released) .. 1.0 (fully pressed)
    pub left_stick_x: f32,   // -1.0 (left) .. 0.0 (center) .. 1.0 (right)
}

/// Computed motor speeds (0-255) and direction.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct MotorOutput {
    pub left_speed: u8,
    pub right_speed: u8,
    pub direction: Direction,  // re-use existing enum
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Direction {
    F, B, L, R, S,
}

/// Complete analog state emitted to frontend.
#[derive(Debug, Clone, Serialize)]
pub struct AnalogState {
    pub direction: &'static str,
    pub left_speed: u8,
    pub right_speed: u8,
    pub left_trigger: f32,
    pub right_trigger: f32,
    pub left_stick_x: f32,
}

pub fn normalize_trigger(raw: f32) -> f32 {
    // gilrs normalizes ALL axes to -1..1.
    // Triggers: -1.0 = released, 1.0 = pressed (SDL joystick convention).
    // Map to 0..1 for motor speed computation.
    ((raw + 1.0) / 2.0).clamp(0.0, 1.0)
}

pub fn compute_motor_output(input: &AnalogInput) -> MotorOutput {
    const DEADZONE: f32 = 0.05;      // smaller than stick deadzone
    const MIN_SPEED: u8 = 30;         // minimum speed to overcome motor stall
    const TURN_FACTOR: f32 = 0.6;     // max speed reduction for inner track

    let forward = input.right_trigger;
    let backward = input.left_trigger;

    if forward < DEADZONE && backward < DEADZONE {
        return MotorOutput {
            left_speed: 0,
            right_speed: 0,
            direction: Direction::S,
        };
    }

    // Which direction?
    let (base_speed, dir_sign) = if forward >= backward {
        (forward, 1.0_f32)   // forward
    } else {
        (backward, -1.0_f32) // backward
    };

    // Map 0..1 → MIN_SPEED..255
    let base = (base_speed * (255.0 - MIN_SPEED as f32) + MIN_SPEED as f32) as u8;

    // Turn: left_stick_x (+1 = right, -1 = left)
    // Differential: inner track slows, outer track stays at base.
    let turn = input.left_stick_x;
    let diff = turn.abs() * TURN_FACTOR * (base_speed as f32);

    let left_offset = (diff * if turn < 0.0 { -1.0 } else { 1.0 }) as u8;
    let right_offset = (diff * if turn > 0.0 { -1.0 } else { 1.0 }) as u8;

    let dir = if forward >= backward { Direction::F } else { Direction::B };

    MotorOutput {
        left_speed: (base as i16 - left_offset as i16 * dir_sign as i16).clamp(0, 255) as u8,
        right_speed: (base as i16 - right_offset as i16 * dir_sign as i16).clamp(0, 255) as u8,
        direction: dir,
    }
}

// Unit tests
#[cfg(test)]
mod tests {
    // ... verify normalization, deadzone, basic forward/backward/turn
}
```

**NOTE:** The exact turn formula must be validated on the physical robot. The constants (`MIN_SPEED`, `TURN_FACTOR`) should be configurable, not hardcoded — either via `AppHandle` managed state or environment variables.

### 3.2 MODIFY: `gamepad/mod.rs`

**Changes needed:**

| Change | Detail | Location |
|--------|--------|----------|
| Add import for `analog` module | `pub mod analog;` | Top of file |
| Add `AnalogInput` tracking | Persistent vars alongside `last_direction` | Inside thread loop |
| Add trigger axis handling | Match `Axis::LeftZ` and `Axis::RightZ` in `AxisChanged` | Event match block |
| Add analog event emission | Emit `gamepad-state` with full `AnalogState` payload | After speed computation |
| Add change guard for analog | Emit only when speed changes > threshold (e.g., delta > 3) | Prevents event spam |
| Keep old direction event | `gamepad-direction` still fires for backward compat | Unchanged |

**Axis matching in event loop:**

```rust
EventType::AxisChanged(axis, _value, _old_value) => {
    match axis {
        Axis::LeftZ | Axis::RightZ | Axis::LeftStickX => {
            // Update AnalogInput cache
            // Compute MotorOutput
            // Emit gamepad-state
        }
        Axis::LeftStickY | Axis::DPadX | Axis::DPadY => {
            // Existing direction logic (unchanged)
        }
        _ => {}
    }
}
```

**Important:** `Axis::LeftZ` and `Axis::RightZ` are the SDL2-convention trigger analog axes. On Steam Deck hardware, these map to L2 and R2 analog triggers respectively (verified via SDL HID driver source: `sTriggerRawL` → `SDL_GAMEPAD_AXIS_LEFT_TRIGGER`). The value range in gilrs is -1.0 (rest) to 1.0 (fully pressed). Normalize with `(value + 1.0) / 2.0` to get 0.0-1.0.

**Gilrs Axis enum reference for analog:**

| Axis       | Value | Input       | Range    | Normalized |
|------------|-------|-------------|----------|------------|
| LeftZ      | 3     | L2 trigger  | -1..1    | 0..1       |
| RightZ     | 6     | R2 trigger  | -1..1    | 0..1       |
| LeftStickX | 1     | Left stick X| -1..1    | -1..1      |
| LeftStickY | 2     | Left stick Y| -1..1    | -1..1      |

**Source:** [gilrs 0.11 docs.rs](https://docs.rs/gilrs/latest/gilrs/ev/enum.Axis.html) (HIGH confidence). Trigger range verified via SDL Steam Deck HID driver at `src/joystick/hidapi/SDL_hidapi_steamdeck.c` (HIGH confidence).

### 3.3 MODIFY: `ble/mod.rs`

**`ble_send` validation change:**

```rust
#[tauri::command]
pub async fn ble_send(
    _app: AppHandle,
    state: tauri::State<'_, BleState>,
    command: String,
) -> Result<(), String> {
    // Accept single-char commands (F/B/L/R/S) and speed commands (u<val>#, v<val>#)
    if command.len() == 1 {
        let valid = matches!(command.as_str(), "F" | "B" | "L" | "R" | "S");
        if !valid {
            return Err(format!("Invalid command: '{}'. Must be F/B/L/R/S", command));
        }
    } else if command.len() >= 3 {
        let first = command.chars().next().unwrap();
        let last = command.chars().last().unwrap();
        if (first == 'u' || first == 'v') && last == '#' {
            let val = &command[1..command.len()-1];
            val.parse::<u8>().map_err(|_| {
                format!("Invalid speed value in '{}'", command)
            })?;
        } else {
            return Err(format!("Invalid command format: '{}'", command));
        }
    } else {
        return Err(format!("Invalid command: '{}'", command));
    }

    // ... existing write logic (unchanged)
}
```

**NEW: `ble_send_analog` command:**

```rust
#[tauri::command]
pub async fn ble_send_analog(
    state: tauri::State<'_, BleState>,
    left_speed: u8,
    right_speed: u8,
    direction: String,
) -> Result<(), String> {
    let peripheral = state.get().ok_or_else(|| "Not connected".to_string())?;

    peripheral.discover_services().await.map_err(|e| format!("Service discovery: {}", e))?;
    let chars = peripheral.characteristics();
    let char_uuid = uuid::Uuid::parse_str("0000ffe1-0000-1000-8000-00805f9b34fb")
        .map_err(|_| "Invalid UUID".to_string())?;
    let characteristic = chars.iter()
        .find(|c| c.uuid == char_uuid)
        .ok_or_else(|| "BT24 characteristic not found".to_string())?;

    // Batch writes: u<speed>#, v<speed>#, <direction>
    let cmds = [
        format!("u{}#", left_speed),
        format!("v{}#", right_speed),
        direction,
    ];

    for cmd in &cmds {
        peripheral.write(
            characteristic,
            cmd.as_bytes(),
            btleplug::api::WriteType::WithoutResponse,
        ).await.map_err(|e| format!("Write '{}' failed: {}", cmd, e))?;
    }

    Ok(())
}
```

**Rationale for batching:** Existing `ble_send` re-discovers services on every call (wasteful). The analog command discovers once and writes three bytes. `WriteType::WithoutResponse` means there's no ACK between writes, so rapid-fire sends work.

### 3.4 MODIFY: `lib.rs`

```rust
pub mod ble;
pub mod gamepad;  // gamepad::analog is accessible via gamepad::analog

// In invoke_handler:
.invoke_handler(tauri::generate_handler![
    ble_connect,
    ble_disconnect,
    ble_send,
    ble_send_analog,  // NEW
])
```

### 3.5 MODIFY: `capabilities/main.json`

```json
{
  "permissions": [
    "core:default",
    "ble-connect",
    "ble-disconnect",
    "ble-send",
    "ble-send-analog",
    "ble-state-changed",
    "gamepad-state"
  ]
}
```

---

## 4. Frontend Changes

### 4.1 MODIFY: `types.ts` — Add analog types

```typescript
export type Direction = "F" | "B" | "L" | "R" | "S"

export interface AnalogState {
  direction: Direction
  leftSpeed: number    // 0-255
  rightSpeed: number   // 0-255
  leftTrigger: number  // 0.0-1.0
  rightTrigger: number // 0.0-1.0
  leftStickX: number   // -1.0-1.0
}
```

### 4.2 MODIFY: `hooks/use-gamepad.ts` — Extend return shape

```typescript
// ADD to return:
export function useGamepad() {
  const [direction, setDirection] = useState<Direction>("S")
  const [gamepadConnected, setGamepadConnected] = useState(false)
  const [isDeck, setIsDeck] = useState(false)
  const [analogState, setAnalogState] = useState<AnalogState | null>(null)  // NEW
  const unlistenersRef = useRef<UnlistenFn[]>([])

  useEffect(() => {
    // ... existing setup ...
    
    // NEW: listen for gamepad-state
    const unlistenState = await listen<AnalogPayload>(
      "gamepad-state",
      (event) => {
        if (cancelled) return
        setAnalogState({
          direction: event.payload.direction,
          leftSpeed: event.payload.left_speed,
          rightSpeed: event.payload.right_speed,
          leftTrigger: event.payload.left_trigger,
          rightTrigger: event.payload.right_trigger,
          leftStickX: event.payload.left_stick_x,
        })
      }
    )
    unlistenersRef.current.push(unlistenState)
  }, [])

  // EXISTING fields unchanged
  return { direction, gamepadConnected, isDeck, analogState }  // added analogState
}
```

**Contract preserved:** `app.tsx` destructures `{ direction, gamepadConnected }` which still works. Adding `analogState` to the object does not break deconstruction of only the old fields.

### 4.3 NEW: `hooks/use-analog-control.ts`

This hook intercepts analog state changes and sends speed commands to BLE.

```typescript
import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import { useEffect, useRef } from "react"

interface AnalogPayload {
  direction: string
  left_speed: number
  right_speed: number
  left_trigger: number
  right_trigger: number
  left_stick_x: number
}

export function useAnalogControl() {
  const lastSpeedsRef = useRef({ left: 0, right: 0 })

  useEffect(() => {
    if (!window.__TAURI_INTERNALS__) return

    let cancelled = false

    const setup = async () => {
      const unlisten = await listen<AnalogPayload>(
        "gamepad-state",
        (event) => {
          if (cancelled) return

          const { left_speed, right_speed, direction } = event.payload

          // Skip if speeds haven't changed meaningfully
          const sameSpeed =
            Math.abs(left_speed - lastSpeedsRef.current.left) < 3 &&
            Math.abs(right_speed - lastSpeedsRef.current.right) < 3

          if (sameSpeed) return

          lastSpeedsRef.current = { left: left_speed, right: right_speed }

          // Send batched analog command
          invoke("ble_send_analog", {
            leftSpeed: left_speed,
            rightSpeed: right_speed,
            direction,
          }).catch((err) => {
            console.error("ble_send_analog failed:", err)
          })
        },
      )

      return unlisten
    }

    const unlistenPromise = setup()

    return () => {
      cancelled = true
      unlistenPromise.then((fn) => fn?.())
    }
  }, [])
}
```

### 4.4 NEW: `components/analog-display.tsx`

Reads from `useGamepad().analogState` to render live values. Since this component must be mounted somewhere and `app.tsx` is locked, it mounts via a sibling in `main.tsx`.

```typescript
// Usage: <AnalogDisplay />
import { useGamepad } from "../hooks/use-gamepad"

export function AnalogDisplay() {
  const { analogState } = useGamepad()

  if (!analogState) return null

  const { leftTrigger, rightTrigger, leftStickX, leftSpeed, rightSpeed, direction } = analogState

  return (
    <div className="fixed bottom-4 right-4 bg-surface/90 rounded-lg border border-border p-3 text-xs space-y-1 font-mono">
      <div>R2 (forward): {(rightTrigger * 100).toFixed(0)}%</div>
      <div>L2 (backward): {(leftTrigger * 100).toFixed(0)}%</div>
      <div>Stick X: {leftStickX.toFixed(2)}</div>
      <div>Left motor: {leftSpeed} | Right motor: {rightSpeed}</div>
      <div>Direction: {direction}</div>
    </div>
  )
}
```

### 4.5 MODIFY: `main.tsx`

Mount the analog display as a sibling to `App`:

```typescript
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { App } from "./app"
import { AnalogDisplay } from "./components/analog-display"
import { ErrorBoundary } from "./components/error-boundary"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
      <AnalogDisplay />
    </ErrorBoundary>
  </StrictMode>,
)
```

---

## 5. Protocol: BT24 Speed Commands

The Keyestudio Multifunktionel Tank firmware supports speed-control commands alongside the standard F/B/L/R/S:

| Command | Range | Purpose | Example |
|---------|-------|---------|---------|
| `u<value>#` | 0-255 | Set left motor speed | `u128#` → left motor PWM 128 |
| `v<value>#` | 0-255 | Set right motor speed | `v200#` → right motor PWM 200 |
| `F` | — | Forward at current speed | Uses last set `speeds_L`/`speeds_R` |
| `B` | — | Backward at current speed | Uses last set `speeds_L`/`speeds_R` |
| `L` | — | Pivot left (spin in place) | Left back + right forward, full speed |
| `R` | — | Pivot right (spin in place) | Left forward + right back, full speed |
| `S` | — | Stop | Both motors 0 PWM |

**Source:** Multifunktionel_tank.ino from KS0555 community repo (MEDIUM confidence — needs verification against the exact firmware flashed on the physical robot). The `u` command sets `speeds_L` and `v` sets `speeds_R` via `Serial.readStringUntil('#'`)` pattern.

**Verification required:** Before implementing the Rust protocol logic, send `u128#` followed by `F` to the physical BT24 robot and confirm it moves forward at reduced speed. The firmware must be the "BT Speed Control Robot" (Project 18) variant, not the basic "Bluetooth Control Tank" (Project 17) variant.

**Fallback:** If speed commands are not supported, the alternative is to use only the existing F/B/L/R/S commands at fixed/default speeds. The analog triggers would become digital (on/off) and the joystick would provide direction only — reverting to existing behavior. The architecture supports this fallback: if ble_send always validates len==1, the new `ble_send_analog` simply won't be used.

---

## 6. Data Flow Summary

```
┌─────────────────────────────────────────────────────────────────┐
│ Rust: gamepad/mod.rs (std::thread, 8ms loop)                    │
│                                                                  │
│  gilrs.next_event()                                              │
│       │                                                          │
│       ├── LeftZ / RightZ / LeftStickX ──────────┐                │
│       │    (trigger + stick axes)                │                │
│       │                                          ▼                │
│       │                              analog::compute_motor_output │
│       │                                          │                │
│       │                              ┌───────────┴───────────┐   │
│       │                              │ MotorOutput            │   │
│       │                              │  left_speed: u8       │   │
│       │                              │  right_speed: u8      │   │
│       │                              │  direction: Direction  │   │
│       │                              └───────────┬───────────┘   │
│       │                                          │                │
│       ├── LeftStickY / DPadX / DPadY ────────────┤                │
│       │    (existing direction logic)            │                │
│       │                                          ▼                │
│       │                              emit "gamepad-state"         │
│       │                              (analog + speed + dir)      │
│       │                                          │                │
│       └── direction change? ─────────────────────┤                │
│                        (existing guard)          │                │
│                                                   ▼                │
│                              emit "gamepad-direction"             │
│                              (old event, unchanged)               │
└───────────────────────────────────┬─────────────────────────────┘
                                    │ Event
                                    ▼ IPC
┌─────────────────────────────────────────────────────────────────┐
│ Frontend: React WebView                                         │
│                                                                  │
│  useGamepad() ← listen("gamepad-direction")                     │
│    returns { direction, gamepadConnected, isDeck, analogState } │
│       │                                                          │
│       ├── app.tsx (LOCKED)                                       │
│       │   useEffect([direction]) → invoke("ble_send")           │
│       │   (old path, unchanged)                                  │
│       │                                                          │
│       ├── useAnalogControl() ← listen("gamepad-state")           │
│       │   useEffect → invoke("ble_send_analog")                  │
│       │   (new path, primary for analog)                         │
│       │                                                          │
│       └── AnalogDisplay (sibling component)                      │
│           reads analogState from useGamepad()                    │
│           renders live trigger/stick/speed values                │
│                                                                  │
└───────────────────────────────────┬─────────────────────────────┘
                                    │ invoke
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ Rust: Tauri Command Handlers                                    │
│                                                                  │
│  ble_send(command: String)     (old, validation relaxed)         │
│    writes single-char to BT24                                    │
│                                                                  │
│  ble_send_analog(left_speed, right_speed, direction)  (NEW)      │
│    discover services once → write u#, v#, dir                   │
│    (batched for latency)                                         │
│                                                                  │
└───────────────────────────────────┬─────────────────────────────┘
                                    │ BLE Write
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ BT24 Module → UART → Arduino                                    │
│                                                                  │
│  Serial.read() → case 'u': speeds_L = readStringUntil('#')      │
│  Serial.read() → case 'v': speeds_R = readStringUntil('#')      │
│  Serial.read() → case 'F': Car_front()                          │
│    digitalWrite(dir, LOW)                                        │
│    analogWrite(pwm, speeds_L)                                    │
│    analogWrite(pwm, speeds_R)                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `gamepad/mod.rs` | gilrs event loop, axis tracking, event emission | `gamepad::analog`, `AppHandle::emit` |
| `gamepad/analog.rs` (NEW) | Pure functions: trigger normalization, speed computation | Called by `gamepad/mod.rs` |
| `ble/mod.rs` | BLE connect/disconnect/send, service discovery | `btleplug`, `BleState` |
| `useGamepad()` hook | Listen for gamepad events, expose state to React | Tauri `listen()`, React state |
| `useAnalogControl()` hook (NEW) | Listen for analog state, invoke BLE speed commands | Tauri `listen()`, `invoke()` |
| `AnalogDisplay` component (NEW) | Render analog values as overlay | `useGamepad().analogState` |
| `app.tsx` (LOCKED) | Send direction changes to BLE (old path) | `useGamepad()`, `useBluetooth()` |
| `main.tsx` | Mount `App` + `AnalogDisplay` | React root |

---

## 8. Locked File Compatibility

| Locked File | What Stays Same | How New Features Don't Touch It |
|-------------|-----------------|----------------------------------|
| `app.tsx` | `useGamepad()` destructure, `useEffect([direction])`, `sendCommand()`, render tree | New analogState on the hook return is ignored by old destructure. AnalogDisplay mounts as sibling, not child. |
| `control-pad.tsx` | Props interface unchanged | Not modified |
| `status-bar.tsx` | Props interface unchanged | Not modified |

---

## 9. Build Order (Dependency-Aware)

```
Phase A: Protocol Verification
  └─► Send u<val># + F to physical BT24 robot
  └─► Confirm speed commands work on the flashed firmware
  └─► Measure trigger axis values on Steam Deck (LeftZ/RightZ range)
  └─► OUTPUT: Confirmed protocol constants (speed range, axis mapping)

Phase B: Rust Backend (Analog Engine)
  └─► Create gamepad/analog.rs with pure speed computation
  └─► Modify gamepad/mod.rs: track analog axes, emit gamepad-state
  └─► Modify ble/mod.rs: relax validation, add ble_send_analog
  └─► Update lib.rs, capabilities/main.json
  └─► Depends on: Phase A (confirmed protocol)

Phase C: Frontend (Hooks + Display)
  └─► types.ts: add AnalogState type
  └─► use-gamepad.ts: add analogState to return
  └─► use-analog-control.ts: new hook for BLE sends
  └─► Depends on: Phase B (events flowing)

Phase D: UI Overlay
  └─► analog-display.tsx: render component
  └─► main.tsx: mount sibling
  └─► Depends on: Phase C (analogState available)

Phase E: Integration Testing
  └─► Full end-to-end: trigger → speed command → BLE → robot
  └─► Edge cases: rapid trigger changes, button+dpad fallback
  └─► Depends on: Phase B + C + D

Phase F: Manual Steam Deck Validation
  └─► Real hardware test with robot
  └─► Tune MIN_SPEED, TURN_FACTOR constants
  └─► Depends on: Phase E
```

**Parallelization:** Phase A stands alone. Phases C and D are frontend-only and can proceed once the event types are stable (defined during Phase B discussion). Phase B is the critical path.

---

## 10. Pitfalls and Mitigations

| Pitfall | Risk | Mitigation |
|---------|------|------------|
| Speed commands not supported by current firmware | HIGH — entire approach blocked | Phase A = verify on hardware first. Fallback: make speed configurable per-milestone. |
| Double-send race (old path + new path both writing BLE) | MEDIUM — extra BLE traffic but harmless | `ble_send_analog` batches all three writes. Old path's single-char write is idempotent (robot just re-executes current direction with current speeds). |
| Trigger axis mapping differs on macOS vs Steam Deck | MEDIUM — different platforms, different ranges | The `normalize_trigger()` function handles -1..1 range. Add platform notes in comments. |
| Event storm: `gamepad-state` fires every 8ms | LOW — UI lag from too many React state updates | Change guard: only emit when speed delta > 3 or direction changed. Hook throttles at React level. |
| BleState mutex contention from parallel sends | MEDIUM — `ble_send_analog` and `ble_send` called near-simultaneously | Both commands acquire and release the mutex quickly. The old path is fire-and-forget (no `await` in `send()`). Negligible contention. |
| app.tsx still sends old single-char commands alongside analog commands | LOW — redundant but harmless | Old path fires on direction change only. New path fires on speed change. They overlap minimally. The robot handles duplicate serial commands via `Serial.read()` in the loop. |
| Speed formula tuning requires hardware | MEDIUM — can't optimize without robot | Make `MIN_SPEED` and `TURN_FACTOR` environment-configurable for development tuning. |

---

## 11. Sources

| Source | Finding | Confidence |
|--------|---------|------------|
| [Gilrs Axis docs](https://docs.rs/gilrs/latest/gilrs/ev/enum.Axis.html) | LeftZ=3, RightZ=6 for triggers | HIGH |
| [Gilrs Gamepad docs](https://docs.rs/gilrs/latest/gilrs/struct.Gamepad.html) | `axis_data(Axis)` returns `-1.0..1.0` | HIGH |
| [SDL Steam Deck HID driver](https://github.com/libsdl-org/SDL/blob/main/src/joystick/hidapi/SDL_hidapi_steamdeck.c) | Trigger mapping: sTriggerRaw → SDL_GAMEPAD_AXIS_LEFT_TRIGGER | HIGH |
| [SDL gamepad axis spec](https://github.com/libsdl-org/SDL/blob/main/include/SDL3/SDL_gamepad.h) | Triggers: 0 (released) to 32767 (pressed) at gamepad API level | HIGH |
| [Keyestudio Multifunktionel_tank.ino](https://github.com/Mowglli/Mini-Tank-Robot-V3/blob/main/Multifunktionel_tank.ino) | `u<val>#` / `v<val>#` speed command protocol | MEDIUM (community firmware, may differ from KS0555 stock) |
| KS0555 Project 18: BT Speed Control Robot | Speed control via BT exists | MEDIUM (listed in KS0555 docs TOC) |
| EXISTING CODE: app.tsx, gamepad/mod.rs, ble/mod.rs | Current architecture details | HIGH (verified by codebase review) |
| EXISTING CODE: AGENTS.md | Locked file constraints | HIGH |

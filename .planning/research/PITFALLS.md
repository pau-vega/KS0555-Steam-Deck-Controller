# Domain Pitfalls

**Domain:** Tauri v2 gamepad-to-BLE robot control — Progressive Analog Addition
**Researched:** 2026-05-13

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Speed Protocol Not Supported by Firmware

**What goes wrong:** The entire milestone relies on `u<val>#` / `v<val>#` speed commands. If the physical robot's flashed Arduino sketch only handles `F`/`B`/`L`/`R`/`S` (Project 17 firmware, not Project 18), speed commands will be silently ignored or cause undefined behavior.

**Why it happens:** The KS0555 documentation lists both "Bluetooth Control Tank" (Project 17, single-char only) and "BT Speed Control Robot" (Project 18, speed commands). The robot ships pre-flashed with one of these, and there's no way to tell which without testing.

**Consequences:** Either (a) speed commands are ignored and the robot moves at whatever default speed the firmware initializes to, or (b) the `u`/`v` chars confuse the serial parser and cause erratic behavior.

**Prevention:** Phase A: send `u128#` followed by `F` to the physical BT24 robot while monitoring motor behavior. If speed changes, the protocol is supported. If not, fall back to fixed-speed digital control.

**Detection:** During Phase A, the robot will either (a) move at reduced speed (Protocol supported ✓), (b) ignore the `u`/`v` commands and move at default full speed (silent failure), or (c) behave erratically (protocol collision).

### Pitfall 2: Double-Send Race Condition (Old + New Paths)

**What goes wrong:** app.tsx's `useEffect([direction])` fires `invoke("ble_send", { command: 'F' })` at the same time as `useAnalogControl()` fires `invoke("ble_send_analog", ...)`. The BLE writes interleave at the btleplug level.

**Why it happens:** The locked app.tsx still has its direction-sending effect. When the user presses R2, the gamepad thread emits `gamepad-direction` (direction changes S→F) AND `gamepad-state` (analog). Both events arrive at the frontend nearly simultaneously, triggering both send paths.

**Consequences:** The BT24 receives writes in this order: `u128#`, `v128#`, `F`, `F` (from analog path) followed by `F` (from old path). This is actually fine — the extra `F` re-applies the same direction with the current speeds. No data corruption risk because `WriteType::WithoutResponse` means there's no ACK ordering requirement.

**Prevention:** Document as expected behavior. The dual send is redundant but harmless. The old path's extra `F` is idempotent.

**Detection:** Rust logs from `ble_send` and `ble_send_analog` will show interleaved calls. Not an error state.

### Pitfall 3: Trigger Axis Range Varies by Platform

**What goes wrong:** On macOS with IOKit, trigger axes might report 0..1 range instead of -1..1. On Steam Deck with evdev+SDL mapping, -1..1. Incorrect normalization produces wrong speeds.

**Why it happens:** gilrs normalizes to -1..1 for all axes, but the conversion from platform-native values depends on the SDL mapping. Different gamepads on different platforms can report different raw ranges.

**Consequences:** Triggers might report full speed at light touch (if already 0..1 and we apply `(value + 1.0) / 2.0`), or never reach full speed.

**Prevention:** Test on Steam Deck hardware in Phase A. Read raw `AxisData` values and log them. Adjust `normalize_trigger()` to be robust: if most values are >0, it's already in 0..1 range; if values span -1..1, apply normalization.

**Detection:** Trigger values near 0.0 when unpressed but near 1.0 at 50% physical press → wrong normalization. Add debug logging of raw axis values.

## Moderate Pitfalls

### Pitfall 4: Speed-Only Changes Not Sent

**What goes wrong:** User holds R2 at 30%, then presses harder to 70%. Direction stays `F`. The old path (app.tsx) doesn't fire because direction hasn't changed. The new path's change guard (`speed delta > 3`) must detect this.

**Why it happens:** The `lastSpeedsRef` guard in `useAnalogControl` is the only mechanism that triggers sends for speed-only changes.

**Consequences:** Robot doesn't respond to mid-movement speed changes.

**Prevention:** The `useAnalogControl` hook's change guard uses `Math.abs(left_speed - lastLeft) < 3`. This ensures even small speed changes trigger sends. The guard exists to prevent event storms, not to block speed updates.

### Pitfall 5: First `F` Before Speed Commands

**What goes wrong:** When the user presses R2, the gamepad thread emits `gamepad-direction` (S→F) and `gamepad-state` simultaneously. app.tsx fires `invoke("ble_send", { command: 'F' })` immediately. The robot receives `F` before `u128#`/`v128#` arrive. It moves at `speeds_L`/`speeds_R` which may be 0 (uninitialized) or a stale value.

**Why it happens:** IPC latency — the old path (app.tsx) and new path (useAnalogControl) are independent. The old path wins the race because `gamepad-direction` and `gamepad-state` arrive in the same microtask queue tick but the old path's `useEffect([direction])` fires first.

**Consequences:** On first connection, the robot may receive `F` with `speeds_L=0` (no movement), then `u128#`/`v128#`/`F` 1-2ms later. The robot twitches but doesn't move meaningfully.

**Prevention:** Set default speeds in the firmware or accept the ~2ms delay. In practice, this is invisible to the user — the motors accelerate from 0 to target speed faster than human perception.

## Minor Pitfalls

### Pitfall 6: Event Storm at 8ms

**What goes wrong:** The gilrs loop emits `gamepad-state` every 8ms when triggers are held steadily. React sets state 125 times/second.

**Why it happens:** The change guard (delta > 3) should filter most events when triggers are steady. Input noise still causes minor fluctuations.

**Consequences:** Minor CPU overhead from React re-renders of the display component. < 1% CPU on Steam Deck.

**Prevention:** Add a debounce or throttle in `useAnalogControl` for BLE sends. The display can handle 125fps updates.

### Pitfall 7: Backward Turn Direction Error

**What goes wrong:** When reversing (L2 pressed) and steering left, the robot turns right instead of left.

**Why it happens:** The turn formula might not invert correctly for backward motion. Differential steering in reverse has the opposite effective turning bias compared to forward.

**Prevention:** The `dir_sign` parameter in `compute_motor_output()` accounts for this. Validate on physical hardware and adjust the formula.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Phase A: Protocol verification | Speed commands ignored by basic firmware | Verify with physical robot first. Fallback: keep v2.1 behavior + document "speed control requires Project 18 firmware". |
| Phase B: Rust backend | Wrong axis enum variant for triggers | Use `Axis::LeftZ`/`Axis::RightZ` (confirmed via gilrs docs and Steam Deck HID driver). Test on hardware. |
| Phase C: Frontend hooks | Infinite re-render loop from analogState in React effect | Keep analogState as read-only display value. Control hook uses `useRef` for guard, not state dependency. |
| Phase D: UI overlay | Overlay positioning conflicts with app layout | Use `fixed bottom-4 right-4` positioning outside app's flow. |
| Phase E: Integration | Speed value overflow in u8 range | Validate speed 0-255 at boundary. `u256#` would break. |

## Sources

- Existing codebase: gamepad/mod.rs, ble/mod.rs, app.tsx (HIGH confidence)
- [Gilrs Axis enum](https://docs.rs/gilrs/latest/gilrs/ev/enum.Axis.html) — axis mapping (HIGH confidence)
- [Keyestudio Multifunktionel_tank.ino](https://github.com/Mowglli/Mini-Tank-Robot-V3/blob/main/Multifunktionel_tank.ino) — speed protocol (MEDIUM confidence)
- [SDL Steam Deck HID driver](https://github.com/libsdl-org/SDL/blob/main/src/joystick/hidapi/SDL_hidapi_steamdeck.c) — trigger axis mapping (HIGH confidence)

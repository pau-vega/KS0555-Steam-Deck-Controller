# Feature Landscape

**Domain:** Tauri v2 gamepad-to-BLE robot controller
**Researched:** 2026-05-13

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| R2 triggers forward movement (analog) | Standard R/C car control: push harder = go faster | Med | Requires trigger axis → speed mapping + speed BLE commands |
| L2 triggers backward movement (analog) | Symmetric with R2 for reverse | Med | Same pipeline as R2 |
| Left joystick steers while moving | Tank-style differential steering | Med | Requires combining trigger speed with joystick turn bias |
| Live speed/input display | User needs to see analog values to understand robot behavior | Low | Simple overlay component showing percentages |
| Default forward direction is intuitive | Pulling R2 = forward, not backward | Low | Firmware convention: negative Y = forward for sticks, but triggers don't have this ambiguity |
| Movement stops when trigger released | Safety: releasing R2 = immediate stop | Low | The speed commands set speed 0 and direction S |

## Differentiators

Features that set this product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Adjustable deadzone for triggers | Accommodates different trigger sensitivities across Steam Decks | Low | Hardcoded constant in analog.rs, could be made configurable later |
| Brake/reverse logic | When R2 pressed: forward. Then L2 pressed while moving forward: brake then reverse | Med | Requires tracking direction history, not needed for MVP |
| Configurable speed curve | Linear vs exponential trigger response | Low | Pure math in analog.rs, trivial to parameterize |
| Joystick-only speed control | Alternative to triggers (e.g., forward = stick up, speed = stick deflection) | Med | Currently triggers are the speed source; would require mode switch |
| On-screen speed gauge bar | Better UX than numeric percentage | Low | Visual bar in analog-display.tsx |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Custom speed curve UI in settings | Premature optimization. Hardcode then make configurable later. | Expose constants at top of analog.rs with clear comments. |
| Gyro-assisted steering | Would require Steam Deck gyro access via SDL, not in scope for v2.2 | Pure joystick-based differential steering |
| Save/load speed profiles | No user storage mechanism, overkill for single-user version | Hardcoded defaults only |
| Web-based speed configurator | Overengineered for a local app | Modify Rust constants if tuning needed |
| Twin-stick control (left stick = left track, right stick = right track) | Different control paradigm, would need mode switching | Single stick + triggers is standard for R/C tank control |
| macOS/Windows analog support | Different axis mappings would need platform-specific code | Steam Deck only for v2.2 |

## Feature Dependencies

```
Analog display ─► analogState from useGamepad()
    │
    └─► gamepad-state event from Rust
    │
    └─► Axis tracking in gamepad/mod.rs
    │
    └─► gilrs LeftZ/RightZ/LeftStickX axis events
    │
    └─► Steam Deck gamepad connected

Speed BLE sending ─► ble_send_analog command
    │
    └─► ble_send_analog implementation in ble/mod.rs
    │
    └─► Relaxed ble_send validation for u<val># / v<val>#
    │
    └─► MotorOutput from gamepad/analog.rs
    │
    └─► AnalogInput from axis tracking
    │
    └─► Speed protocol supported on robot firmware

Direction display (existing) ─► gamepad-direction event (unchanged)
```

## MVP Recommendation

Prioritize:
1. **R2 forward + L2 backward with analog speed** — Core feature, replaces digital F/B with progressive control
2. **Left joystick differential steering** — Essential for turning while in motion
3. **Analog speed overlay** — Small effort, high value for debugging and user feedback

Defer:
- **Configurable speed curves**: Not needed for MVP, hardcode constants
- **Brake/reverse logic**: Forward→reverse transition via releasing R2 then pressing L2 is sufficient
- **Gyro/twin-stick control**: Out of scope for v2.2

## Sources

- [Keyestudio Multifunktionel_tank.ino](https://github.com/Mowglli/Mini-Tank-Robot-V3/blob/main/Multifunktionel_tank.ino) — speed command protocol (MEDIUM confidence)
- Existing codebase: current F/B/L/R/S behavior from gamepad/mod.rs (HIGH confidence)

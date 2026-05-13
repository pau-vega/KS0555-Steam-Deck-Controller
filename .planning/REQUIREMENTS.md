# Requirements: Steam Deck Robot Controller

**Defined:** 2026-05-13
**Core Value:** Control a real robot from Steam Deck gamepad input with low latency — commands must reach the robot reliably and quickly.

## v2.2 Requirements

Requirements for v2.2 Progressive Analog Control.

### Analog Backend

- [ ] **ANA-01**: Rust gamepad module reads R2 trigger (`Axis::RightZ`) as analog forward speed value 0.0–1.0
- [ ] **ANA-02**: Rust gamepad module reads L2 trigger (`Axis::LeftZ`) as analog backward speed value 0.0–1.0
- [ ] **ANA-03**: Rust gamepad module reads left joystick X-axis (`Axis::LeftStickX`) for differential steering -1.0–1.0
- [ ] **ANA-04**: Rust computes motor speeds (left/right PWM 0–255) from trigger + joystick via differential steering formula
- [ ] **ANA-05**: Rust emits `gamepad-state` event with full analog payload (trigger %, stick %, computed motor speeds, direction char)
- [ ] **ANA-06**: Existing `gamepad-direction` event continues to fire for backward compatibility with locked `app.tsx`
- [ ] **ANA-07**: New `ble_send_analog` Tauri command batches three BLE writes: left motor speed (`u<val>#`), right motor speed (`v<val>#`), direction char (`F`/`B`/`S`)
- [ ] **ANA-08**: `ble_send` validation relaxed to accept multi-char speed commands (remove `command.len() != 1` guard)
- [ ] **ANA-09**: Throttle BLE writes to ~30 Hz with value-change threshold (>5% delta) to prevent BT24 buffer overflow

### Frontend UI

- [ ] **UI-01**: Frontend exposes `analogState` from `useGamepad()` containing trigger percentages and motor speeds
- [ ] **UI-02**: New `useAnalogControl` hook listens for `gamepad-state` events and invokes `ble_send_analog` with change guarding
- [ ] **UI-03**: New `AnalogDisplay` component shows live R2%, L2%, joystick X%, left/right motor speed % as progress bars
- [ ] **UI-04**: `AnalogDisplay` mounts as sibling in `main.tsx` without modifying locked `app.tsx`
- [ ] **UI-05**: Direction command `S` (stop) sent when both triggers below deadzone

### Integration & Validation

- [ ] **VAL-01**: Protocol verification phase confirms speed commands (`u<val>#`/`v<val>#`) work on physical BT24 robot
- [ ] **VAL-02**: Unit tests for `compute_motor_output()` covering deadzone, full speed, steering extremes, backward turn
- [ ] **VAL-03**: Integration tests verify event flow: trigger input → analog state event → BLE write
- [ ] **VAL-04**: Regression tests confirm old digital path (D-pad + joystick direction) still works
- [ ] **VAL-05**: Steam Deck hardware validation confirms trigger axis range, tunes MIN_SPEED and TURN_FACTOR constants
- [ ] **VAL-06**: Flatpak sandbox compatibility verified — no new permissions needed for extended BLE payloads
- [ ] **VAL-07**: Build, lint, typecheck all pass; `.flatpak` artifacts produced correctly

## Out of Scope

| Feature | Reason |
|---------|--------|
| Exponential/curved speed response | Linear mapping sufficient for MVP, add if hardware testing shows need |
| Joystick-only speed control mode | User wants trigger-based control; defer to v2.3 if requested |
| Save/load speed profiles | Not needed for single-robot, single-user use case |
| macOS/Windows analog support | Steam Deck / Linux only per project constraints |
| Twin-stick tank control (one stick per track) | Not requested; differential steering with single stick is the goal |
| Brake/reverse transition logic | Forward→reverse with braking is complex; simple stop-then-reverse is fine for MVP |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ANA-01 | — | Pending |
| ANA-02 | — | Pending |
| ANA-03 | — | Pending |
| ANA-04 | — | Pending |
| ANA-05 | — | Pending |
| ANA-06 | — | Pending |
| ANA-07 | — | Pending |
| ANA-08 | — | Pending |
| ANA-09 | — | Pending |
| UI-01 | — | Pending |
| UI-02 | — | Pending |
| UI-03 | — | Pending |
| UI-04 | — | Pending |
| UI-05 | — | Pending |
| VAL-01 | — | Pending |
| VAL-02 | — | Pending |
| VAL-03 | — | Pending |
| VAL-04 | — | Pending |
| VAL-05 | — | Pending |
| VAL-06 | — | Pending |
| VAL-07 | — | Pending |

**Coverage:**
- v2.2 requirements: 21 total
- Mapped to phases: 0
- Unmapped: 21 ⚠️

---

*Requirements defined: 2026-05-13*
*Last updated: 2026-05-13 after initial definition*

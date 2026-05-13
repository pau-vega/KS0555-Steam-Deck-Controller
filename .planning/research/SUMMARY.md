# Project Research Summary

**Project:** KS0555 Steam Deck Robot Controller — v2.2 Progressive Analog Control
**Domain:** Tauri v2 desktop app — Steam Deck gamepad → BT24 BLE robot
**Researched:** 2026-05-13
**Confidence:** HIGH (synthesis of high-confidence sources, with 1 medium-confidence gap)

## Executive Summary

This project adds progressive analog speed control to an existing Tauri v2 gamepad-to-BLE robot controller. Currently, the app sends single-character direction commands (F/B/L/R/S) via BLE — a digital on/off system. The v2.2 milestone adds R2/L2 analog triggers for variable speed, left joystick differential steering, and a live speed display overlay. The robot runs an Arduino on a Keyestudio KS0555 chassis with a BT24 BLE module.

The recommended approach requires **zero new dependencies** — all needed technology (Tauri 2.11.0, Rust 2021, React 19, btleplug 0.12, gilrs 0.11) is already in use. A dual-event strategy preserves full backward compatibility: the existing `gamepad-direction` event (driving locked `app.tsx`) stays unchanged, while a new `gamepad-state` event carries analog triggers, stick position, and computed motor speeds. Three new files are added (Rust analog computation module, React control hook, React display component) with surgical modifications to 7 existing files. The locked `app.tsx` constraint is respected through an additive pattern — the new `AnalogDisplay` mounts as a sibling in `main.tsx`, and the new `useAnalogControl` hook operates independently alongside the existing direction path.

The **single critical risk** is whether the physical robot's firmware supports the `u<val>#`/`v<val>#` speed command protocol. This must be verified in the first phase before any backend work begins. If the protocol is unsupported, the milestone degrades gracefully to fixed-speed digital control (existing behavior). Secondary risks include trigger axis range variance across platforms (prevented by testing on Steam Deck hardware) and a double-send race condition between old and new control paths (documented as harmless — the extra direction command is idempotent).

## Key Findings

### Recommended Stack

**Zero new dependencies required.** The existing stack handles everything needed for analog control. See [STACK.md](./STACK.md) for full analysis.

**Core technologies:**
- **Tauri 2.11.0**: Desktop shell + IPC bridge — already used, provides `invoke()`/`listen()` for the new `gamepad-state` event and `ble_send_analog` command.
- **Rust Edition 2021**: Backend analog computation — new `gamepad/analog.rs` module is pure Rust with no Tauri deps, enabling unit testing of speed formulas.
- **React 19**: UI components — new `useAnalogControl` hook and `AnalogDisplay` component follow existing patterns. Hooks use `useRef` for change guards to prevent re-render loops.
- **btleplug 0.12**: BLE communication — existing `write()` with `WriteType::WithoutResponse` handles the three batched writes (`u<speed>#`, `v<speed>#`, direction) without ACK ordering constraints.
- **gilrs 0.11**: Gamepad input — `Axis::LeftZ` (L2 trigger, ID 3) and `Axis::RightZ` (R2 trigger, ID 6) are already recognized. Values range -1.0 to 1.0, normalized to 0.0-1.0.

**Key decision: speed computation in Rust, not frontend.** Computing `MotorOutput` in `analog.rs` avoids IPC roundtrip latency during rapid trigger changes. The frontend only receives display values.

### Expected Features

**Must have (table stakes):**
- **R2 forward with analog speed** — more pressure = more speed. Maps RightZ trigger axis to left/right motor PWM (0-255).
- **L2 backward with analog speed** — symmetric to R2. Triggers use a "push-off" model (whichever is pressed further determines direction).
- **Left joystick differential steering** — steering while moving. Inner track slows, outer track stays at base speed. `TURN_FACTOR = 0.6` reduces inner track up to 60%.
- **Live speed/input overlay** — shows trigger %, stick X, left/right motor speeds, and direction. Mounted as fixed-position sibling to avoid touching locked `app.tsx`.
- **Stop on release** — both triggers below deadzone → direction `S` with both motor speeds at 0.

**Should have (differentiators):**
- **Adjustable trigger deadzone** — constants exposed at top of `analog.rs` for easy tuning. Hardcoded at 0.05 for MVP.
- **Configurable speed curve** — linear mapping from trigger 0-1 to speed `<MIN_SPEED..255>`. Exponential curve can be added later by changing `compute_motor_output`.

**Defer (v2+):**
- Brake/reverse logic (forward→reverse transition with braking)
- Joystick-only speed control mode
- Save/load speed profiles
- Gyro-assisted steering
- Twin-stick tank control
- macOS/Windows analog support

### Architecture Approach

A **dual-event strategy** adds analog control without touching the locked `app.tsx`. The existing `gamepad-direction` event continues to fire on direction changes (driving `app.tsx`'s `useEffect` for backward compatibility). A new `gamepad-state` event carries the full analog payload (trigger values, stick position, computed motor speeds, direction). The new `useAnalogControl` hook listens for `gamepad-state` and invokes `ble_send_analog`, which batches three BLE writes (`u<left>#`, `v<right>#`, `<direction>`). Speed computation happens in a new pure-Rust `gamepad/analog.rs` module with unit-testable formulas. The new `AnalogDisplay` component mounts as a sibling in `main.tsx` and reads `analogState` from the extended `useGamepad()` return. See [ARCHITECTURE.md](./ARCHITECTURE.md) for full data flow diagrams.

**Major components:**
1. **`gamepad/analog.rs`** (NEW) — Pure functions for trigger normalization (`((raw + 1.0) / 2.0).clamp(0.0, 1.0)`) and speed computation (differential steering formula). No Tauri dependencies.
2. **`gamepad/mod.rs`** (MODIFIED) — gilrs event loop extended to track `Axis::LeftZ`, `Axis::RightZ`, `Axis::LeftStickX`. Emits `gamepad-state` with change guard (>3 speed delta threshold).
3. **`ble/mod.rs`** (MODIFIED) — Validation relaxed to accept `u<val>#`/`v<val>#` patterns. New `ble_send_analog` command discovers services once and batches three writes.
4. **`hooks/use-analog-control.ts`** (NEW) — Listens for `gamepad-state`, guards against duplicate speeds using `useRef`, invokes `ble_send_analog` on meaningful changes.
5. **`components/analog-display.tsx`** (NEW) — Fixed-position overlay reading `useGamepad().analogState`.

### Critical Pitfalls

Top pitfalls from [PITFALLS.md](./PITFALLS.md), ordered by severity:

1. **Speed protocol not supported by firmware** (CRITICAL) — The entire milestone relies on `u<val>#`/`v<val>#` commands. If the robot runs Project 17 firmware (basic Bluetooth Tank), speed commands are silently ignored. **Prevention:** Phase A verifies on physical hardware first. Fallback: fixed-speed digital control.
2. **Trigger axis range varies by platform** (HIGH) — On macOS vs Steam Deck, the raw axis range from gilrs may differ. The normalization formula assumes -1..1. **Prevention:** Test on Steam Deck hardware, log raw values, adjust normalization if needed.
3. **Double-send race (old + new paths)** (MEDIUM) — `app.tsx` still sends direction commands alongside the new analog path. **Mitigation:** Documented as harmless — the extra direction write is idempotent. Both paths use `WriteType::WithoutResponse`.
4. **Speed-only changes not sent** (MEDIUM) — When direction is constant but speed changes (e.g., 30% → 70% R2), the old path doesn't fire and the new path must catch it. **Mitigation:** Change guard uses `Math.abs(delta) > 3` to detect gradual speed changes.
5. **Backward turn direction error** (MINOR) — Differential steering formula might produce wrong turn bias when reversing. **Mitigation:** `dir_sign` parameter in `compute_motor_output()` inverts the turn offset for reverse. Validate on hardware.

## Implications for Roadmap

Based on combined research, the v2.2 milestone should be structured as 6 phases with a strict gating dependency on hardware verification first.

### Phase 1: Protocol Verification (Gate)
**Rationale:** The single critical risk — if the robot doesn't support speed commands, there's no point building the analog engine. This phase must happen first and blocks all others.
**Delivers:** Confirmed protocol constants (speed range, axis mapping, trigger value range on Steam Deck). Documented fallback plan if speed commands are unsupported.
**Addresses:** Table stakes (R2/L2 analog) — verifies the foundation.
**Avoids:** Pitfall 1 (speed protocol unknown), Pitfall 3 (trigger axis mapping unknown).
**Research flag:** NEEDS PHYSICAL ACCESS. Robot + Steam Deck required. Cannot be simulated.

### Phase 2: Rust Backend (Analog Engine + BLE)
**Rationale:** Once protocol is confirmed, build the core analog computation and BLE plumbing. This is the critical path — frontend depends on gamepad-state events flowing.
**Delivers:** `gamepad/analog.rs` (pure functions + unit tests), `gamepad/mod.rs` modifications (axis tracking + event emission), `ble/mod.rs` updates (relaxed validation + `ble_send_analog`), `lib.rs` and `capabilities/main.json` updates.
**Addresses:** All table stakes features — the backend computation that powers R2/L2 speed + joystick steering.
**Avoids:** Pitfall 2 (race condition — documented as harmless), Pitfall 7 (backward turn — unit test the formula).
**Uses:** btleplug 0.12, gilrs 0.11, serde, tokio (all existing).
**Standard patterns:** Well-documented — pure function module with unit tests, existing BLE write patterns. Skip research-phase.

### Phase 3: Frontend Hooks
**Rationale:** Once `gamepad-state` events are flowing from Rust, wire up the React hooks to consume them. Can proceed in parallel with Phase 4 (UI overlay) after event type is stable.
**Delivers:** `types.ts` additions (`AnalogState` type), `use-gamepad.ts` extension (`analogState` in return), `hooks/use-analog-control.ts` (listens + invokes BLE).
**Addresses:** Core feature — speed commands now reach the robot via the analog pathway.
**Avoids:** Pitfall 4 (speed-only changes — change guard threshold), Pitfall 5 (first F before speed — imperceptible latency), Pitfall 6 (event storm — useRef guard).
**Standard patterns:** Standard Tauri hook pattern `listen()` + `invoke()`. Skip research-phase.

### Phase 4: UI Overlay
**Rationale:** Pure display — no logic dependencies beyond `analogState` being available from `useGamepad()`. Can run in parallel with Phase 3.
**Delivers:** `components/analog-display.tsx`, `main.tsx` sibling mount.
**Addresses:** Feature — live speed/input display (differentiator, low effort, high debugging value).
**Research flag:** Simple. CSS overlay positioning. Skip research-phase.

### Phase 5: Integration Testing
**Rationale:** Full end-to-end test of the analog pipeline without physical hardware (simulated triggers). Catches bugs before Steam Deck validation.
**Delivers:** Unit tests for `compute_motor_output` (edge cases: deadzone, full speed, steering extremes), integration tests for event flow, regression tests ensuring old path still works.
**Avoids:** Pitfall 6 (event flooding — test high-frequency trigger changes), Pitfall 5 (send ordering — test race condition behavior).
**Research flag:** Standard testing patterns. Skip research-phase.

### Phase 6: Steam Deck Hardware Validation
**Rationale:** Final phase — real hardware with real robot. Tune constants based on observed behavior.
**Delivers:** Validated `MIN_SPEED` (motor stall threshold), `TURN_FACTOR` (steering responsiveness), trigger deadzone values. Confirmed working on Steam Deck.
**Addresses:** Production readiness. Tuning the formula constants.
**Research flag:** NEEDS PHYSICAL ACCESS. Steam Deck + robot required.

### Phase Ordering Rationale

- **Phase 1 is mandatory gating.** Without protocol verification, building the analog engine is speculative. The architecture supports graceful fallback (fixed-speed if speed commands unsupported), but the phase structure makes this explicit.
- **Phase 2 is the critical path.** All frontend work (Phases 3, 4) depends on `gamepad-state` events flowing from Rust. Phase A and B could be combined if hardware is available during development.
- **Phases 3 and 4 can parallelize** once the event types are stabilized in Phase 2. The UI overlay has no dependency on the control hook (both read from `useGamepad()`).
- **Phase 6 must be last** because tuning constants without hardware feedback is speculative. The constants `MIN_SPEED` and `TURN_FACTOR` should be easy to tweak at runtime during validation.

### Research Flags

Needs deeper research during planning:
- **Phase 1 (Protocol Verification):** Physical access to robot + Steam Deck required. No substitute.
- **Phase 6 (Hardware Validation):** Physical access required for tuning. The `MIN_SPEED` constant (currently guessed at 30) and `TURN_FACTOR` (guessed at 0.6) need empirical validation.

Standard patterns (skip research-phase for planning, proceed directly to plan-phase):
- **Phase 2:** Rust module with unit tests, existing Tauri command patterns.
- **Phase 3:** Standard Tauri hook pattern (`listen` + `invoke` + `useEffect`).
- **Phase 4:** Simple React component with CSS positioning.
- **Phase 5:** Standard vitest unit tests + integration test patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new dependencies. All libraries verified via existing codebase and official docs (gilrs Axis enum, btleplug API, Tauri IPC). |
| Features | HIGH | Core features well-understood (R2/L2 triggers, differential steering). Speed command protocol sourced from community firmware (MEDIUM confidence on exact protocol format). |
| Architecture | HIGH | Dual-event strategy directly derived from locked app.tsx constraint (verified in AGENTS.md). Data flow diagram based on existing codebase patterns. |
| Pitfalls | HIGH | 7 pitfalls catalogued with specific prevention strategies. Top risk (speed protocol compatibility) has clear gating strategy. Source confidence: HIGH for axis mapping (gilrs docs + SDL HID driver), MEDIUM for firmware protocol. |

**Overall confidence:** HIGH

### Gaps to Address

1. **Speed protocol format confidence is MEDIUM.** The `u<val>#`/`v<val>#` format comes from a community firmware source (Multifunktionel_tank.ino), not from the stock KS0555 firmware documentation. Phase 1 verification is non-negotiable. If the format differs slightly (e.g., `U<val>` without `#`), the `ble_send_analog` write logic will need adjustment but the architecture remains unchanged.
2. **`MIN_SPEED` and `TURN_FACTOR` are guessed values.** 30 and 0.6 respectively were chosen as sensible defaults but must be validated on physical hardware. The architecture makes these easy to change (top-of-file constants in `analog.rs`), and Phase 6 is explicitly reserved for tuning.
3. **Trigger axis range on Steam Deck evdev is inferred, not measured.** The gilrs docs confirm -1..1 range at the gilrs API level, but the evdev-to-SDL mapping on Steam Deck could introduce variations. Phase 1 includes raw value logging to confirm.

## Sources

### Primary (HIGH confidence)
- [Gilrs Axis enum docs](https://docs.rs/gilrs/latest/gilrs/ev/enum.Axis.html) — LeftZ=3, RightZ=6 trigger axis mapping
- [Gilrs Gamepad docs](https://docs.rs/gilrs/latest/gilrs/struct.Gamepad.html) — `axis_data()` returns -1.0..1.0
- [SDL Steam Deck HID driver](https://github.com/libsdl-org/SDL/blob/main/src/joystick/hidapi/SDL_hidapi_steamdeck.c) — Trigger-to-SDL axis mapping verification
- Existing codebase: `app.tsx`, `gamepad/mod.rs`, `ble/mod.rs`, `use-gamepad.ts`, `AGENTS.md` — Current architecture, locked file constraints, IPC patterns

### Secondary (MEDIUM confidence)
- [Keyestudio Multifunktionel_tank.ino](https://github.com/Mowglli/Mini-Tank-Robot-V3/blob/main/Multifunktionel_tank.ino) — `u<val>#`/`v<val>#` speed command protocol (community firmware, may differ from stock KS0555)
- KS0555 Documentation Table of Contents — Project 18 "BT Speed Control Robot" listed (existence of speed control firmware confirmed, but exact protocol not documented)

---
*Research completed: 2026-05-13*
*Ready for roadmap: yes*

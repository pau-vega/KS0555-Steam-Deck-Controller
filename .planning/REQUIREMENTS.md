# Requirements — v2.2 Analog Speed Control

Milestone: **v2.2 Analog Speed Control** (Phases 20–23)
Opened: 2026-05-15
Status: Active — planning complete, no phases executed yet

## Goal

Replace the binary `F | B | L | R | S` command pipeline with an analog one: R2/L2 trigger pressure controls forward/backward speed, left-stick magnitude controls turn speed. The robot firmware already speaks `<dir><pwm>\n` over BT24 serial (PWM range 80–255), so this milestone is entirely on the Tauri side: domain logic, BLE serialization, IPC payload, hooks, and a passive UI indicator.

## Locked decisions

| Decision | Value |
|---|---|
| Firmware status | PWM-capable; source at `~/Documents/arduino-tank-controller/firmware/`. No flashing this milestone. |
| Trigger mapping | R2 → forward speed, L2 → backward speed. Stronger pressure wins on simultaneous press. |
| Turn mapping | Left-stick magnitude `sqrt(x²+y²)` → analog L/R PWM after the 0.15 deadzone. Axis tiebreak unchanged (stronger axis wins). |
| Quantization | 10 buckets after the deadzone → PWM `80, 100, 119, 138, 158, 177, 196, 216, 235, 255`. Below deadzone → `S`. |
| Serial protocol | `"<dir><pwm>\n"` (e.g. `"F138\n"`), `"S\n"` for stop. Write type stays `WriteType::WithoutResponse`. |
| Coalescing key | `(dir, pwm_bucket)`. Heartbeat still based on `compute_trigger_interval` cadence. |
| Backwards compat | `useBluetooth` / `useGamepad` return shapes additive-only per AGENTS.md hook contract. |

## Active requirements

### Protocol & domain (Rust)

- **REQ-SPD-01** — Define `Command` enum in `apps/frontend/src-tauri/src/domain/direction.rs`:
  - `Drive { dir: Direction, pwm: u8 }` where `dir ∈ {F, B, L, R}` and `pwm ∈ 80..=255`
  - `Stop`
  - `Display` impl serializes to the wire format (`"F138\n"`, `"S\n"`).
- **REQ-SPD-02** — `quantize_pressure(pressure: f32) -> Option<u8>` pure function:
  - `pressure <= 0.1` → `None`
  - `0.1 < pressure <= 1.0` → `Some(pwm)` from the 10-bucket table above (clamped to 80..=255)
  - Linear interpolation across buckets, monotonic.
- **REQ-SPD-03** — `ble_send` (`apps/frontend/src-tauri/src/ble/mod.rs:25`):
  - Drop `len == 1` validation.
  - Accept payload matching `^[FBLR]\d{2,3}\n$` or `^S\n$`.
  - Pass through to `BluetoothPort::write` unchanged.

### Gamepad layer (Rust)

- **REQ-SPD-04** — `compute_trigger` (`domain/direction.rs`):
  - Signature → `fn(GamepadInputs) -> (Command, f32, f32)` (pressures retained for heartbeat).
  - Stronger trigger wins on tie (R2 wins exact tie).
  - Below deadzone on both → `Stop`.
- **REQ-SPD-05** — `compute_stick_direction` (`domain/direction.rs`):
  - Signature → `fn(x: f32, y: f32) -> Command`.
  - Below deadzone → `Stop`.
  - Otherwise pick dominant axis (existing tiebreak), `pwm = quantize_pressure(magnitude)` where `magnitude = sqrt(x²+y²).min(1.0)`.
- **REQ-SPD-06** — `gilrs_adapter.rs` coalesce key becomes `(dir, pwm_bucket)`:
  - Re-emit when bucket changes even if `dir` is unchanged.
  - Heartbeat re-emission unchanged (`compute_trigger_interval`).

### IPC contract

- **REQ-SPD-07** — `gamepad-direction` event payload:
  - `{ direction: "F"|"B"|"L"|"R"|"S", pwm: number | null }` — `pwm` is `null` for `S`, else 80..=255.
  - `direction` field preserved verbatim for backwards-compatible consumers.
- **REQ-SPD-08** — `ble_send` command shape:
  - `{ command: string }` where string is the fully encoded line.
  - Frontend (`useBluetooth.send`) is the only producer; validation is the regex from REQ-SPD-03.

### Frontend

- **REQ-SPD-09** — `apps/frontend/src/types.ts`:
  - Keep `Direction = "F" | "B" | "L" | "R" | "S"`.
  - Add `interface Command { direction: Direction; pwm: number | null }`.
- **REQ-SPD-10** — `useBluetooth` (`apps/frontend/src/hooks/use-bluetooth.ts`):
  - `send` accepts `Command` and serializes via shared util (`encodeCommand(cmd) -> string`).
  - Legacy `send("F")` keeps working via an overload that defaults PWM to 150.
  - Return shape unchanged.
- **REQ-SPD-11** — `control-pad.tsx`:
  - Add `<SpeedIndicator pwm={…} dir={…} />` row beneath the d-pad. Pure visual, additive.
  - Hide indicator when `pwm == null` (idle).
  - Existing test snapshots must stay green for the default-PWM-150 path.

### Docs & meta

- **REQ-SPD-12** — `AGENTS.md`:
  - Update IPC contract table (`ble_send` payload + `gamepad-direction` payload).
  - Remove "Arduino firmware is immutable" sentence; replace with the PWM protocol reference.
- **REQ-SPD-13** — `docs/ARCHITECTURE.md`:
  - Rewrite BLE write protocol section (UUID unchanged, payload format updated, mention PWM range and newline terminator).
- **REQ-SPD-14** — meta-tests under `apps/frontend/src/`:
  - `tauri-frontend.test.ts`, `verification-docs.test.ts`, any test that pattern-matches the 5-char protocol assertion — update to the new wire format.

### Validation (deferred)

- **REQ-SPD-15** — Steam Deck + BT24 + robot smoke test:
  - Both triggers + left stick produce visibly variable robot speed.
  - No BLE disconnect during a 10 s full-press.
  - Arduino USB serial monitor shows `F<pwm>` / `B<pwm>` / `L<pwm>` / `R<pwm>` / `S` lines with varying pwm.
  - Folded into VAL-09 follow-up.

## Out of scope

- Right-stick mapping (no defined use).
- Acceleration smoothing / inertia curves (quantization is the only smoothing).
- User-tunable speed presets / rate-limit UI controls (10 buckets hard-coded in code).
- BT24 reconfiguration (already accepts long writes).
- Auto-reconnect, multi-profile, Flathub prep — later milestones.
- Modifying the Arduino firmware itself (already PWM-capable).

## Acceptance gates per phase

| Phase | Gate |
|---|---|
| 20 | `cargo test --manifest-path apps/frontend/src-tauri/Cargo.toml` passes; new `quantize_pressure` + `compute_trigger` + `compute_stick_direction` covered; BLE validation regex tested. |
| 21 | Mock `BluetoothPort` records expected wire-format payloads for all R2/L2/stick scenarios; IPC payload schema verified by test. |
| 22 | `pnpm test` passes; existing `App.test.tsx` dedup test updated to `(dir, pwm)`; `control-pad.test.tsx` snapshot updated additively. |
| 23 | `pnpm lint && pnpm typecheck && pnpm test` clean; AGENTS.md + ARCHITECTURE.md no longer mention the 5-char-only protocol; meta-tests green. |

## Cross-references

- Architecture overview: `docs/ARCHITECTURE.md`
- IPC contract: `AGENTS.md` → "IPC contract" section
- Firmware source: `~/Documents/arduino-tank-controller/firmware/src/main.cpp`
- Roadmap: `.planning/ROADMAP.md`
- Project state: `.planning/STATE.md`
- Prior milestone requirements: `.planning/milestones/v2.0-REQUIREMENTS.md`, `.planning/milestones/v2.1-REQUIREMENTS.md`

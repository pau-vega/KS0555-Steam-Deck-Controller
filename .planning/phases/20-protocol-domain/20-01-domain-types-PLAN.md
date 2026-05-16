---
phase: 20
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/frontend/src-tauri/src/domain/direction.rs
autonomous: true
requirements:
  - REQ-SPD-01
  - REQ-SPD-02
must_haves:
  truths:
    - "`Command::Drive { dir, pwm }` exists and `Command::Stop` exists in `domain::direction`"
    - "`Display` impl writes `\"F138\\n\"` for `Command::Drive { dir: Direction::F, pwm: 138 }` and `\"S\\n\"` for `Command::Stop`"
    - "`quantize_pressure(p)` returns `None` for `p <= 0.1` and `Some(80..=255)` for `0.1 < p <= 1.0`"
    - "`quantize_pressure` is monotonic non-decreasing across `(0.1, 1.0]`"
    - "`quantize_pressure(1.0) == Some(255)` and the first non-`None` bucket is `Some(80)`"
    - "All ten declared bucket values `[80, 100, 119, 138, 158, 177, 196, 216, 235, 255]` are produced for inputs in their declared bucket"
    - "`cargo test --manifest-path apps/frontend/src-tauri/Cargo.toml` passes"
  artifacts:
    - path: "apps/frontend/src-tauri/src/domain/direction.rs"
      provides: "`Command` enum, `Display for Command`, `quantize_pressure`, plus their unit tests"
      contains: "pub enum Command"
  key_links:
    - from: "domain::direction::Command (Drive variant)"
      to: "domain::direction::Direction"
      via: "Drive variant holds Direction"
      pattern: "Drive \\{ dir: Direction"
    - from: "domain::direction::quantize_pressure"
      to: "Command::Drive { pwm }"
      via: "Phase 20-02 uses quantize_pressure to populate Drive.pwm"
      pattern: "quantize_pressure"
---

<objective>
Land the pure-Rust domain primitives for the analog wire protocol. Add the `Command` enum
(`Drive { dir: Direction, pwm: u8 }` and `Stop`) with a `Display` impl that serializes to
the BT24 wire format (`"F138\n"` / `"S\n"`), and add the pure function
`quantize_pressure(f32) -> Option<u8>` that maps `(0.1, 1.0]` to one of ten PWM buckets
in `80..=255` and `<= 0.1` to `None`. Cover all of it with unit tests. No callers are
rewired in this plan — `compute_trigger` and `compute_stick_direction` remain unchanged
here (Plan 20-02 handles those).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@apps/frontend/src-tauri/src/domain/direction.rs
@CLAUDE.md

Existing `Direction` enum, `DEADZONE = 0.15`, `TRIGGER_THRESHOLD = 0.1`, and all
existing functions stay intact. This plan is purely additive to
`domain/direction.rs`: a new `Command` enum, a new `Display` impl for it, and a new
`quantize_pressure` function. No imports outside `std` are introduced; this module
remains pure-Rust per the file header comment.

Phase 20 must NOT touch `gilrs_adapter.rs`, `gamepad/mod.rs`, frontend code, docs, or
meta-tests. REQ-SPD-06 is only partially addressed across this phase — only the
domain-side functions ship here. The `gilrs_adapter.rs` rewrite is Phase 21.

Bucket table (linear-bucket interpolation across the inclusive open-low / closed-high
interval `(0.1, 1.0]`):
- buckets = `[80, 100, 119, 138, 158, 177, 196, 216, 235, 255]` (10 values, monotonic,
  all within `80..=255`).
- The interval `(0.1, 1.0]` is partitioned into 10 contiguous sub-intervals of width
  `0.09` each: `(0.1, 0.19]`, `(0.19, 0.28]`, ..., `(0.91, 1.0]`. The k-th sub-interval
  (k = 0..=9) maps to `buckets[k]`. `pressure = 1.0` falls in the last bucket → `255`.
  Inputs above `1.0` clamp to `255`; inputs `<= 0.1` return `None`. NaN is treated as
  below the deadzone (`None`).
</context>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| caller (gilrs adapter, future) → `quantize_pressure` | `f32` from gilrs trigger/stick axis — may be out of range, NaN, or denormal |
| caller (future) → `Command::Display` | `pwm: u8` is type-bounded, but logical range is `80..=255` (a u8 outside that range is a constructor bug) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-20-01 | Tampering | `quantize_pressure(f32)` receives `pressure > 1.0` or negative or NaN | mitigate | Clamp `pressure` to `[0.0, 1.0]` via `pressure.max(0.0).min(1.0)`; `NaN.max(0.0)` yields `0.0` so NaN falls below the deadzone and returns `None`. Add explicit tests for `f32::NAN`, `f32::INFINITY`, `-1.0`, and `2.0`. |
| T-20-02 | Denial of Service | Pressure quantization panics on edge input | mitigate | Function is total: no `unwrap`, no array indexing without bounds check, no division by an input-derived value. Returns `Option<u8>` instead of panicking on out-of-range. Index into the 10-element bucket array uses a value clamped to `0..=9`. |
| T-20-03 | Information Disclosure | `Display for Command` accidentally serializes more than wire format expects (e.g. debug formatting) | mitigate | `Display` implementation uses `write!(f, "{}{}\n", dir.as_char(), pwm)` for `Drive` and `write!(f, "S\n")` for `Stop` — no debug formatting, no extra whitespace. Verified by exact-string assertions in unit tests. |
</threat_model>

<tasks>

<task type="auto">
  <name>Task 1: Add Command enum and Display impl in domain/direction.rs</name>
  <files>apps/frontend/src-tauri/src/domain/direction.rs</files>
  <read_first>
    @apps/frontend/src-tauri/src/domain/direction.rs (lines 1–66 — module header, constants, Direction enum, Direction methods, GamepadInputs)
  </read_first>
  <action>
    In `apps/frontend/src-tauri/src/domain/direction.rs`, append after the existing
    `Direction` enum (after line 38 where `impl Direction` ends, before `DpadButtons`):

    1. Define `pub enum Command { Drive { dir: Direction, pwm: u8 }, Stop }`. Derive
       `Debug`, `Clone`, `Copy`, `PartialEq`, `Eq`. Do NOT derive `Default` (no
       meaningful default for a command).

    2. Implement `std::fmt::Display for Command`:
       - `Command::Drive { dir, pwm }` → write `"{dir.as_char()}{pwm}\n"`.
         Reuse the existing `Direction::as_char` method — do NOT add a separate
         match here.
       - `Command::Stop` → write `"S\n"`.
       Use `write!(f, ...)` directly. No allocation.

    3. Do not modify any existing function in this file — this task is purely
       additive. Do not touch `compute_trigger`, `compute_stick_direction`,
       `compute_combined`, or any other existing function (Plan 20-02 handles
       signature changes).

    4. Add `use std::fmt;` at the top of the file (after the module-level doc
       comment) if not present.
  </action>
  <acceptance_criteria>
    - `grep -n "pub enum Command" apps/frontend/src-tauri/src/domain/direction.rs` matches exactly one line.
    - `grep -n "Drive *{ *dir: *Direction, *pwm: *u8" apps/frontend/src-tauri/src/domain/direction.rs` matches one line (the variant declaration).
    - `grep -c "Command::Stop" apps/frontend/src-tauri/src/domain/direction.rs` ≥ 1 (variant appears in source).
    - `grep -n "impl fmt::Display for Command\\|impl std::fmt::Display for Command" apps/frontend/src-tauri/src/domain/direction.rs` matches exactly one line.
    - `cargo build --manifest-path apps/frontend/src-tauri/Cargo.toml` succeeds (no compile errors introduced).
  </acceptance_criteria>
  <verify>
    <automated>cargo build --manifest-path apps/frontend/src-tauri/Cargo.toml 2>&amp;1 | tail -20</automated>
  </verify>
  <done>
    `Command` enum with `Drive` and `Stop` variants is declared in
    `domain/direction.rs`. `Display for Command` is implemented and compiles. No
    existing function in the file has been touched.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add quantize_pressure pure function</name>
  <files>apps/frontend/src-tauri/src/domain/direction.rs</files>
  <read_first>
    @apps/frontend/src-tauri/src/domain/direction.rs (lines 1–10 — `TRIGGER_THRESHOLD = 0.1` constant; reuse this for the deadzone, do NOT introduce a new literal)
  </read_first>
  <action>
    In `apps/frontend/src-tauri/src/domain/direction.rs`, add after the `Command`
    declaration from Task 1 (still before `DpadButtons`):

    1. Define `pub fn quantize_pressure(pressure: f32) -> Option<u8>`.

    2. Body, in order:
       a. Clamp input: `let p = pressure.max(0.0).min(1.0)`. This collapses NaN,
          negatives, and values > 1.0 into `[0.0, 1.0]` (NaN → 0.0 via `f32::max`).
       b. Below-or-at deadzone check: if `p <= TRIGGER_THRESHOLD` (i.e. `<= 0.1`),
          return `None`. Use the existing module constant — do NOT hard-code `0.1`.
       c. Compute the bucket index: there are 10 buckets uniformly partitioning
          `(0.1, 1.0]` into widths of `(1.0 - 0.1) / 10 = 0.09`. Compute
          `let idx = (((p - TRIGGER_THRESHOLD) / 0.09).ceil() as i32 - 1).clamp(0, 9) as usize`.
          The `ceil` then `- 1` formulation places each closed-upper boundary
          (0.19, 0.28, …, 1.0) at the lower bucket index and the open-lower
          boundary (just above 0.1) at index 0. Verify boundary behavior with the
          unit tests in Task 3.
       d. Index into a const-defined bucket table:
          `const BUCKETS: [u8; 10] = [80, 100, 119, 138, 158, 177, 196, 216, 235, 255];`.
          Place this `const` at module scope (above `quantize_pressure`) so it can
          be referenced by tests if needed.
       e. Return `Some(BUCKETS[idx])`.

    3. Do NOT use `unwrap`, `expect`, or any panicking indexing path. The clamp
       guarantees `idx ∈ 0..=9`.

    4. Do not modify any existing function. Purely additive.
  </action>
  <acceptance_criteria>
    - `grep -n "pub fn quantize_pressure" apps/frontend/src-tauri/src/domain/direction.rs` matches exactly one line.
    - `grep -n "const BUCKETS" apps/frontend/src-tauri/src/domain/direction.rs` matches one line with the exact array literal `[80, 100, 119, 138, 158, 177, 196, 216, 235, 255]`.
    - No occurrence of `.unwrap()` or `.expect(` is introduced inside `quantize_pressure` (`grep -A 20 "fn quantize_pressure" apps/frontend/src-tauri/src/domain/direction.rs | grep -E "unwrap\\(\\)|expect\\("` returns no matches).
    - `cargo build --manifest-path apps/frontend/src-tauri/Cargo.toml` succeeds.
  </acceptance_criteria>
  <verify>
    <automated>cargo build --manifest-path apps/frontend/src-tauri/Cargo.toml 2>&amp;1 | tail -20</automated>
  </verify>
  <done>
    `quantize_pressure(f32) -> Option<u8>` exists in `domain/direction.rs`, references
    the shared `TRIGGER_THRESHOLD` constant, uses a module-level `BUCKETS` array of
    the ten declared values, contains no panicking paths, and compiles.
  </done>
</task>

<task type="auto">
  <name>Task 3: Unit tests for Command Display and quantize_pressure</name>
  <files>apps/frontend/src-tauri/src/domain/direction.rs</files>
  <read_first>
    @apps/frontend/src-tauri/src/domain/direction.rs (lines 200–320 — existing `#[cfg(test)] mod tests` block; new tests append inside the same module so `use super::*` already covers `Command`, `quantize_pressure`, `Direction`)
  </read_first>
  <action>
    Append the following test functions inside the existing `mod tests` block in
    `domain/direction.rs`. Do not create a separate test module; reuse the one at
    the bottom of the file.

    Tests for `Command::Display` (REQ-SPD-01):
    1. `command_display_forward_138` — `format!("{}", Command::Drive { dir: Direction::F, pwm: 138 })` equals `"F138\n"` (exact string with trailing newline).
    2. `command_display_all_directions_minimum_pwm` — for each of F, B, L, R, formatting `Drive { dir, pwm: 80 }` produces `"F80\n"`, `"B80\n"`, `"L80\n"`, `"R80\n"` respectively.
    3. `command_display_all_directions_max_pwm` — same iteration with `pwm: 255` produces `"F255\n"`, `"B255\n"`, `"L255\n"`, `"R255\n"`.
    4. `command_display_stop` — `format!("{}", Command::Stop)` equals `"S\n"`. No `pwm` digits.

    Tests for `quantize_pressure` (REQ-SPD-02):
    5. `quantize_pressure_below_deadzone_returns_none` — for inputs `0.0`, `0.05`, `0.1` (boundary): all return `None`.
    6. `quantize_pressure_just_above_deadzone_returns_first_bucket` — `quantize_pressure(0.10001)` returns `Some(80)`; `quantize_pressure(0.15)` returns `Some(80)`; `quantize_pressure(0.19)` returns `Some(80)`.
    7. `quantize_pressure_full_press_returns_max` — `quantize_pressure(1.0)` returns `Some(255)`. `quantize_pressure(0.92)` returns `Some(255)` (last bucket entered at 0.91 open-low boundary).
    8. `quantize_pressure_all_ten_buckets_produced` — assert that the set of values produced for inputs `[0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.92, 1.0]` covers exactly `[80, 100, 119, 138, 158, 177, 196, 216, 235, 255]` in some monotonic order. Use a `Vec<u8>` and assert equality to `vec![80, 100, 119, 138, 158, 177, 196, 216, 235, 255]`.
    9. `quantize_pressure_monotonic` — generate inputs from `0.11` to `1.0` in steps of `0.01` (use `(11..=100).map(|i| i as f32 / 100.0)`), call `quantize_pressure` on each, and assert each returned `Some(v)` is `>=` the previous returned value. Skip `None` results.
    10. `quantize_pressure_clamps_above_one` — `quantize_pressure(1.5)`, `quantize_pressure(2.0)`, `quantize_pressure(f32::INFINITY)` all return `Some(255)`.
    11. `quantize_pressure_handles_invalid_inputs` — `quantize_pressure(-0.5)` returns `None`; `quantize_pressure(f32::NEG_INFINITY)` returns `None`; `quantize_pressure(f32::NAN)` returns `None` (NaN is below deadzone after `max(0.0)` collapse).

    Style notes:
    - Use `assert_eq!` with the exact string literal for Display tests (no
      `contains`, no regex).
    - For Vec ordering test, do NOT sort the produced vec before comparison — the
      monotonic property is part of what's being asserted.
    - Tests use only `std`; no new dev-dependencies.
  </action>
  <acceptance_criteria>
    - `grep -c "fn command_display_\\|fn quantize_pressure_" apps/frontend/src-tauri/src/domain/direction.rs` ≥ 11.
    - `cargo test --manifest-path apps/frontend/src-tauri/Cargo.toml --lib domain::direction::tests` exits 0 with all eleven new test names appearing in the output.
    - Running the full test suite still passes: `cargo test --manifest-path apps/frontend/src-tauri/Cargo.toml`.
  </acceptance_criteria>
  <verify>
    <automated>cargo test --manifest-path apps/frontend/src-tauri/Cargo.toml --lib -- domain::direction::tests 2>&amp;1 | tail -40</automated>
  </verify>
  <done>
    Eleven new tests (four for `Command::Display`, seven for `quantize_pressure`)
    pass. The pre-existing tests in the same module still pass.
  </done>
</task>

</tasks>

<verification>
- `cargo build --manifest-path apps/frontend/src-tauri/Cargo.toml` succeeds.
- `cargo test --manifest-path apps/frontend/src-tauri/Cargo.toml` passes (all pre-existing + 11 new tests).
- `cargo clippy --manifest-path apps/frontend/src-tauri/Cargo.toml --all-targets -- -D warnings` is clean for `domain/direction.rs`.
- `cargo fmt --manifest-path apps/frontend/src-tauri/Cargo.toml -- --check` reports no diff.
- `gilrs_adapter.rs` is unchanged: `git diff --name-only apps/frontend/src-tauri/src/adapters/gilrs_adapter.rs` is empty.
- `ble/mod.rs` is unchanged in this plan: `git diff --name-only apps/frontend/src-tauri/src/ble/mod.rs` is empty.
</verification>

<success_criteria>
- `pub enum Command { Drive { dir: Direction, pwm: u8 }, Stop }` is declared with `Debug, Clone, Copy, PartialEq, Eq` derives.
- `impl Display for Command` produces exactly `"F138\n"` / `"S\n"`-shaped output.
- `quantize_pressure(f32) -> Option<u8>` returns `None` for `pressure <= 0.1`, `Some(v)` with `v ∈ {80, 100, 119, 138, 158, 177, 196, 216, 235, 255}` for `0.1 < pressure <= 1.0`, monotonic in `pressure`, clamps inputs above `1.0` to `Some(255)`, and rejects NaN/negative as `None`.
- All 11 new unit tests pass. No file outside the declared `files_modified` is touched.
</success_criteria>

<output>
After completion, create `.planning/phases/20-protocol-domain/20-01-SUMMARY.md` capturing:
- New public items added (`Command`, `Display for Command`, `quantize_pressure`, `BUCKETS`)
- Bucket table and deadzone rationale
- Test names added
- Confirmation that `gilrs_adapter.rs` was not modified
</output>

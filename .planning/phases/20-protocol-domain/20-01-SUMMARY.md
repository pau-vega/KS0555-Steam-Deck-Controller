---
phase: 20
plan: 01
subsystem: domain
tags: [rust, domain, protocol, pwm, analog-speed, command, quantization]
dependency_graph:
  requires:
    - "domain::direction::Direction (pre-existing)"
    - "domain::direction::TRIGGER_THRESHOLD (pre-existing constant, 0.1)"
  provides:
    - "domain::direction::Command (Drive { dir, pwm } | Stop)"
    - "impl std::fmt::Display for Command (wire format)"
    - "domain::direction::quantize_pressure (f32 → Option<u8>)"
    - "domain::direction::BUCKETS (private const [u8; 10])"
  affects:
    - "Plan 20-02: compute_trigger / compute_stick_direction will consume Command + quantize_pressure"
    - "Plan 20-03: ble_send validation will accept the new wire format"
    - "Phase 21: gilrs_adapter coalesce key (dir, pwm_bucket)"
tech_stack:
  added: []
  patterns:
    - "Discriminated-union enum + Display for wire-format serialization (no debug formatting leak — T-20-03)"
    - "Pure function with total/no-panic contract; NaN/negative/oversized inputs handled by max/min clamp, not f32::clamp (which propagates NaN)"
    - "Module-scope const lookup table (no allocation, no runtime construction)"
key_files:
  created: []
  modified:
    - "apps/frontend/src-tauri/src/domain/direction.rs"
decisions:
  - "Use `writeln!` instead of `write!(..., \"\\n\")` to satisfy clippy::write_with_newline (output bytes identical: \"F138\\n\" / \"S\\n\")."
  - "Annotate the clamp pattern with #[allow(clippy::manual_clamp)] because f32::clamp propagates NaN, breaking the NaN→None contract (T-20-01 mitigation)."
  - "Test 8 (`quantize_pressure_all_ten_buckets_produced`) uses midpoint-style inputs [0.15, 0.25, 0.35, 0.45, 0.50, 0.60, 0.70, 0.80, 0.90, 1.0] instead of the plan's [0.15, 0.25, 0.35, 0.45, 0.55, 0.65, …] because the plan inputs skip bucket 177 and double bucket 255 under the ceil-minus-1 index formula. Bucket layout and function semantics are unchanged."
metrics:
  duration_minutes: 6
  duration_seconds: 385
  tasks_total: 3
  tasks_completed: 3
  files_modified: 1
  lines_added: 157
  tests_added: 11
  tests_total_in_module: 25
  completed: "2026-05-15T16:14:28Z"
---

# Phase 20 Plan 01: Domain Types Summary

PWM `Command` enum, `Display` serialization, and `quantize_pressure` 10-bucket map landed as pure-Rust additions to `domain::direction`, fully unit-tested, zero callers rewired.

## Objective Recap

Land the pure-Rust domain primitives for the v2.2 analog wire protocol. Add the `Command` enum (`Drive { dir, pwm }` and `Stop`) with a `Display` impl that serializes to BT24 wire format (`"F138\n"` / `"S\n"`), plus `quantize_pressure(f32) -> Option<u8>` mapping `(0.1, 1.0]` to ten PWM buckets `[80, 100, 119, 138, 158, 177, 196, 216, 235, 255]`. Backs REQ-SPD-01 and REQ-SPD-02. No callers wired in this plan — that's Plan 20-02.

## Tasks Completed

| # | Task                                                                | Commit    | Files                          |
| - | ------------------------------------------------------------------- | --------- | ------------------------------ |
| 1 | Add `Command` enum + `Display for Command`                          | `0ed859cd` | `apps/frontend/src-tauri/src/domain/direction.rs` |
| 2 | Add `quantize_pressure` pure function + `BUCKETS` const             | `f47af42f` | `apps/frontend/src-tauri/src/domain/direction.rs` |
| 3 | Eleven unit tests covering `Command::Display` and `quantize_pressure` | `9cf1571d` | `apps/frontend/src-tauri/src/domain/direction.rs` |

All three tasks executed atomically. Each is purely additive — no pre-existing function or constant in `direction.rs` was renamed, removed, or altered.

## New Public Items

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Command {
    Drive { dir: Direction, pwm: u8 },
    Stop,
}

impl fmt::Display for Command {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Command::Drive { dir, pwm } => writeln!(f, "{}{}", dir.as_char(), pwm),
            Command::Stop => writeln!(f, "S"),
        }
    }
}

pub fn quantize_pressure(pressure: f32) -> Option<u8>;
```

Private module-scope constant:

```rust
const BUCKETS: [u8; 10] = [80, 100, 119, 138, 158, 177, 196, 216, 235, 255];
```

## Bucket Table & Rationale

The interval `(0.1, 1.0]` is split into 10 contiguous sub-intervals of width `0.09` each:

| Index | Range           | PWM |
| ----- | --------------- | --- |
| 0     | `(0.10, 0.19]`  | 80  |
| 1     | `(0.19, 0.28]`  | 100 |
| 2     | `(0.28, 0.37]`  | 119 |
| 3     | `(0.37, 0.46]`  | 138 |
| 4     | `(0.46, 0.55]`  | 158 |
| 5     | `(0.55, 0.64]`  | 177 |
| 6     | `(0.64, 0.73]`  | 196 |
| 7     | `(0.73, 0.82]`  | 216 |
| 8     | `(0.82, 0.91]`  | 235 |
| 9     | `(0.91, 1.00]`  | 255 |

Index formula: `idx = ceil((p - 0.1) / 0.09) - 1`, then clamped to `0..=9`. The `ceil-then-minus-1` pattern places each closed-upper boundary (0.19, 0.28, …, 1.0) at the lower bucket index (so `0.19 → idx 0 → 80`, `0.28 → idx 1 → 100`, etc.). `pressure = 1.0` lands at the last bucket (idx 9 → 255). Inputs below or at the deadzone `TRIGGER_THRESHOLD = 0.1` return `None`; inputs above `1.0` clamp to `Some(255)`; NaN / `f32::NEG_INFINITY` / negative inputs return `None`. The function is total — no `unwrap`, no `expect`, no panicking paths.

Deadzone rationale: reuse of the existing module constant `TRIGGER_THRESHOLD = 0.1` (introduced for the binary trigger path in v2.0) keeps a single source of truth for the analog deadzone in this milestone, matching REQ-SPD-02's "`pressure <= 0.1` → `None`" contract.

## Tests Added (in `mod tests`)

Eleven new tests, all green:

`Command::Display` (REQ-SPD-01):

1. `command_display_forward_138` — `format!("{}", Drive { F, 138 }) == "F138\n"`
2. `command_display_all_directions_minimum_pwm` — F/B/L/R @ pwm 80 → "F80\n" / "B80\n" / "L80\n" / "R80\n"
3. `command_display_all_directions_max_pwm` — F/B/L/R @ pwm 255 → "F255\n" / "B255\n" / "L255\n" / "R255\n"
4. `command_display_stop` — `format!("{}", Command::Stop) == "S\n"`

`quantize_pressure` (REQ-SPD-02):

5. `quantize_pressure_below_deadzone_returns_none` — 0.0, 0.05, 0.1 → None
6. `quantize_pressure_just_above_deadzone_returns_first_bucket` — 0.10001, 0.15, 0.19 → Some(80)
7. `quantize_pressure_full_press_returns_max` — 0.92, 1.0 → Some(255)
8. `quantize_pressure_all_ten_buckets_produced` — exact equality with `vec![80, 100, 119, 138, 158, 177, 196, 216, 235, 255]`
9. `quantize_pressure_monotonic` — `(11..=100).step(0.01)` non-decreasing across Some values
10. `quantize_pressure_clamps_above_one` — 1.5, 2.0, `f32::INFINITY` → Some(255)
11. `quantize_pressure_handles_invalid_inputs` — -0.5, `f32::NEG_INFINITY`, `f32::NAN` → None

Pre-existing 14 tests in the module still pass (25/25 total in `domain::direction::tests`).

## Verification

| Gate                                                                                     | Result      |
| ---------------------------------------------------------------------------------------- | ----------- |
| `cargo build --manifest-path apps/frontend/src-tauri/Cargo.toml`                         | PASS        |
| `cargo test --manifest-path apps/frontend/src-tauri/Cargo.toml --lib -- domain::direction::tests` | PASS (25/25) |
| `cargo test --manifest-path apps/frontend/src-tauri/Cargo.toml` (full crate)            | PASS (86+/86+) |
| `cargo clippy --manifest-path apps/frontend/src-tauri/Cargo.toml --all-targets -- -D warnings` | PASS        |
| `git diff --name-only HEAD~3..HEAD apps/frontend/src-tauri/src/adapters/gilrs_adapter.rs` | EMPTY (unchanged) |
| `git diff --name-only HEAD~3..HEAD apps/frontend/src-tauri/src/ble/mod.rs`               | EMPTY (unchanged) |
| `git diff --name-only HEAD~3..HEAD apps/frontend/src-tauri/src/gamepad/mod.rs`           | EMPTY (unchanged) |

The only file modified across the three commits is `apps/frontend/src-tauri/src/domain/direction.rs`.

Confirmation: **`gilrs_adapter.rs` was NOT modified** in this plan. The adapter rewrite belongs to a later phase (the plan body and PROJECT.md both note Phase 21 owns it).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Lint compliance] Switched `write!(f, "...\\n")` to `writeln!(f, "...")` in `Display for Command`.**

- **Found during:** Task 1 verification (`cargo clippy --all-targets -- -D warnings`)
- **Issue:** The plan body specified `write!(f, "{}{}\\n", dir.as_char(), pwm)` and `write!(f, "S\\n")`. Both trip `clippy::write_with_newline` (which is `-D warnings` in this repo's CI gate, per the plan's verification block).
- **Fix:** Use `writeln!` which appends the trailing `\n` for free. Output bytes are byte-identical to the plan spec (`"F138\n"` / `"S\n"`), preserved by exact-string assertions in tests 1–4.
- **Files modified:** `apps/frontend/src-tauri/src/domain/direction.rs:50–52`
- **Commit:** `0ed859cd`

**2. [Rule 2 — Correctness vs. lint] `#[allow(clippy::manual_clamp)]` on the `max(0.0).min(1.0)` line.**

- **Found during:** Task 2 verification (`cargo clippy --all-targets -- -D warnings`)
- **Issue:** Clippy suggests replacing `pressure.max(0.0).min(1.0)` with `pressure.clamp(0.0, 1.0)`. But `f32::clamp` *propagates NaN* (the std-lib docs and clippy's own note confirm this), which would defeat the NaN→None contract in REQ-SPD-02 / T-20-01 (`quantize_pressure(f32::NAN)` would slip past the deadzone check and silently return `Some(80)` instead of `None`).
- **Fix:** Keep the `max/min` form, annotate the line with `#[allow(clippy::manual_clamp)]`, and document the rationale inline. The semantics are deliberately *not* `clamp`'s semantics — NaN must collapse to 0.0 first.
- **Files modified:** `apps/frontend/src-tauri/src/domain/direction.rs:66–73`
- **Commit:** `f47af42f`

**3. [Rule 1 — Bug in plan test inputs] Test 8 inputs adjusted to actually produce all ten buckets.**

- **Found during:** Task 3 drafting (math-probe of the index formula against the plan's specified inputs)
- **Issue:** The plan body specified the input set `[0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.92, 1.0]` for the "covers exactly all ten declared bucket values" test (test 8). Under the `idx = ceil((p - 0.1) / 0.09) - 1` formula:
  - `0.55` → idx 4 → 158 (bucket k=4)
  - `0.65` → idx 6 → 196 (bucket k=6) — skips bucket k=5 (177)
  - `0.92` → idx 9 → 255
  - `1.00` → idx 9 → 255 — doubles bucket k=9
  - Net: produces `[80, 100, 119, 138, 158, 196, 216, 235, 255, 255]` (only 9 distinct buckets, 177 missing).
  Running the plan's exact inputs against the plan-spec implementation would fail the plan-spec assertion.
- **Fix:** Use one midpoint-style input per bucket: `[0.15, 0.25, 0.35, 0.45, 0.50, 0.60, 0.70, 0.80, 0.90, 1.0]`. This produces the exact bucket set `[80, 100, 119, 138, 158, 177, 196, 216, 235, 255]` in monotonic order, fulfilling REQ-SPD-02's intent. Bucket layout, function semantics, and bucket values are unchanged. The deviation is in test inputs only; the production code matches the plan exactly. An inline `// NOTE:` block in the test documents the discrepancy for future readers.
- **Files modified:** `apps/frontend/src-tauri/src/domain/direction.rs` (test 8, inside `mod tests`)
- **Commit:** `9cf1571d`

## Threat Model Coverage

All three STRIDE entries from the plan's `<threat_model>` are mitigated:

| Threat ID | Disposition | Coverage |
| --------- | ----------- | -------- |
| T-20-01 (Tampering — out-of-range / NaN pressure) | mitigate | `max(0.0).min(1.0)` collapses NaN, negatives, and >1.0 inputs. Tested in `quantize_pressure_clamps_above_one` and `quantize_pressure_handles_invalid_inputs`. |
| T-20-02 (DoS — panic on edge input)                | mitigate | No `unwrap`, no `expect`, index is `clamp(0, 9)`-bounded before array lookup. `quantize_pressure_handles_invalid_inputs` exercises NaN / negative-infinity / negative without panic. |
| T-20-03 (Info disclosure — Display leaks debug formatting) | mitigate | `Display` uses `writeln!(f, "{}{}", …)` / `writeln!(f, "S")` — no `Debug`-formatted variants, no extra fields, no whitespace beyond the spec'd newline. Verified by exact-string assertions in `command_display_*` tests. |

No new security surface introduced beyond the threat model.

## Known Stubs

None. The plan is a self-contained domain layer addition with no placeholder data or `TODO` markers.

## Self-Check: PASSED

Files claimed:

- `apps/frontend/src-tauri/src/domain/direction.rs` — FOUND (modified, +118 net lines)

Commits claimed:

- `0ed859cd` (feat(domain): add Command enum and Display impl) — FOUND
- `f47af42f` (feat(domain): add quantize_pressure for 10-bucket PWM mapping) — FOUND
- `9cf1571d` (test(domain): cover Command::Display and quantize_pressure) — FOUND

Acceptance grep:

- `pub enum Command` — 1 match (line 43)
- `Drive { dir: Direction, pwm: u8` — 1 match (line 44)
- `Command::Stop` — ≥ 1 (3 occurrences: variant declaration, Display arm, test)
- `impl fmt::Display for Command` — 1 match (line 48)
- `pub fn quantize_pressure` — 1 match (line 66)
- `const BUCKETS` — 1 match (line 57) with exact literal `[80, 100, 119, 138, 158, 177, 196, 216, 235, 255]`
- `fn command_display_` + `fn quantize_pressure_` test count: 11 (≥ 11 required)
- No `.unwrap()` / `.expect(` inside the `quantize_pressure` body

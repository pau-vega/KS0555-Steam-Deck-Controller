---
phase: 20
plan: 02
subsystem: domain
tags: [rust, domain, protocol, pwm, analog-speed, command, gamepad, additive]
dependency_graph:
  requires:
    - "domain::direction::Command (from plan 20-01)"
    - "domain::direction::quantize_pressure (from plan 20-01)"
    - "domain::direction::Direction (pre-existing)"
    - "domain::direction::DEADZONE = 0.15 (pre-existing)"
    - "domain::direction::TRIGGER_THRESHOLD = 0.1 (pre-existing)"
  provides:
    - "domain::direction::compute_trigger_command(&GamepadInputs) -> (Command, f32, f32)"
    - "domain::direction::compute_stick_command(f32, f32) -> Command"
  affects:
    - "Phase 21: gilrs_adapter.rs will rewire to call _command variants (NOT in this plan)"
    - "Phase 21: legacy compute_trigger / compute_stick_direction get retired in cutover commit"
tech_stack:
  added: []
  patterns:
    - "Additive-only domain extension: new fns live alongside the legacy fns until Phase 21 cutover"
    - "Non-finite guard on stick axes (NaN/INF → Stop) because NaN comparisons against deadzone return false per IEEE-754"
    - "R2-wins-tie semantics replicated verbatim from compute_trigger to keep heartbeat cadence intact"
key_files:
  created: []
  modified:
    - "apps/frontend/src-tauri/src/domain/direction.rs"
decisions:
  - "compute_trigger_command takes no threshold parameter — it uses module-level TRIGGER_THRESHOLD directly (REQ-SPD-04 locks the deadzone in v2.2)."
  - "compute_stick_command takes no deadzone parameter — it uses module-level DEADZONE directly (REQ-SPD-05 locks the deadzone in v2.2)."
  - "Magnitude clamp uses `(x*x + y*y).sqrt().min(1.0)` (not `f32::clamp`) so (0.9, 0.9) safely yields pwm=255 without surprising NaN propagation."
  - "Legacy compute_trigger and compute_stick_direction preserved byte-for-byte — call-site rewiring is Phase 21 territory per REQ-SPD-06 partial-scope note."
metrics:
  duration_minutes: 12
  tasks_total: 3
  tasks_completed: 3
  files_modified: 1
  lines_added: 327
  tests_added: 19
  tests_total_in_module: 44
  completed: "2026-05-15T16:46:25Z"
---

# Phase 20 Plan 02: Gamepad Domain Functions Summary

Analog `Command`-returning gamepad-domain functions (`compute_trigger_command`, `compute_stick_command`) landed alongside the legacy `Direction`-returning ones, fully unit-tested, with `gilrs_adapter.rs` untouched per the partial-scope contract.

## Objective Recap

Add `compute_trigger_command(&GamepadInputs) -> (Command, f32, f32)` and `compute_stick_command(f32, f32) -> Command` to `apps/frontend/src-tauri/src/domain/direction.rs` so Phase 21 can rewire `gilrs_adapter.rs` to the analog API without touching the adapter in this phase. Both functions consume `quantize_pressure` and `Command` from plan 20-01; both leave the pre-existing `compute_trigger`, `compute_stick_direction`, `compute_combined`, `compute_dpad_or_stick`, `lateral_only`, `is_dpad_active`, `is_stick_active`, and `compute_trigger_interval` byte-identical so the existing adapter continues to compile unmodified.

## Tasks Completed

| # | Task | Commit | Files |
| - | - | - | - |
| 1 | Add `compute_trigger_command` in `domain/direction.rs` | `4c441481` | `apps/frontend/src-tauri/src/domain/direction.rs` |
| 2 | Add `compute_stick_command` in `domain/direction.rs` | `2194d2ee` | `apps/frontend/src-tauri/src/domain/direction.rs` |
| 3 | Nineteen unit tests for both functions | `81394c88` | `apps/frontend/src-tauri/src/domain/direction.rs` |

All three tasks executed atomically. Each commit is purely additive — no pre-existing function, constant, or test in `direction.rs` was renamed, removed, or altered.

## New Public Items

```rust
pub fn compute_trigger_command(inputs: &GamepadInputs) -> (Command, f32, f32);
pub fn compute_stick_command(x: f32, y: f32) -> Command;
```

### `compute_trigger_command` — REQ-SPD-04

- Mirrors `compute_trigger`'s pressure derivation and digital-button fallback exactly.
- Uses module-level `TRIGGER_THRESHOLD = 0.1`; no parameter.
- R2 wins exact tie (`r2_eff > 0.0 && r2_eff >= l2_eff` → `Direction::F`).
- `pwm = quantize_pressure(max(r2_eff, l2_eff))`; if `None`, returns `Command::Stop`.
- Tuple positions 2/3 are the **same effective pressures** the legacy function returns, so when Phase 21 cuts over, the adapter's heartbeat cadence (`compute_trigger_interval(pressure, …)`) remains identical.

### `compute_stick_command` — REQ-SPD-05

- Uses module-level `DEADZONE = 0.15`; no parameter.
- Finite guard (T-20-04): `!x.is_finite() || !y.is_finite()` → `Command::Stop`. Required because `NaN.abs() < DEADZONE` is `false` in IEEE-754, which would otherwise let NaN slip past the deadzone gate.
- Per-axis deadzone gate: `abs_x < DEADZONE && abs_y < DEADZONE` → `Command::Stop`.
- Axis tiebreak identical to legacy: `abs_y > abs_x` picks y (negative → `F`, positive → `B`); else x (negative → `L`, non-negative → `R`).
- Magnitude `m = (x * x + y * y).sqrt().min(1.0)`. `quantize_pressure(m)` is `None` → `Command::Stop`; `Some(pwm)` → `Command::Drive { dir, pwm }`.

## Legacy Functions — Byte-Identical

Verified via `grep`:

```text
107:pub fn compute_stick_direction(x: f32, y: f32, deadzone: f32) -> Direction {
223:pub fn compute_trigger(inputs: &GamepadInputs, threshold: f32) -> (Direction, f32, f32) {
```

Both legacy signatures and bodies are unchanged. `compute_combined`, `compute_dpad_or_stick`, `lateral_only`, `is_dpad_active`, `is_stick_active`, and `compute_trigger_interval` are also untouched. `apps/frontend/src-tauri/src/adapters/gilrs_adapter.rs` remains identical to the file at the start of Phase 20 (no diff across HEAD~3..HEAD).

## REQ-SPD-06 — Partial Scope (Phase 21 deferral)

REQ-SPD-06 says the `gilrs_adapter.rs` coalesce key becomes `(dir, pwm_bucket)` so the adapter re-emits when the PWM bucket changes even if the direction is unchanged. **That adapter rewrite is Phase 21 and is NOT performed in this plan.** Phase 20 only lands the *domain-side function signatures consumed by `gilrs_adapter`*. The adapter will be rewired to call the `_command` variants (and the legacy `compute_trigger` / `compute_stick_direction` retired) in a single Phase 21 commit, as called out in the plan's preamble and PROJECT.md.

## Tests Added (in `mod tests`)

Nineteen new tests, all green:

### `compute_trigger_command` (REQ-SPD-04) — 8 tests

1. `trigger_command_stop_when_below_deadzone` — `r2 = 0.05, l2 = 0.05` → `Command::Stop`
2. `trigger_command_r2_only_forward` — `r2 = 0.9, l2 = 0.0` → `Drive { F, 216 }` (= `quantize_pressure(0.8)`, bucket 7)
3. `trigger_command_l2_only_backward` — `r2 = 0.0, l2 = 0.9` → `Drive { B, 216 }`
4. `trigger_command_r2_wins_tie` — `r2 = 0.5, l2 = 0.5` → `Drive { F, .. }` (R2 wins exact tie)
5. `trigger_command_stronger_wins` — `r2 = 0.3, l2 = 0.8` → `Drive { B, .. }`
6. `trigger_command_digital_fallback` — analog zero, digital R2 pressed → `Drive { F, 255 }` (effective pressure 1.0 → bucket 9)
7. `trigger_command_nan_is_stop` — `r2 = NaN, l2 = NaN` → `Command::Stop` (T-20-05)
8. `trigger_command_returns_pressures` — `r2 = 0.5, l2 = 0.0`: assert `r2_eff ≈ 0.4` within `1e-6` and `l2_eff = 0.0`

### `compute_stick_command` (REQ-SPD-05) — 11 tests

9. `stick_command_deadzone_returns_stop` — `(0, 0)`, `(0.1, 0.1)`, `(-0.14, 0.14)` all → `Stop`
10. `stick_command_full_press_forward` — `(0, -1)` → `Drive { F, 255 }`
11. `stick_command_full_press_backward` — `(0, 1)` → `Drive { B, 255 }`
12. `stick_command_full_press_left` — `(-1, 0)` → `Drive { L, 255 }`
13. `stick_command_full_press_right` — `(1, 0)` → `Drive { R, 255 }`
14. `stick_command_axis_tiebreak_y_wins_when_dominant` — `(0.1, -0.8)` → `dir == F` (abs_y > abs_x, y < 0)
15. `stick_command_axis_tiebreak_x_wins_when_dominant` — `(0.8, 0.1)` → `dir == R`
16. `stick_command_magnitude_clamps_to_one` — `(0.9, 0.9)` → `pwm == 255` (magnitude ≈ 1.273 clamps to 1.0 → bucket 9)
17. `stick_command_magnitude_quantization_partial` — `(0.5, 0.0)` → `Drive { R, 158 }` (magnitude 0.5 → bucket 4)
18. `stick_command_nan_is_stop` — `(NaN, 0.5)`, `(0.5, NaN)`, `(NaN, NaN)` all → `Stop` (T-20-04)
19. `stick_command_infinity_is_stop` — `(INFINITY, 0)` → `Stop` (non-finite guard)

Pre-existing tests still pass: 14 from before plan 20-01 + 11 from 20-01 + 19 new = **44/44 in `domain::direction::tests`**, and the full Cargo crate test still reports `67 + 0 + 3 + 9 + 12 + 6 + 10 + 16 = 123 passing, 0 failed`.

## Verification

| Gate | Result |
| - | - |
| `cargo build --manifest-path apps/frontend/src-tauri/Cargo.toml` | PASS |
| `cargo test --manifest-path apps/frontend/src-tauri/Cargo.toml --lib -- domain::direction::tests` | PASS (44/44) |
| `cargo test --manifest-path apps/frontend/src-tauri/Cargo.toml` (full crate) | PASS (123/123) |
| `cargo clippy --manifest-path apps/frontend/src-tauri/Cargo.toml --all-targets -- -D warnings` | PASS (clean for `domain/direction.rs`) |
| `grep -n "pub fn compute_trigger\\b\|pub fn compute_stick_direction\\b" …/direction.rs` | Legacy fns preserved at lines 107, 223 |
| `grep -n "pub fn compute_trigger_command\|pub fn compute_stick_command" …/direction.rs` | New fns present at lines 233 (trigger) and 136 (stick) |
| `git diff --name-only HEAD~3..HEAD apps/frontend/src-tauri/src/adapters/gilrs_adapter.rs` | EMPTY (unchanged) |
| `git diff --name-only HEAD~3..HEAD apps/frontend/src-tauri/src/gamepad/mod.rs` | EMPTY (unchanged) |
| `git diff --name-only HEAD~3..HEAD apps/frontend/src-tauri/src/ble/mod.rs` | EMPTY (unchanged) |
| `git diff --name-only HEAD~3..HEAD apps/frontend/src/` | EMPTY (unchanged) |

The only file modified across the three commits in this plan is `apps/frontend/src-tauri/src/domain/direction.rs`.

## Deferred Issues

### `cargo fmt --check` reports pre-existing whitespace diffs in unrelated files

`cargo fmt --check` over the whole `apps/frontend/src-tauri` workspace reports diffs in:

- `apps/frontend/src-tauri/src/adapters/btleplug_adapter.rs:173` (pre-existing — `sink.emit(` line-break style)
- `apps/frontend/src-tauri/src/adapters/gilrs_adapter.rs:21` (pre-existing — `gamepad.axis_data(…).map(…).unwrap_or(0.0)` chain over 100 columns)
- `apps/frontend/src-tauri/src/domain/direction.rs:216, 392, 530, 542` (all four predate plan 20-02: lines 216 = inside `compute_dpad_or_stick`, 392 = `direction_char_roundtrip` test, 530/542 = inside `quantize_pressure_all_ten_buckets_produced` / `quantize_pressure_monotonic` tests from plan 20-01)
- `apps/frontend/src-tauri/tests/domain_test.rs:83` (pre-existing integration-test file outside this plan's scope)
- `apps/frontend/src-tauri/tests/ports_test.rs:55` (pre-existing integration-test file outside this plan's scope)

These diffs all predate plan 20-02 and the touch surface of this plan (legacy fns + plan 20-01 tests). Per the executor scope-boundary rule, fixing pre-existing formatting in unrelated files is out of scope. No new fmt issues were introduced by my additions — `rustfmt --check` does not flag any of the new code I added (lines 130–170 for `compute_stick_command`, lines 233–285 for `compute_trigger_command`, lines 570+ for the 19 new tests).

If `cargo fmt --check` is a hard CI gate at Phase 23 (milestone close), a separate "chore(format): pre-milestone rustfmt sweep" commit can clean up the whole workspace in one shot.

## Deviations from Plan

None of substance. All three tasks executed exactly as written:

- Task 1 inserted `compute_trigger_command` immediately after `compute_trigger` (after line 220 in the pre-plan file, line 233 in the post-plan file).
- Task 2 inserted `compute_stick_command` immediately after `compute_stick_direction` (after line 87 in the pre-plan file, line 136 in the post-plan file).
- Task 3 appended all 19 tests inside the existing `mod tests` block, in the order specified in the plan, using `GamepadInputs::default()` plus field overrides per the plan style guidance.

The plan body says Task 1's insertion is "after line 181" and Task 2's is "after line 87" — those were the line numbers in the file at the start of the plan. After plan 20-01 landed (which added `Command`, `Display for Command`, `BUCKETS`, and `quantize_pressure` at the top of the file, lines 42–77), the relative positions still hold:

- `compute_stick_direction` was at line 68 pre-20-01 and is at line 107 post-20-01 — Task 2 still inserts immediately after it.
- `compute_trigger` was at line 145 pre-20-01 and is at line 184 post-20-01 — Task 1 still inserts immediately after it.

Neither shift required any deviation; the plan's spatial intent ("immediately after the legacy function") is preserved.

## Threat Model Coverage

All four STRIDE entries from the plan's `<threat_model>` are mitigated:

| Threat ID | Disposition | Coverage |
| - | - | - |
| T-20-04 (Tampering — NaN/INF on stick axis) | mitigate | `compute_stick_command` returns `Command::Stop` if either axis is non-finite. Tested by `stick_command_nan_is_stop` (3 NaN combinations) and `stick_command_infinity_is_stop`. |
| T-20-05 (Tampering — NaN on trigger pressure) | mitigate | `NaN > TRIGGER_THRESHOLD` is `false` in IEEE-754, so analog pressures collapse to 0.0; no digital fallback button is set in the test → `Command::Stop`. Tested by `trigger_command_nan_is_stop`. |
| T-20-06 (DoS — panic on edge input) | mitigate | Both new functions are total: no `unwrap`, no `expect`, no division by input. `.sqrt()` returns NaN on negative (which can't happen because `x*x + y*y >= 0.0`), and the `.min(1.0)` is total. Tests `stick_command_full_press_*`, `stick_command_magnitude_clamps_to_one`, NaN, INF all exit normally. |
| T-20-07 (Info disclosure — pwm outside 80..=255) | mitigate | `pwm` is sourced exclusively from `quantize_pressure`, bounded `80..=255` by the `BUCKETS` table (verified in plan 20-01 tests `quantize_pressure_all_ten_buckets_produced` and `quantize_pressure_full_press_returns_max`). Re-asserted by `stick_command_full_press_*` (255), `stick_command_magnitude_quantization_partial` (158), `trigger_command_*` (216, 255). |

No new security surface introduced beyond the threat model.

## Known Stubs

None. Both new functions are fully wired to existing domain primitives (`Command`, `Direction`, `quantize_pressure`, `DEADZONE`, `TRIGGER_THRESHOLD`). The "partial scope" of REQ-SPD-06 is documented in the plan body and PROJECT.md — it's an intentional deferral to Phase 21, not a stub.

## Self-Check: PASSED

Files claimed:

- `apps/frontend/src-tauri/src/domain/direction.rs` — FOUND (modified, +327 lines net across 3 commits: +53 + +39 + +235)

Commits claimed:

- `4c441481` (feat(domain): add compute_trigger_command returning Command) — FOUND in git log
- `2194d2ee` (feat(domain): add compute_stick_command returning Command) — FOUND in git log
- `81394c88` (test(domain): cover compute_trigger_command and compute_stick_command) — FOUND in git log

Acceptance greps:

- `pub fn compute_trigger_command` — 1 match (line 233)
- `pub fn compute_stick_command` — 1 match (line 136)
- `pub fn compute_trigger\b` — 1 match (line 223, legacy preserved)
- `pub fn compute_stick_direction` — 1 match (line 107, legacy preserved)
- `fn trigger_command_|fn stick_command_` test count: 19 (≥ 19 required)
- `git diff --name-only HEAD~3..HEAD` outside `apps/frontend/src-tauri/src/domain/direction.rs` — EMPTY for adapters/gilrs_adapter.rs, gamepad/mod.rs, ble/mod.rs, apps/frontend/src/

Out-of-scope STATE.md / ROADMAP.md / config.json were NOT modified by this worktree agent (per parallel-execution contract).

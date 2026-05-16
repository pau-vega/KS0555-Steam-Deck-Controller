---
phase: 20
plan: 02
type: execute
wave: 2
depends_on:
  - 20-01
files_modified:
  - apps/frontend/src-tauri/src/domain/direction.rs
autonomous: true
requirements:
  - REQ-SPD-04
  - REQ-SPD-05
  - REQ-SPD-06
must_haves:
  truths:
    - "A new pure function `compute_trigger_command(GamepadInputs) -> (Command, f32, f32)` is exposed from `domain::direction` and reflects R2-wins-tie semantics."
    - "A new pure function `compute_stick_command(f32, f32) -> Command` is exposed from `domain::direction`, uses the existing `DEADZONE = 0.15`, picks the dominant axis on tie, and quantizes the stick magnitude via `quantize_pressure`."
    - "Below-deadzone input to either function produces `Command::Stop`."
    - "Magnitude is clamped: `sqrt(x*x + y*y).min(1.0)` is what feeds `quantize_pressure`."
    - "Pre-existing `compute_trigger`, `compute_stick_direction`, `compute_combined`, and `compute_dpad_or_stick` keep their current signatures and behavior so `gilrs_adapter.rs` continues to compile unmodified."
  artifacts:
    - path: "apps/frontend/src-tauri/src/domain/direction.rs"
      provides: "`compute_trigger_command`, `compute_stick_command`, and their unit tests"
      contains: "pub fn compute_trigger_command"
  key_links:
    - from: "compute_trigger_command"
      to: "Command (from plan 20-01)"
      via: "returns Command in tuple position 0"
      pattern: "Command\\b"
    - from: "compute_stick_command"
      to: "quantize_pressure (from plan 20-01)"
      via: "pwm = quantize_pressure(magnitude)"
      pattern: "quantize_pressure"
---

<objective>
Add `Command`-returning gamepad-domain functions alongside the existing
`Direction`-returning ones, so the new analog API is callable from Phase 21 without
touching `gilrs_adapter.rs` in this phase. Specifically: add
`compute_trigger_command(GamepadInputs) -> (Command, f32, f32)` (R2-wins-tie) and
`compute_stick_command(f32, f32) -> Command` (axis tiebreak + magnitude →
`quantize_pressure`). All behavior covered by unit tests. The pre-existing
`compute_trigger` and `compute_stick_direction` are kept verbatim so existing
in-module callers and `gilrs_adapter.rs` continue to compile (the rename / cutover
happens in Phase 21).
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
@apps/frontend/src-tauri/src/adapters/gilrs_adapter.rs
@CLAUDE.md

## REQ-SPD-06 partial-scope note (REQUIRED)

REQ-SPD-06 says `gilrs_adapter.rs` coalesce key becomes `(dir, pwm_bucket)`. That
adapter rewrite is **Phase 21** and MUST NOT be performed here. Phase 20 only lands
the *domain-side function signatures consumed by `gilrs_adapter`*. To satisfy that
without breaking the existing adapter (which still expects `compute_trigger` to
return `(Direction, f32, f32)`), this plan introduces new functions named
`compute_trigger_command` and `compute_stick_command` and leaves the existing
`compute_trigger` and `compute_stick_direction` untouched. Phase 21 will:
1. Rewire `gilrs_adapter.rs` to call the `_command` variants.
2. Delete the legacy `compute_trigger` / `compute_stick_direction` (or rename the
   `_command` variants to take their names) in a single commit.

This is the "thin adaptation" mentioned in the planner context for this phase. It
keeps the file-scope rule intact: `gilrs_adapter.rs` and `gamepad/mod.rs` are NOT
modified in Phase 20.

## Semantics (locked decisions from REQUIREMENTS.md)

`compute_trigger_command` (REQ-SPD-04):
- Mirror the existing pressure-derivation logic in `compute_trigger`: clamp by
  `TRIGGER_THRESHOLD`, fall back to digital R1/R2/L1/L2 buttons when both analog
  pressures are zero.
- `direction` is `Drive { dir: F, pwm }` when `r2_eff > 0 && r2_eff >= l2_eff`,
  `Drive { dir: B, pwm }` when `l2_eff > 0`, else `Stop`. R2 wins exact tie.
- `pwm` is computed from `r2_eff.max(l2_eff)` via `quantize_pressure`. If the
  effective pressure falls below the deadzone in `quantize_pressure` (i.e.
  returns `None`), the command is `Stop` and the returned pressures match what
  the existing function returns (so heartbeat cadence in Phase 21 is unaffected).
- Returns `(Command, r2_eff, l2_eff)` — the second/third tuple elements are the
  same effective pressures the legacy function returns, used by the adapter's
  heartbeat scheduling.

`compute_stick_command` (REQ-SPD-05):
- Signature `pub fn compute_stick_command(x: f32, y: f32) -> Command`. Note: this
  function does NOT take a `deadzone` parameter — it uses the module-level
  `DEADZONE = 0.15` constant directly. (The legacy `compute_stick_direction`
  takes `deadzone` because `compute_dpad_or_stick` reuses it; the new function
  has a single locked-in deadzone per REQ-SPD-05.)
- If `x.abs() < DEADZONE && y.abs() < DEADZONE`, return `Command::Stop`.
- Otherwise pick dominant axis using the existing tiebreak rule:
  - `abs_y > abs_x`: forward if `y < 0`, else backward.
  - Else: right if `x >= 0`, else left.
  (Identical to the existing `compute_stick_direction` after deadzone gate.)
- Magnitude `m = (x*x + y*y).sqrt().min(1.0)`. Then `pwm = quantize_pressure(m)`.
  If `quantize_pressure(m)` returns `None`, return `Command::Stop` (the only way
  to hit this path is a tiny vector that survived the per-axis deadzone but has
  magnitude `<= 0.1`, which should also collapse to stop).
- If `pwm = Some(v)`, return `Command::Drive { dir, pwm: v }`.

## Out of scope reminder

- DO NOT touch `compute_trigger`, `compute_stick_direction`, `compute_combined`,
  `compute_dpad_or_stick`, `compute_trigger_interval`, `lateral_only`,
  `is_dpad_active`, or `is_stick_active`. All keep their current signatures and
  bodies. Renaming and call-site rewiring is Phase 21.
- DO NOT touch `apps/frontend/src-tauri/src/adapters/gilrs_adapter.rs`,
  `apps/frontend/src-tauri/src/gamepad/mod.rs`, `apps/frontend/src-tauri/src/ble/`,
  or anything under `apps/frontend/src/`.
</context>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| caller (gilrs adapter, future) → `compute_stick_command` | `x`, `y` are `f32` from gilrs axis data — may be NaN, INF, or outside `[-1, 1]` |
| caller (gilrs adapter, future) → `compute_trigger_command` | `GamepadInputs.r2`, `l2` are `f32` from gilrs — may be NaN, INF, or outside `[0, 1]` |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-20-04 | Tampering | `compute_stick_command` receives `NaN` x or y | mitigate | `abs()` of NaN is NaN; `NaN < DEADZONE` is `false` per IEEE-754, so the deadzone gate would fall through. Defend explicitly: if either axis is non-finite (`!x.is_finite() || !y.is_finite()`), return `Command::Stop` before the deadzone check. Add a unit test for NaN and INFINITY on each axis. |
| T-20-05 | Tampering | `compute_trigger_command` sees `NaN` in `inputs.r2` or `inputs.l2` | mitigate | The pressure computation already gates on `> threshold` (`NaN > 0.1` is `false`), so NaN routes through the zero-pressure path. `r2_eff.max(l2_eff)` with both zero yields `0.0`, which `quantize_pressure` returns `None` for → `Command::Stop`. Add a unit test asserting NaN inputs produce `Stop`. |
| T-20-06 | Denial of Service | New functions panic on edge input | mitigate | Total functions: no `unwrap`, no division by input. Use `.sqrt()` (defined for negative via NaN, then mitigated by T-20-04 finite check) and `.min(1.0)` for clamping. Tests cover boundary inputs `(0, 0)`, `(0.14, 0.14)`, `(1.0, 0.0)`, `(1.0, 1.0)`, NaN, INF. |
| T-20-07 | Information Disclosure | Returned `pwm` outside `80..=255` | mitigate | `pwm` is sourced exclusively from `quantize_pressure`, which is bounded `80..=255` by its `BUCKETS` table (verified in plan 20-01 tests). Re-asserted in tests added here. |
</threat_model>

<tasks>

<task type="auto">
  <name>Task 1: Add compute_trigger_command in domain/direction.rs</name>
  <files>apps/frontend/src-tauri/src/domain/direction.rs</files>
  <read_first>
    @apps/frontend/src-tauri/src/domain/direction.rs (lines 145–181 — existing `compute_trigger` to mirror pressure derivation; lines 1–10 — `TRIGGER_THRESHOLD` constant; plan 20-01 additions for `Command` and `quantize_pressure`)
  </read_first>
  <action>
    Append (do not replace) a new public function in `domain/direction.rs`, placed
    immediately after the existing `compute_trigger` function (after line 181):

    1. Signature: `pub fn compute_trigger_command(inputs: &GamepadInputs) -> (Command, f32, f32)`.
       Note: it takes `&GamepadInputs` like the legacy function, and does NOT take
       a threshold argument — it uses the module-level `TRIGGER_THRESHOLD`
       constant directly per REQ-SPD-04.

    2. Body, in order:
       a. Compute `r2_pressure` and `l2_pressure` from `inputs.r2` and `inputs.l2`
          using the same `> TRIGGER_THRESHOLD ? value - threshold : 0.0` pattern
          as the existing `compute_trigger` (mirror lines 146–155 exactly so
          heartbeat cadence stays identical between legacy and new function in
          Phase 21).
       b. Apply the same digital-button fallback as the existing function
          (mirror lines 157–170): when both analog pressures are zero, use
          `trigger_buttons.r1 || trigger_buttons.r2` and
          `trigger_buttons.l1 || trigger_buttons.l2` as 0.0/1.0 inputs.
       c. Determine `dir`:
          - if `r2_eff > 0.0 && r2_eff >= l2_eff` → `Direction::F`
          - else if `l2_eff > 0.0` → `Direction::B`
          - else → return `(Command::Stop, r2_eff, l2_eff)` immediately.
       d. Compute `let strongest = r2_eff.max(l2_eff);` then
          `match quantize_pressure(strongest) { Some(pwm) => (Command::Drive { dir, pwm }, r2_eff, l2_eff), None => (Command::Stop, r2_eff, l2_eff) }`.

    3. Do NOT modify `compute_trigger`, `compute_combined`, or any other existing
       function. They keep their signatures and bodies verbatim.
  </action>
  <acceptance_criteria>
    - `grep -n "pub fn compute_trigger_command" apps/frontend/src-tauri/src/domain/direction.rs` matches exactly one line.
    - `grep -n "pub fn compute_trigger\\b" apps/frontend/src-tauri/src/domain/direction.rs` still matches the original line (legacy function preserved).
    - `cargo build --manifest-path apps/frontend/src-tauri/Cargo.toml` succeeds.
    - `git diff apps/frontend/src-tauri/src/adapters/gilrs_adapter.rs` is empty.
  </acceptance_criteria>
  <verify>
    <automated>cargo build --manifest-path apps/frontend/src-tauri/Cargo.toml 2>&amp;1 | tail -20</automated>
  </verify>
  <done>
    `compute_trigger_command` exists alongside the unchanged `compute_trigger`,
    matches REQ-SPD-04 semantics, and compiles. `gilrs_adapter.rs` is unchanged.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add compute_stick_command in domain/direction.rs</name>
  <files>apps/frontend/src-tauri/src/domain/direction.rs</files>
  <read_first>
    @apps/frontend/src-tauri/src/domain/direction.rs (lines 68–87 — existing `compute_stick_direction` for axis-tiebreak logic to mirror; lines 1–10 — `DEADZONE`)
  </read_first>
  <action>
    Append a new public function in `domain/direction.rs`, placed immediately
    after `compute_stick_direction` (after line 87):

    1. Signature: `pub fn compute_stick_command(x: f32, y: f32) -> Command`. Uses
       module-level `DEADZONE` directly — no parameter.

    2. Body, in order:
       a. Finite guard: if `!x.is_finite() || !y.is_finite()` return
          `Command::Stop`. (T-20-04 mitigation.)
       b. Compute `abs_x = x.abs()`, `abs_y = y.abs()`.
       c. If `abs_x < DEADZONE && abs_y < DEADZONE`, return `Command::Stop`.
       d. Determine `dir` using the existing axis tiebreak (mirror
          `compute_stick_direction` lines 76–86 — `abs_y > abs_x` takes y, else
          x; for y: `y < 0.0` → `Direction::F` else `Direction::B`; for x:
          `x < 0.0` → `Direction::L` else `Direction::R`).
       e. Compute magnitude `let m = (x * x + y * y).sqrt().min(1.0);`.
       f. `match quantize_pressure(m) { Some(pwm) => Command::Drive { dir, pwm }, None => Command::Stop }`.

    3. Do NOT modify `compute_stick_direction`, `compute_dpad_or_stick`,
       `compute_combined`, or any other existing function.
  </action>
  <acceptance_criteria>
    - `grep -n "pub fn compute_stick_command" apps/frontend/src-tauri/src/domain/direction.rs` matches exactly one line.
    - `grep -n "pub fn compute_stick_direction" apps/frontend/src-tauri/src/domain/direction.rs` still matches the original.
    - `cargo build --manifest-path apps/frontend/src-tauri/Cargo.toml` succeeds.
  </acceptance_criteria>
  <verify>
    <automated>cargo build --manifest-path apps/frontend/src-tauri/Cargo.toml 2>&amp;1 | tail -20</automated>
  </verify>
  <done>
    `compute_stick_command(f32, f32) -> Command` exists, uses the module-level
    `DEADZONE`, applies axis tiebreak identical to legacy, and feeds the
    clamped magnitude through `quantize_pressure`.
  </done>
</task>

<task type="auto">
  <name>Task 3: Unit tests for compute_trigger_command and compute_stick_command</name>
  <files>apps/frontend/src-tauri/src/domain/direction.rs</files>
  <read_first>
    @apps/frontend/src-tauri/src/domain/direction.rs (lines 200–320 — the `#[cfg(test)] mod tests` block, where new tests append)
  </read_first>
  <action>
    Append the following test functions inside the existing `mod tests` block. Use
    `GamepadInputs::default()` plus field overrides (matching the style of the
    `combined_*` tests already in the file).

    Trigger tests (REQ-SPD-04):
    1. `trigger_command_stop_when_below_deadzone` — inputs with `r2 = 0.05, l2 = 0.05` and no buttons → `Command::Stop`.
    2. `trigger_command_r2_only_forward` — `r2 = 0.9`, `l2 = 0.0` → matches `Command::Drive { dir: Direction::F, pwm: _ }`; `pwm` is `Some(_)` from `quantize_pressure(0.9 - 0.1)` = `quantize_pressure(0.8)` which should be `Some(216)` (bucket index 8). Assert exact pwm value.
    3. `trigger_command_l2_only_backward` — `l2 = 0.9`, `r2 = 0.0` → `Command::Drive { dir: Direction::B, pwm: 216 }`.
    4. `trigger_command_r2_wins_tie` — `r2 = 0.5`, `l2 = 0.5` → variant is `Drive { dir: Direction::F, .. }` (not B, not Stop). R2 wins exact tie.
    5. `trigger_command_stronger_wins` — `r2 = 0.3`, `l2 = 0.8` → variant is `Drive { dir: Direction::B, .. }`.
    6. `trigger_command_digital_fallback` — `r2 = 0.0`, `l2 = 0.0`, `trigger_buttons.r2 = true` → `Drive { dir: Direction::F, pwm: 255 }` (digital fallback feeds pressure = 1.0 → strongest = 1.0 → bucket 9 = 255).
    7. `trigger_command_nan_is_stop` — `r2 = f32::NAN`, `l2 = f32::NAN` → `Command::Stop`.
    8. `trigger_command_returns_pressures` — assert the second/third tuple positions for `r2 = 0.5, l2 = 0.0`: expect `r2_eff = 0.4` (within f32 epsilon — use `(actual - 0.4).abs() < 1e-6`) and `l2_eff = 0.0`.

    Stick tests (REQ-SPD-05):
    9. `stick_command_deadzone_returns_stop` — `compute_stick_command(0.0, 0.0)`, `(0.1, 0.1)`, `(-0.14, 0.14)` all return `Command::Stop`.
    10. `stick_command_full_press_forward` — `compute_stick_command(0.0, -1.0)` returns `Command::Drive { dir: Direction::F, pwm: 255 }` (magnitude = 1.0 → bucket 9).
    11. `stick_command_full_press_backward` — `(0.0, 1.0)` → `Drive { dir: B, pwm: 255 }`.
    12. `stick_command_full_press_left` — `(-1.0, 0.0)` → `Drive { dir: L, pwm: 255 }`.
    13. `stick_command_full_press_right` — `(1.0, 0.0)` → `Drive { dir: R, pwm: 255 }`.
    14. `stick_command_axis_tiebreak_y_wins_when_dominant` — `(0.1, -0.8)` → `dir: F`.
    15. `stick_command_axis_tiebreak_x_wins_when_dominant` — `(0.8, 0.1)` → `dir: R`.
    16. `stick_command_magnitude_clamps_to_one` — `(0.9, 0.9)` produces magnitude `sqrt(1.62) ≈ 1.273` clamped to `1.0`, so the resulting pwm is `255`. Assert `pwm == 255` (after extracting from Drive variant).
    17. `stick_command_magnitude_quantization_partial` — `(0.5, 0.0)` produces magnitude `0.5`; `quantize_pressure(0.5)` falls in bucket 4 (open-low `(0.46, 0.55]`) → `Some(158)`. Assert `Command::Drive { dir: R, pwm: 158 }`.
    18. `stick_command_nan_is_stop` — `compute_stick_command(f32::NAN, 0.5)` and `(0.5, f32::NAN)` and `(f32::NAN, f32::NAN)` all return `Command::Stop`.
    19. `stick_command_infinity_is_stop` — `compute_stick_command(f32::INFINITY, 0.0)` returns `Command::Stop` (non-finite guard).

    Helper: where the test asserts a `pwm` value, destructure with
    `if let Command::Drive { dir, pwm } = result { … } else { panic!("expected Drive, got {:?}", result) }` so failures print useful diagnostics.

    All tests use `std`-only; no new dev-dependencies.
  </action>
  <acceptance_criteria>
    - `grep -c "fn trigger_command_\\|fn stick_command_" apps/frontend/src-tauri/src/domain/direction.rs` ≥ 19.
    - `cargo test --manifest-path apps/frontend/src-tauri/Cargo.toml --lib -- domain::direction::tests` passes all 19 new tests in addition to the existing tests and the tests from plan 20-01.
    - Running `cargo clippy --manifest-path apps/frontend/src-tauri/Cargo.toml --all-targets -- -D warnings` is clean for `domain/direction.rs`.
  </acceptance_criteria>
  <verify>
    <automated>cargo test --manifest-path apps/frontend/src-tauri/Cargo.toml --lib -- domain::direction::tests 2>&amp;1 | tail -60</automated>
  </verify>
  <done>
    Nineteen new tests assert R2-wins-tie, stronger-wins, digital fallback, NaN
    safety, axis tiebreak, deadzone, magnitude clamping, and exact bucket
    mapping. All pass. `gilrs_adapter.rs` and `gamepad/mod.rs` remain unchanged.
  </done>
</task>

</tasks>

<verification>
- `cargo build --manifest-path apps/frontend/src-tauri/Cargo.toml` succeeds.
- `cargo test --manifest-path apps/frontend/src-tauri/Cargo.toml` passes (all pre-existing tests + 11 from plan 20-01 + 19 new = full pass).
- `cargo clippy --manifest-path apps/frontend/src-tauri/Cargo.toml --all-targets -- -D warnings` is clean for `domain/direction.rs`.
- `cargo fmt --manifest-path apps/frontend/src-tauri/Cargo.toml -- --check` reports no diff.
- `git diff --name-only apps/frontend/src-tauri/src/adapters/gilrs_adapter.rs apps/frontend/src-tauri/src/gamepad/mod.rs apps/frontend/src-tauri/src/ble/mod.rs` is empty.
- `grep -n "pub fn compute_trigger\\b\\|pub fn compute_stick_direction\\b" apps/frontend/src-tauri/src/domain/direction.rs` still shows the legacy functions preserved.
</verification>

<success_criteria>
- `compute_trigger_command(&GamepadInputs) -> (Command, f32, f32)` and `compute_stick_command(f32, f32) -> Command` are exported from `domain::direction`.
- Legacy `compute_trigger`, `compute_stick_direction`, `compute_combined`, `compute_dpad_or_stick`, `lateral_only`, `is_dpad_active`, `is_stick_active`, `compute_trigger_interval` are byte-for-byte unchanged.
- All 19 new tests pass.
- `gilrs_adapter.rs` and `gamepad/mod.rs` remain unmodified.
- The function pair satisfies REQ-SPD-04 and REQ-SPD-05 verbatim semantics, leaving Phase 21 to do the rename / cutover and the coalesce-key change for REQ-SPD-06.
</success_criteria>

<output>
After completion, create `.planning/phases/20-protocol-domain/20-02-SUMMARY.md` capturing:
- The two new functions with exact signatures
- Confirmation that legacy functions were preserved (so `gilrs_adapter.rs` stays green)
- The 19 test names added
- An explicit note about REQ-SPD-06 deferral to Phase 21
</output>

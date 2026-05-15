---
phase: 20-protocol-domain
plan: 03
subsystem: ble
tags: [rust, tauri, ble, regex, validation, threat-mitigation]

# Dependency graph
requires:
  - phase: 20-protocol-domain
    provides: nothing — plan 20-03 is independent of 20-01/20-02 within wave 1
provides:
  - "Relaxed BLE wire-protocol validation: accepts `^[FBLR]\\d{2,3}\\n$` with pwm ∈ 80..=255, plus `^S\\n$`"
  - "Pure `validate_ble_payload(&str) -> Result<(), String>` helper, unit-testable without Tauri state"
  - "Compiled regex behind `LazyLock<Regex>` (single compile, no per-call overhead)"
  - "18 unit tests covering accept + reject branches including T-20-08/-09/-10/-11/-12/-14 mitigations"
  - "`regex` crate added as a runtime dependency"
affects:
  - "phase 21 (gilrs-adapter rewrite) — gilrs_adapter will emit wire-format strings that validate against this regex"
  - "phase 22 (frontend hooks) — useBluetooth.send produces strings shaped by encodeCommand, validated here"

# Tech tracking
tech-stack:
  added:
    - "regex 1.12.3 (Cargo dependency)"
    - "std::sync::LazyLock (Rust 1.80+) for static regex compilation"
  patterns:
    - "Pure validator extraction: split the Tauri command into a tauri-free helper for unit testability"
    - "Module-level compiled regex via LazyLock — compile once, share across calls"
    - "Defensive byte-equality test against ASCII literal to catch accidental Unicode normalization"

key-files:
  created: []
  modified:
    - "apps/frontend/src-tauri/src/ble/mod.rs (87 → 256 lines)"
    - "apps/frontend/src-tauri/Cargo.toml (+1 dep)"
    - "apps/frontend/src-tauri/Cargo.lock (regenerated)"

key-decisions:
  - "Use LazyLock<Regex> over OnceLock — ergonomic and available in toolchain 1.95"
  - "Enforce pwm range (80..=255) in code, not in regex — `\\d{2,3}` keeps the pattern compact; numeric range gives a precise error message"
  - "`.expect(\"static regex compiles\")` on the LazyLock — pattern is a compile-time constant, panic-on-load is the intended developer signal"
  - "Extract `validate_ble_payload` so tests can hit the validation branches without constructing a `tauri::State<BleState>`"
  - "Use `u16::from_str` so `999` does not overflow `u8` before the range check fires"

patterns-established:
  - "BLE wire-format validation: regex shape + numeric-range check + descriptive error returning the rejected payload (no internal-state leak per T-20-14)"
  - "Test naming: `accepts_<scenario>` and `rejects_<scenario>` pairs, with `expect_err` helper for ergonomic Err assertions"

requirements-completed: [REQ-SPD-03]

# Metrics
duration: 6min
completed: 2026-05-15
---

# Phase 20 Plan 03: BLE Send Validation Summary

**Relaxed `ble_send` to accept `<dir><pwm>\n` and `S\n` wire-format payloads via a single compiled regex + numeric pwm range check, with 18 unit tests covering accept and reject branches (including STRIDE threat mitigations T-20-08/-09/-10/-11/-12/-14).**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-05-15T16:08:39Z
- **Completed:** 2026-05-15T16:14:19Z
- **Tasks:** 3 (all completed)
- **Files modified:** 3 (`ble/mod.rs`, `Cargo.toml`, `Cargo.lock`)

## Accomplishments

- **Wire protocol unblocked.** `ble_send` no longer rejects payloads longer than 1 byte. The new accept-set matches the firmware grammar (`F138\n`, `B255\n`, `L80\n`, `R150\n`, `S\n`) needed by REQ-SPD-04..06 in subsequent phases.
- **Threat-mitigated.** Six STRIDE threats from the plan's threat register (T-20-08 multi-command injection, T-20-09 pwm out of range, T-20-10 missing newline, T-20-11 wrong direction char, T-20-12 oversize-payload DoS, T-20-14 info disclosure via error string) are mitigated by the regex anchors + bounded `\d{2,3}` + numeric range check + scrubbed error message. Each mitigation has a dedicated unit test.
- **Testability won.** The validation logic now lives in a pure `validate_ble_payload(&str) -> Result<(), String>` helper. `ble_send` delegates to it, so the 18 new unit tests run pure Rust without constructing a `tauri::State<BleState>` (no fakes needed).
- **No regressions.** Full Rust test suite (9 test binaries, 91 tests including 18 new) is green. Clippy `-D warnings` is clean.
- **Accept-path byte-identical.** The `state.port().write(command.as_bytes()).await` call on the accept path is unchanged from the previous implementation — the same byte slice that came in on the IPC boundary is what hits BLE.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add regex dependency to Cargo.toml** — `e1acdde5` (chore)
   - Added `regex = "1.12.3"` via `cargo add` (CLAUDE.md no-hand-edit rule).
   - Critical-dep count of `(btleplug|gilrs|tokio|tauri)` unchanged at 4 — no accidental edits to other deps.
2. **Task 2: Relax ble_send validation with regex + pwm range check** — `d98fc59b` (feat)
   - Replaced the legacy `command.len() != 1` early return with `validate_ble_payload(&command)?`.
   - Module-level `static BLE_COMMAND_RE: LazyLock<Regex>` compiled from `r"^[FBLR]\d{2,3}\n$|^S\n$"`.
   - `validate_ble_payload` does the regex match, short-circuits on `S\n`, otherwise parses `&command[1..command.len()-1]` as `u16` and checks the `80..=255` range.
   - Errors include the rejected payload (quoted) and the expected format — no internal-state leakage (T-20-14).
3. **Task 3: Unit tests for ble_send validation** — `16b7ddd6` (test)
   - 18 tests inside `#[cfg(test)] mod tests`: 6 accept + 12 reject.
   - No new dev-dependencies; pure `std` assertions plus `assert!` / `assert_eq!`.

## Files Created/Modified

- `apps/frontend/src-tauri/src/ble/mod.rs` — Added regex/LazyLock imports, `BLE_COMMAND_RE` static, `validate_ble_payload` helper, rewrote `ble_send` to call the helper, appended `#[cfg(test)] mod tests` with 18 cases. `ble_connect`, `get_invert_state`, `toggle_invert` untouched.
- `apps/frontend/src-tauri/Cargo.toml` — Added `regex = "1.12.3"` to `[dependencies]`.
- `apps/frontend/src-tauri/Cargo.lock` — Regenerated by `cargo add` (transitive deps for `regex`).

## Decisions Made

- **`LazyLock<Regex>` over `OnceLock<Regex>`** — Toolchain is 1.95; `LazyLock` is ergonomic (no init-or-get dance) and available since 1.80.
- **Pwm range check in code, not in regex** — `\d{2,3}` is far simpler than encoding `80..=255` in a regex alternation, and a separate code check produces a precise error message ("pwm 79 out of range (expected 80..=255)") instead of an opaque "no match".
- **`u16` parse, not `u8`** — Allows `999` (and arbitrarily long digit strings caught upstream by `\d{2,3}`) to be range-checked without panicking on overflow.
- **`.expect("static regex compiles")` on `LazyLock`** — The pattern is a compile-time constant; a panic at first access is the right developer signal for a typo. Documented inline with a comment.
- **`validate_ble_payload` extraction** — Plan recommended it (and the acceptance criteria require it). The alternative — testing the whole Tauri command — would have required either a `tauri::test` harness or a fake `BluetoothPort`. Helper extraction is a strictly smaller change with zero behavioral risk.

## Deviations from Plan

None — plan executed exactly as written.

(One incidental observation, NOT a behavioral deviation: a `cargo fmt --package robot-controller -- <path>` invocation during Task 2 verification re-formatted six out-of-scope files (`adapters/btleplug_adapter.rs`, `adapters/gilrs_adapter.rs`, `domain/direction.rs`, `domain/invert.rs`, `tests/domain_test.rs`, `tests/ports_test.rs`). I reverted them all via `git checkout --` before staging Task 2's commit so they were never persisted. The plan's no-touch list (`gilrs_adapter.rs`, `gamepad/mod.rs`, `domain/direction.rs`) and the parallel-plan constraint with 20-01 are intact. `cargo fmt --package` ignores the positional path argument when invoked through cargo; future cargo-fmt scoped to a single file should use `rustfmt --edition 2021 <path>` instead.)

## Issues Encountered

None — the build, tests, and clippy all passed on first attempt after the file write. The only friction was the cargo-fmt scoping behavior noted above, which I caught at the `git status` check before commit and reverted cleanly.

## Threat Mitigation Coverage

Per the plan's `<threat_model>` STRIDE register, the following dispositions of `mitigate` are realized in code + tests:

| Threat ID | Mitigation in this plan | Test asserting it |
|-----------|-------------------------|--------------------|
| T-20-08 (Spoofing — multi-command injection) | Regex `^...$` anchors + `\d{2,3}` bound + trailing `\n` requirement | `rejects_extra_data_after_newline` |
| T-20-09 (Tampering — pwm out of range) | `u16::from_str` + `(80..=255).contains(&pwm)` | `rejects_pwm_below_range`, `rejects_pwm_above_range` |
| T-20-10 (Tampering — missing newline) | Regex requires terminal `\n` | `rejects_no_newline` |
| T-20-11 (Tampering — wrong direction char) | Case-sensitive `[FBLR]` class; `S\n` requires uppercase | `rejects_lowercase_direction`, `rejects_invalid_direction_char` |
| T-20-12 (DoS — oversize payload) | Anchored regex with bounded `\d{2,3}` rejects >5-byte total | `rejects_huge_payload` (100 chars) |
| T-20-14 (Info disclosure via error) | Error string contains only rejected payload + expected format; no MAC/UUID/state | All `rejects_*` tests use `expect_err`; assertions confirm only payload + format vocabulary appears |

T-20-13 (Repudiation) was disposition `accept` per the plan — no change required.

## Verification Snapshot

Run from this worktree on completion:

```bash
# Plan-level verifications
cargo build  --manifest-path apps/frontend/src-tauri/Cargo.toml          # OK, 2.41s
cargo test   --manifest-path apps/frontend/src-tauri/Cargo.toml          # OK, 91 tests across 9 binaries
cargo test   --manifest-path apps/frontend/src-tauri/Cargo.toml --lib -- ble::tests   # OK, 18 / 18
cargo clippy --manifest-path apps/frontend/src-tauri/Cargo.toml --all-targets -- -D warnings  # OK

# Constraint verifications
git diff e4ae150531d3555afeb3693df6d8847f644182ce -- \
  apps/frontend/src-tauri/src/adapters/gilrs_adapter.rs \
  apps/frontend/src-tauri/src/gamepad/mod.rs \
  apps/frontend/src-tauri/src/domain/direction.rs
# → empty diff: out-of-scope files unchanged
```

## `state.port().write` Accept-Path Confirmation

The accept-path call has not changed:

```rust
// before
state.port().write(command.as_bytes()).await
// after (in ble_send)
validate_ble_payload(&command)?;
state.port().write(command.as_bytes()).await
```

The byte slice passed to `BluetoothPort::write` is the entire `command` (including the trailing `\n`), identical to the previous behavior. The `accept_path_byte_identical` test pins the ASCII bytes of `"F138\n"` to `[0x46, 0x31, 0x33, 0x38, 0x0A]` as a defensive guard against accidental literal mutation.

## Out-of-Scope Files Confirmation

Per the plan's no-touch list and the parallel-execution constraint with plan 20-01 (which is editing `domain/direction.rs` in another wave-1 worktree):

- `apps/frontend/src-tauri/src/adapters/gilrs_adapter.rs` — unchanged vs base `e4ae1505`.
- `apps/frontend/src-tauri/src/gamepad/mod.rs` — unchanged vs base.
- `apps/frontend/src-tauri/src/domain/direction.rs` — unchanged vs base.
- `apps/frontend/src/*` (TypeScript / React) — unchanged vs base.

`git diff --name-only e4ae1505` returns exactly:
```
apps/frontend/src-tauri/Cargo.lock
apps/frontend/src-tauri/Cargo.toml
apps/frontend/src-tauri/src/ble/mod.rs
```

## Known Stubs

None. The validation logic is fully implemented and tested.

## User Setup Required

None — no external service configuration, no env vars, no manual steps.

## Next Phase Readiness

- **Phase 21 (Gamepad Adapter & IPC) is unblocked from the BLE side.** When phase 21's `gilrs_adapter.rs` rewrite starts emitting `format!("{}{}\n", dir.as_char(), pwm)` strings, `ble_send` will validate them without further change.
- **Phase 22 (Frontend Hooks & UI) is similarly unblocked.** `useBluetooth.send` can shape strings via an `encodeCommand` helper and pass them through; the IPC boundary now validates them server-side.
- **No blockers for the wave-2 merge of 20-01, 20-02, 20-03.** This plan touched only `ble/mod.rs` + `Cargo.toml`/`Cargo.lock`; merge conflicts with 20-01 (which edits `domain/direction.rs`) and 20-02 are not possible at the file level.

## Self-Check: PASSED

- File `apps/frontend/src-tauri/src/ble/mod.rs` — FOUND (256 lines).
- File `apps/frontend/src-tauri/Cargo.toml` — FOUND, contains `regex = "1.12.3"`.
- Commit `e1acdde5` (Task 1: chore regex dep) — FOUND in `git log --all`.
- Commit `d98fc59b` (Task 2: feat ble validation) — FOUND in `git log --all`.
- Commit `16b7ddd6` (Task 3: test 18 cases) — FOUND in `git log --all`.
- 18 test functions in `ble/mod.rs` (grep count) — VERIFIED.
- Full `cargo test` (91 tests) — PASSING.
- `cargo clippy --all-targets -- -D warnings` — CLEAN.
- `git status --short` — clean (no untracked, no unstaged) before SUMMARY commit.

---
*Phase: 20-protocol-domain*
*Plan: 03 — BLE send validation*
*Completed: 2026-05-15*

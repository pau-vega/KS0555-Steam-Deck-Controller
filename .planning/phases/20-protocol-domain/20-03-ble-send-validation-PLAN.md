---
phase: 20
plan: 03
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/frontend/src-tauri/src/ble/mod.rs
  - apps/frontend/src-tauri/Cargo.toml
autonomous: true
requirements:
  - REQ-SPD-03
must_haves:
  truths:
    - "`ble_send` no longer rejects payloads longer than 1 character."
    - "`ble_send` accepts payloads matching `^[FBLR]\\d{2,3}\\n$` (e.g. `\"F80\\n\"`, `\"F138\\n\"`, `\"R255\\n\"`)."
    - "`ble_send` accepts the exact payload `\"S\\n\"`."
    - "`ble_send` rejects payloads with missing newline, wrong direction char, pwm out of range, malformed digits, empty string, or extra trailing data."
    - "On reject, `ble_send` returns an `Err(String)` whose message identifies the rejected payload and the validation reason."
    - "On accept, `ble_send` calls `state.port().write(command.as_bytes())` exactly once with the entire payload (newline included)."
  artifacts:
    - path: "apps/frontend/src-tauri/src/ble/mod.rs"
      provides: "Relaxed `ble_send` validation with regex matcher + unit tests"
      contains: "ble_send"
    - path: "apps/frontend/src-tauri/Cargo.toml"
      provides: "Regex crate added as a runtime dependency (only if not already present)"
      contains: "regex"
  key_links:
    - from: "ble_send"
      to: "regex `^[FBLR]\\d{2,3}\\n$|^S\\n$`"
      via: "compiled regex (lazy/once) used as the accept-set"
      pattern: "Regex::new|OnceLock|LazyLock"
    - from: "ble_send (accept path)"
      to: "BluetoothPort::write"
      via: "command.as_bytes()"
      pattern: "state\\.port\\(\\)\\.write"
---

<objective>
Relax `ble_send` payload validation in `apps/frontend/src-tauri/src/ble/mod.rs` to
accept the new analog wire protocol. The current implementation rejects anything
that isn't exactly 1 byte long. After this plan, `ble_send` accepts the union of
`^[FBLR]\d{2,3}\n$` (PWM commands like `"F138\n"`) and `^S\n$` (the stop command),
and rejects everything else with a descriptive error. The payload is passed to
`state.port().write` byte-for-byte (including the newline). Unit tests cover both
accept and reject paths.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@apps/frontend/src-tauri/src/ble/mod.rs
@apps/frontend/src-tauri/Cargo.toml
@CLAUDE.md

## What's changing

Current `ble_send` (lines 19–33 of `ble/mod.rs`):
- Hard-rejects any `command` whose `.len() != 1` with a message naming the
  legacy 5-char protocol.
- Passes the single-byte payload to `state.port().write(command.as_bytes())`.

After this plan:
- The `len == 1` check is removed.
- A compiled regex `^[FBLR]\d{2,3}\n$|^S\n$` is the new accept-set.
- The pwm digit range `\d{2,3}` allows 2–3 digit values. Numeric range
  enforcement (80..=255) is performed in code after the regex match (the regex
  alone allows values like `00`, `01`, `999`).
- On reject, the error string includes the rejected payload (escaped or quoted)
  and explains the format expected. Error remains a `String` to match the
  `Result<(), String>` return type already used by the module.
- The accept-path call to `state.port().write(command.as_bytes())` stays
  byte-identical (no transformation of the payload).

## Regex crate

Inspect `apps/frontend/src-tauri/Cargo.toml` first. The dependency list shown in
the read-first file ends at line 30 (`async-trait = "0.1.89"`). The crate may or
may not already include `regex`. If `regex` is absent, add it as a dependency.
Use `cargo add regex --manifest-path apps/frontend/src-tauri/Cargo.toml` — do NOT
hand-edit `Cargo.toml` per the project rule in CLAUDE.md. The `cargo add` call
satisfies the project rule against manual `package.json`/`Cargo.toml` edits.

Avoid recompiling the regex on every call. Use one of:
- `std::sync::OnceLock<Regex>` (available since Rust 1.70; toolchain is 1.95).
- `std::sync::LazyLock<Regex>` (1.80+; preferred for ergonomics).
Either is acceptable; do not pull in `lazy_static` or `once_cell` if not already
in the dependency tree.

## What stays unchanged

- `ble_connect`, `get_invert_state`, `toggle_invert` are not modified.
- The `state.port().write(command.as_bytes())` call signature stays exactly as
  is. BLE writes still use `WriteType::WithoutResponse` (set inside
  `BluetoothPort::write`, not in this file).
- The Tauri command signature `pub async fn ble_send(_app: AppHandle, state: tauri::State<'_, BleState>, command: String) -> Result<(), String>` is preserved verbatim.
</context>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| frontend (untrusted JS in WebView) → Tauri `ble_send` IPC | Frontend can send arbitrary `command: String` values; `ble_send` is the only validator before bytes hit BLE |
| `ble_send` → `BluetoothPort::write` (BLE peripheral) | Writes are fire-and-forget (`WriteType::WithoutResponse`); the BT24 module forwards bytes to the Arduino serial line; an unvalidated payload could be interpreted as multiple commands |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-20-08 | Spoofing | Frontend sends a payload containing a fake newline-separated second command (e.g. `"F138\nB255\n"`) | mitigate | Regex anchors `^...$` plus the requirement of exactly one trailing `\n` ensure only one logical command per call. Add a unit test asserting `"F138\nB255\n"` is rejected. |
| T-20-09 | Tampering | Frontend sends `pwm` outside `80..=255` (e.g. `"F00\n"`, `"F999\n"`) | mitigate | After regex match, parse the digit substring with `u16::from_str` and reject if `< 80` or `> 255`. Add tests for `"F00\n"`, `"F01\n"`, `"F79\n"`, `"F256\n"`, `"F999\n"`. |
| T-20-10 | Tampering | Frontend sends payload without trailing newline (`"F138"`) | mitigate | Regex requires terminal `\n`. Add a unit test asserting `"F138"` is rejected. |
| T-20-11 | Tampering | Frontend sends wrong direction char (`"X138\n"`, `"s\n"` lowercase) | mitigate | Regex character class `[FBLR]` is case-sensitive; lowercase `s` does not match `^S\n$`. Add tests for both. |
| T-20-12 | Denial of Service | Frontend sends an enormous payload (`"F" + "1".repeat(10_000_000) + "\n"`) | mitigate | Anchored regex with bounded digit count `\d{2,3}` rejects anything longer than 5 characters total. Test asserts a 100-byte payload is rejected without panic. |
| T-20-13 | Repudiation | Reject path silently drops the payload | accept | The function returns an `Err(String)` propagated to the frontend; logging beyond that is out of scope. Frontend already surfaces command errors. |
| T-20-14 | Information Disclosure | Reject error string leaks BLE peripheral details | mitigate | Error string contains only the rejected payload (quoted) and the expected format; no MAC address, no characteristic UUID, no internal state. Verified by test assertion on error message content. |
</threat_model>

<tasks>

<task type="auto">
  <name>Task 1: Add regex dependency to Cargo.toml (only if missing)</name>
  <files>apps/frontend/src-tauri/Cargo.toml</files>
  <read_first>
    @apps/frontend/src-tauri/Cargo.toml (full file — verify whether `regex` is already a dependency before adding it)
  </read_first>
  <action>
    1. Open `apps/frontend/src-tauri/Cargo.toml` and check the `[dependencies]`
       section. If `regex` is already listed, skip this entire task (do not
       reinstall).
    2. If `regex` is absent, add it with:
       `cargo add regex --manifest-path apps/frontend/src-tauri/Cargo.toml`
       — this is the project-mandated way to add a dependency (CLAUDE.md
       prohibits hand-editing manifests). `cargo add` writes the current latest
       version; do not pin to an older one.
    3. Do NOT alter feature flags, default features, or any other dependency
       declaration in `Cargo.toml`.
  </action>
  <acceptance_criteria>
    - `grep -E "^regex\\s*=" apps/frontend/src-tauri/Cargo.toml` matches one line (regex present in `[dependencies]`).
    - `cargo build --manifest-path apps/frontend/src-tauri/Cargo.toml` succeeds.
    - `grep -E "^(btleplug|gilrs|tokio|tauri)\\s*=" apps/frontend/src-tauri/Cargo.toml | wc -l | tr -d ' '` is unchanged from before this task (no accidental edits to other dependencies — capture this count manually before running cargo add).
  </acceptance_criteria>
  <verify>
    <automated>cargo build --manifest-path apps/frontend/src-tauri/Cargo.toml 2>&amp;1 | tail -10 &amp;&amp; grep -E "^regex" apps/frontend/src-tauri/Cargo.toml</automated>
  </verify>
  <done>
    `regex` is in the `[dependencies]` section of
    `apps/frontend/src-tauri/Cargo.toml`. Build succeeds.
  </done>
</task>

<task type="auto">
  <name>Task 2: Relax ble_send validation with regex + pwm range check</name>
  <files>apps/frontend/src-tauri/src/ble/mod.rs</files>
  <read_first>
    @apps/frontend/src-tauri/src/ble/mod.rs (full file — current `ble_send` is at lines 19–33; the rest of the module stays unchanged)
  </read_first>
  <action>
    Modify `apps/frontend/src-tauri/src/ble/mod.rs`:

    1. Replace the validation block at lines 25–30 (the `if command.len() != 1`
       check and its early-return error). Keep the function signature, the
       `state.port().write(command.as_bytes()).await` call on the accept path,
       and the `#[tauri::command]` attribute exactly as they are.

    2. New validation logic, in order:
       a. Module-level: declare a compiled regex behind a `LazyLock` (preferred,
          available in toolchain 1.95) or `OnceLock`. Pattern:
          `^[FBLR]\d{2,3}\n$|^S\n$`. Name the static `BLE_COMMAND_RE` (or similar
          ALL_CAPS).
          - For `LazyLock`: `static BLE_COMMAND_RE: std::sync::LazyLock<regex::Regex> = std::sync::LazyLock::new(|| regex::Regex::new(r"^[FBLR]\d{2,3}\n$|^S\n$").expect("static regex compiles"));`
          - `expect("static regex compiles")` is acceptable here because the
            pattern is a compile-time constant; a panic at module-load time is
            the intended behavior on a developer typo. Document with a brief
            comment.
       b. Inside `ble_send`, first check `BLE_COMMAND_RE.is_match(&command)`. If
          it does not match, return
          `Err(format!("Invalid BLE payload {:?}: expected '<dir><pwm>\\n' with dir in F|B|L|R and pwm in 80..=255, or 'S\\n'", command))`.
       c. If the payload matches AND the first byte is `S`, accept (fall through
          to the write call).
       d. If the payload matches AND the first byte is one of `F B L R`, parse
          the pwm substring: `let pwm_str = &command[1..command.len() - 1];` (drop
          the leading direction char and the trailing newline). Parse with
          `pwm_str.parse::<u16>()`. On parse error (should be unreachable
          because the regex already constrained to digits), return an `Err`
          with the same descriptive shape as above. On parse success, check
          `pwm < 80 || pwm > 255` and reject with a range-specific error
          mentioning the rejected payload and the valid range `80..=255`. Use
          `u16` for the parse to comfortably accept `999` without overflow
          before the range check fires.

    3. Accept path: `state.port().write(command.as_bytes()).await` — unchanged
       from the existing line 32. Pass the entire `command` (including the
       trailing newline) as the byte slice.

    4. Add `#[cfg(test)] mod tests { … }` at the bottom of the file with the
       tests specified in Task 3. (The test module needs no fake
       `BluetoothPort` — see Task 3 for the strategy of testing the validation
       layer in isolation.)

    5. Do NOT modify `ble_connect`, `get_invert_state`, or `toggle_invert`. Do
       NOT change the `use` block at the top except to add what the new code
       needs (e.g. `use std::sync::LazyLock;` if used, `use regex::Regex;`).
  </action>
  <acceptance_criteria>
    - `grep -n "command.len() != 1" apps/frontend/src-tauri/src/ble/mod.rs` returns no matches (the old validation is gone).
    - `grep -n "BLE_COMMAND_RE\\|regex::Regex::new" apps/frontend/src-tauri/src/ble/mod.rs` matches at least one line (the static is declared).
    - `grep -n "\\^\\[FBLR\\]\\\\d{2,3}\\\\n\\$" apps/frontend/src-tauri/src/ble/mod.rs` matches the regex literal (verify the exact pattern is present).
    - `grep -n "state.port().write(command.as_bytes())" apps/frontend/src-tauri/src/ble/mod.rs` still matches (accept-path call preserved).
    - `cargo build --manifest-path apps/frontend/src-tauri/Cargo.toml` succeeds.
    - `cargo clippy --manifest-path apps/frontend/src-tauri/Cargo.toml --all-targets -- -D warnings` is clean for `ble/mod.rs`.
  </acceptance_criteria>
  <verify>
    <automated>cargo build --manifest-path apps/frontend/src-tauri/Cargo.toml 2>&amp;1 | tail -10 &amp;&amp; cargo clippy --manifest-path apps/frontend/src-tauri/Cargo.toml --all-targets -- -D warnings 2>&amp;1 | tail -20</automated>
  </verify>
  <done>
    `ble_send` validates payloads against `^[FBLR]\d{2,3}\n$|^S\n$` plus a
    numeric range check on `pwm` (`80..=255`). Accept-path delegation to
    `state.port().write` is byte-identical. Build and clippy are clean.
  </done>
</task>

<task type="auto">
  <name>Task 3: Unit tests for ble_send validation (extract validator if needed)</name>
  <files>apps/frontend/src-tauri/src/ble/mod.rs</files>
  <read_first>
    @apps/frontend/src-tauri/src/ble/mod.rs (full file, post-Task 2)
  </read_first>
  <action>
    Testing the full `ble_send` Tauri command directly requires constructing a
    `tauri::State<BleState>` which is awkward in unit tests. To keep tests
    pure-Rust, extract the validation logic into a small pure helper alongside
    `ble_send` (no behavior change for the IPC path):

    1. Add a private function inside `ble/mod.rs`:
       ```
       fn validate_ble_payload(command: &str) -> Result<(), String> {
           // body: regex check + pwm-range check, returning the same Err
           // messages as the inline check in ble_send.
       }
       ```
       Rewrite `ble_send` to call this helper:
       ```
       validate_ble_payload(&command)?;
       state.port().write(command.as_bytes()).await
       ```
       so the validation logic is unit-testable without Tauri state.

    2. In `#[cfg(test)] mod tests`:

       Accept-path tests (must all return `Ok(())`):
       a. `accepts_forward_minimum` — `validate_ble_payload("F80\n")` is `Ok(())`.
       b. `accepts_forward_default` — `"F150\n"` is `Ok(())`.
       c. `accepts_forward_max` — `"F255\n"` is `Ok(())`.
       d. `accepts_all_directions` — iterate over `["F", "B", "L", "R"]`, build `format!("{}138\n", dir)`, assert `Ok(())` for each.
       e. `accepts_stop` — `"S\n"` is `Ok(())`.
       f. `accepts_two_digit_pwm` — `"F80\n"`, `"L99\n"`, `"R85\n"` all `Ok(())`.

       Reject-path tests (must all return `Err`, and the error message should mention either the rejected payload or the expected format):
       g. `rejects_empty_string` — `validate_ble_payload("")` is `Err`.
       h. `rejects_legacy_single_char` — `"F"`, `"B"`, `"L"`, `"R"` all `Err` (the old 5-char protocol no longer validates without `\n`).
       i. `rejects_no_newline` — `"F138"` is `Err`.
       j. `rejects_lowercase_direction` — `"f138\n"`, `"s\n"` are `Err`.
       k. `rejects_invalid_direction_char` — `"X138\n"`, `"Z80\n"` are `Err`.
       l. `rejects_pwm_below_range` — `"F00\n"`, `"F01\n"`, `"F79\n"` are `Err` and the error message contains the substring `80` and `255` (range hint).
       m. `rejects_pwm_above_range` — `"F256\n"`, `"F999\n"` are `Err`.
       n. `rejects_extra_data_after_newline` — `"F138\nB255\n"` is `Err` (regex `$` anchor enforces single command). This is the T-20-08 mitigation.
       o. `rejects_extra_text_before` — `" F138\n"`, `"!F138\n"` are `Err` (leading whitespace / garbage is rejected by `^` anchor).
       p. `rejects_huge_payload` — `validate_ble_payload(&format!("F{}\n", "1".repeat(100)))` is `Err` and does not panic.
       q. `rejects_unicode_garbage` — `validate_ble_payload("F💩\n")` and `validate_ble_payload("Ｆ138\n")` (full-width F) are both `Err`.
       r. `accept_path_byte_identical` — assert `format!("F138\n").as_bytes()` equals `&[0x46, 0x31, 0x33, 0x38, 0x0A]` (defensive: catches accidental Unicode normalization of the literal).

    3. Tests use `std`-only assertions plus `assert!(matches!(...))` /
       `assert_eq!`. No new dev-dependencies.

    Note: This task does NOT test the BLE write itself — that requires a mock
    `BluetoothPort` and lands in Phase 21 alongside the gilrs_adapter rewrite.
    Phase 20 scope is validation only.
  </action>
  <acceptance_criteria>
    - `grep -n "fn validate_ble_payload" apps/frontend/src-tauri/src/ble/mod.rs` matches one line (helper extracted).
    - `grep -n "validate_ble_payload(&command)" apps/frontend/src-tauri/src/ble/mod.rs` matches one line inside `ble_send` (helper is actually called).
    - `grep -c "fn accepts_\\|fn rejects_\\|fn accept_path_byte_identical" apps/frontend/src-tauri/src/ble/mod.rs` ≥ 18 (the 18 test functions).
    - `cargo test --manifest-path apps/frontend/src-tauri/Cargo.toml --lib ble::tests` passes all new tests.
    - `cargo test --manifest-path apps/frontend/src-tauri/Cargo.toml` (full suite) passes (no regressions).
  </acceptance_criteria>
  <verify>
    <automated>cargo test --manifest-path apps/frontend/src-tauri/Cargo.toml --lib -- ble::tests 2>&amp;1 | tail -60 &amp;&amp; cargo test --manifest-path apps/frontend/src-tauri/Cargo.toml 2>&amp;1 | tail -10</automated>
  </verify>
  <done>
    Private `validate_ble_payload` helper exists and is called from `ble_send`.
    Eighteen unit tests cover accept and reject branches including the regex
    anchors, pwm range, case sensitivity, multi-command injection, and oversize
    payloads. All tests pass. Full suite is green.
  </done>
</task>

</tasks>

<verification>
- `cargo build --manifest-path apps/frontend/src-tauri/Cargo.toml` succeeds.
- `cargo test --manifest-path apps/frontend/src-tauri/Cargo.toml` passes (all pre-existing + tests from plan 20-01 + tests from plan 20-02 (if 20-02 has merged) + 18 new ble tests).
- `cargo clippy --manifest-path apps/frontend/src-tauri/Cargo.toml --all-targets -- -D warnings` is clean for `ble/mod.rs` and `Cargo.toml`.
- `cargo fmt --manifest-path apps/frontend/src-tauri/Cargo.toml -- --check` reports no diff.
- `git diff --name-only apps/frontend/src-tauri/src/adapters/gilrs_adapter.rs apps/frontend/src-tauri/src/gamepad/mod.rs apps/frontend/src-tauri/src/domain/direction.rs` shows only `domain/direction.rs` may differ (from plan 20-01 / 20-02 changes), and `adapters/gilrs_adapter.rs` + `gamepad/mod.rs` are unchanged in this plan.
- The Tauri command signature of `ble_send` is preserved: `grep -n "pub async fn ble_send" apps/frontend/src-tauri/src/ble/mod.rs` shows the same signature `(_app: AppHandle, state: tauri::State<'_, BleState>, command: String) -> Result<(), String>`.
</verification>

<success_criteria>
- `ble_send` accepts `^[FBLR]\d{2,3}\n$` (with `pwm ∈ 80..=255`) and `^S\n$`, rejects everything else with a descriptive `Err(String)`.
- The regex is compiled exactly once (via `LazyLock` or `OnceLock`); not per call.
- The accept-path call to `state.port().write(command.as_bytes()).await` is byte-identical to the previous behavior.
- 18 new unit tests cover accept and reject branches; full test suite is green.
- `regex` crate is in `[dependencies]` of `apps/frontend/src-tauri/Cargo.toml` (added via `cargo add`, not hand-edited).
- No other files in the repository are modified.
</success_criteria>

<output>
After completion, create `.planning/phases/20-protocol-domain/20-03-SUMMARY.md` capturing:
- Regex pattern adopted and pwm range check rationale
- `validate_ble_payload` helper extraction note
- 18 test names added (accept + reject)
- Confirmation that `state.port().write` accept-path is byte-identical
- Confirmation that `gilrs_adapter.rs` and `gamepad/mod.rs` are unchanged
</output>

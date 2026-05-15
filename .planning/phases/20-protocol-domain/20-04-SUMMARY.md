---
phase: 20-protocol-domain
plan: 04
subsystem: frontend
tags: [typescript, react, tauri-ipc, ble, wire-format, gap-closure, threat-mitigation]

# Dependency graph
requires:
  - phase: 20-protocol-domain
    provides: "Plan 20-03 BLE validator (`^[FBLR]\\d{2,3}\\n$|^S\\n$`, pwm 80..=255) — this FE shim produces only payloads in that accept-set"
provides:
  - "Pure FE encoder `encodeCommand(direction: Direction): string` mapping every Direction to the Phase-20 BLE wire format"
  - "useBluetooth.send now encodes the wire payload before crossing IPC; legacy single-char emission removed"
  - "useBluetooth.send chains `.catch(setError)` on invoke — IPC rejections (validator errors, mid-write BLE drops, missing characteristic) surface via the existing bleError state instead of being silently swallowed"
  - "DEFAULT_PWM = 150 placeholder for the FE shim (firmware default per PROJECT.md, within validator accept range)"
  - "TypeScript exhaustiveness check (`never` assertion in encodeCommand default branch) forces a build failure if Direction widens — T-20-15 mitigation"
affects:
  - "phase 21 (gilrs_adapter rewrite) — when adapter emits its own wire-format payload, this FE encoder + send wrapper retires in a single commit; no debt accumulates"
  - "phase 22 (frontend Command type) — the FE-side wire encoder is the staging ground for the future Command-typed send(Command) per REQ-SPD-10"

# Tech tracking
tech-stack:
  added: []  # No new deps — pure TS + existing Vitest harness
  patterns:
    - "Exhaustiveness-checked switch on a Direction discriminated string-union: `const _exhaustive: never = direction` in default"
    - "Defense-in-depth rejection surfacing: `invoke(...).catch(setError)` on fire-and-forget IPC, so silent-failure modes get caught by the UI"
    - "Module-scope constant (DEFAULT_PWM) over function-local literal — keeps the temporary placeholder visible to future grep / Phase 21 cleanup"

key-files:
  created:
    - "apps/frontend/src/lib/encode-command.ts (29 lines)"
    - "apps/frontend/src/lib/encode-command.test.ts (12 unit tests)"
  modified:
    - "apps/frontend/src/hooks/use-bluetooth.ts (send body rewrite + 2 imports)"
    - "apps/frontend/src/hooks/use-bluetooth.test.ts (2 assertions updated; 2 tests added)"
    - ".planning/phases/20-protocol-domain/20-UAT.md (appended ## Closure Attempt; ## Gaps and frontmatter preserved verbatim)"

key-decisions:
  - "Closed the UAT gap with a FE-only shim. Re-widening the Rust validator was explicitly out — it would defeat the T-20-08..T-20-14 STRIDE mitigations 20-03 shipped. Pulling Phase 21's adapter rewrite forward would have re-done work already scheduled and forced the gamepad IPC types to widen prematurely."
  - "DEFAULT_PWM = 150 chosen as the constant FE placeholder. Within validator range 80..=255 and matches firmware default per PROJECT.md. Phase 21's analog speed support replaces it."
  - "Encoder is the boundary, NOT App.sendCommand. Both producers (ControlPad click and gamepad-direction event) converge through useBluetooth.send, so one encoder at the hook boundary closes both UAT gaps."
  - "Rejection-surfacing test asserts a substring (`toContain(\"Invalid BLE payload\")`) not the exact validator error, so future T-20-14-compliant tweaks to the validator error string don't break it. The contract under test is 'rejection surfaces via error', not the wording."
  - "send parameter type tightened from `data: string` to `direction: Direction`. All existing call sites pass Direction so it's a no-op at the boundary but makes the contract explicit for future callers."
  - "Inline execution chosen over gsd-executor subagent. Single plan, FE-only, no Rust/cargo-build cost, no parallelization win."

patterns-established:
  - "Wire-format encoder placement: pure module under apps/frontend/src/lib/ with module-scope constants + a single exhaustive switch — mirrors apply-direction-inversion.ts in style and testability"
  - "Vitest table-style assertion for variant unions: `for (const d of [\"F\",\"B\",\"L\",\"R\"] as const) expect(...).toBe(true)` instead of writing four near-identical it() blocks"
  - "Surface-on-rejection contract for fire-and-forget IPC: any `void invoke(...)` is a smell now that the validator can reject — chain `.catch(setError)` instead"

requirements-completed: [REQ-SPD-03]

# Metrics
duration: 4min
completed: 2026-05-15
---

# Phase 20 Plan 04: FE Wire Encoder Summary

**FE-only gap closure for Phase 20 UAT Tests 4 / 5. Added `encodeCommand(Direction): string` and wired it into `useBluetooth.send`; chained `.catch(setError)` so future producer/validator regressions surface in the UI instead of being silently swallowed by `void invoke(...)`.**

## Performance

- **Duration:** ~4 min
- **Tasks:** 3 (all completed)
- **Files modified:** 5 (2 new TS sources, 1 hook + 1 hook-test rewrite, 1 UAT note)
- **Commits:** 3 atomic (feat / fix / docs)
- **Test count delta:** +14 (12 new in encode-command.test.ts, +2 net in use-bluetooth.test.ts)

## Accomplishments

- **UAT root cause addressed in code.** The two `## Gaps` entries in 20-UAT.md (Test 4 ControlPad, Test 5 gamepad) shared one FE-side root cause: `useBluetooth.send` emitted legacy single-char payloads after Plan 20-03 tightened the validator. The encoder eliminates that mismatch. The Phase-20 validator's STRIDE mitigations stay intact server-side.
- **Silent-failure mode killed.** `void invoke("ble_send", { command: data })` swallowed every validator rejection. The new `.catch` populates the existing bleError state — the user can now see why the robot didn't move (T-20-16).
- **Type-system enforced exhaustiveness.** The `default` branch of the encoder's switch contains `const _exhaustive: never = direction`. Future widening of Direction (e.g. adding diagonals) breaks the FE build at compile time (T-20-15).
- **No regressions, no scope creep.** `git diff` against the plan's base commit shows ONLY the five files listed under `key-files`. apps/frontend/src-tauri/, app.tsx, control-pad.tsx, use-gamepad.ts, and types.ts are byte-identical. ble::tests count remains 18.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create encode-command.ts + unit tests** — `706d1c49` (feat)
   - 2 new files under `apps/frontend/src/lib/`.
   - 12 Vitest unit tests cover every Direction input, the regex contract, the newline byte, and the DEFAULT_PWM range invariant.
2. **Task 2: Wire encoder into useBluetooth.send and surface IPC rejections** — `731b1e35` (fix)
   - Added `import { encodeCommand }` and `import type { Direction }` (lefthook prettier reordered the latter to a top-of-file `import type` group — intentional, kept).
   - send body rewritten: encodes via encodeCommand then `invoke(...).catch(setError)`. setState is NOT touched on send failure (StatusBar mirrors `ble-state-changed` events from Rust, not IPC outcomes).
   - Test assertions for F / B updated to `F150\n` / `B150\n`; new tests pin `S\n` and the rejection-surfacing path.
3. **Task 3: Full-suite sweep + UAT closure note** — `c458b6ce` (docs)
   - `just check` + `cargo test` + `pnpm exec prettier --check .` (from repo root) all exit 0.
   - Appended `## Closure Attempt` to `20-UAT.md` with date, rationale, verification commands, and the hardware regression steps the user must run. `## Gaps` block and `status: diagnosed` frontmatter preserved verbatim.

## Files Created/Modified

- `apps/frontend/src/lib/encode-command.ts` — new. Pure FE encoder. Exports `encodeCommand` + `DEFAULT_PWM`.
- `apps/frontend/src/lib/encode-command.test.ts` — new. 12 Vitest cases pinning wire-format outputs against the Phase-20 validator regex.
- `apps/frontend/src/hooks/use-bluetooth.ts` — modified. send signature is now `(direction: Direction)`; body encodes + `.catch(setError)`. Return shape unchanged (additive-only per CLAUDE.md).
- `apps/frontend/src/hooks/use-bluetooth.test.ts` — modified. Two existing payload assertions updated; two new tests (rejection surfacing + Stop wire payload).
- `.planning/phases/20-protocol-domain/20-UAT.md` — appended `## Closure Attempt` only.

## Decisions Made

- **FE shim over adapter rewrite.** Phase 21 owns the gilrs_adapter rewrite (REQ-SPD-04..08) and the IPC payload widening to `pwm: number | null`. Pulling that forward would have re-done scheduled work, forced premature widening of the gamepad event shape, and not unblocked UAT any sooner than this 30-line FE encoder.
- **Validator NOT re-widened.** Plan 20-03 shipped T-20-08..T-20-14 mitigations through the regex anchors and pwm range check. Loosening the validator to accept bare `F` again would have defeated every one of those mitigations.
- **Encoder at the hook boundary, not the call site.** ControlPad and the gamepad event both converge through useBluetooth.send. Placing encodeCommand at App.sendCommand or inside ControlPad would have left the second producer (gamepad path) unfixed. One encoder at the hook boundary closes both gaps.
- **No setState on send failure.** A ble_send rejection means the IPC call failed, not necessarily that the radio dropped. StatusBar reflects `ble-state-changed` events emitted by Rust — those still arrive correctly. Surfacing via setError is enough.
- **Substring assertion on the rejection-surfacing test.** `toContain("Invalid BLE payload")` instead of `toBe(<exact message>)` keeps the test from breaking when 20-03's T-20-14-scrubbed error string is reworded in a future phase. The contract under test is the surfacing pathway, not the wording.
- **Inline execution over subagent dispatch.** Plan is FE-only, 3 atomic tasks, no Rust build cost, no parallelizable plans. The cost of spawning gsd-executor exceeded the cost of inline execution.

## Deviations from Plan

- **Prettier command corrected from `pnpm --filter @ks0555/frontend exec prettier --check .` to `pnpm exec prettier --check .` (run from repo root).** The plan's filtered form changes CWD to `apps/frontend/`, where the workspace's allowlist-style `.prettierignore` patterns (`!apps/`, `!apps/*/src/`) no longer match. The filtered form fails because cargo target/ artifacts under `apps/frontend/src-tauri/target/` leak into prettier's scan. Running prettier from repo root resolves the patterns correctly. Same gate intent, correct invocation. No behavioral change.
- **Linter (lefthook pre-commit) reordered the `import type { Direction }` line into the top-of-file `import` group during Task 2's commit.** Functionally identical, intentional, kept.

## Issues Encountered

- One initial mis-invocation of eslint / prettier (passed `apps/frontend/src/lib/...` paths to `pnpm --filter @ks0555/frontend exec`, which already changes CWD to `apps/frontend/`). Corrected to `src/lib/...` and got clean exits. Caught before commit; no commit pollution.

## Threat Mitigation Coverage

Per the plan's `<threat_model>` STRIDE register:

| Threat ID | Category | Mitigation in this plan | Test asserting it |
|-----------|----------|--------------------------|--------------------|
| T-20-08..T-20-12, T-20-14 | (carried over from 20-03) | NO change to validator; FE encoder produces only payloads in the validator's accept-set, so the existing Rust-side mitigations remain the authoritative defense. Validator regex + pwm range untouched. | `cargo test ble::tests` (18/18 pass) — unchanged |
| T-20-15 | Tampering (FE) — caller passes non-Direction input to encoder | `encodeCommand(direction: Direction): string` typed at the signature; `const _exhaustive: never = direction` in the default switch branch breaks the TypeScript build if Direction is widened to include a variant the encoder doesn't handle | `grep -c "never" apps/frontend/src/lib/encode-command.ts == 1`; `tsc --noEmit` passes |
| T-20-16 | Repudiation / silent failure — useBluetooth.send swallows invoke rejection via `void invoke(...)` | `void invoke(...)` removed; new form is `invoke(...).catch(e => setError(msg))`. Validator rejections, mid-write BLE drops, missing characteristics all now surface through the bleError UI state | `it("send() surfaces invoke rejection via error state")` in use-bluetooth.test.ts |
| T-20-17 | Information disclosure (FE) — setError could leak Rust internals | accept — the Rust validator error already passes T-20-14 scrubbing (no MAC/UUID/state). FE only forwards what Rust returned. No additional scrubbing on the FE side. | n/a (disposition `accept`) |
| T-20-18 | Tampering — future component bypasses encoder via direct `invoke("ble_send", ...)` | accept — Tauri allowlist exposes ble_send; server-side validator is the authoritative defense regardless of FE caller | n/a (disposition `accept`) |

## Verification Snapshot

Run from this worktree on completion:

```bash
# Plan-level verifications
just check                                                                         # ✓ format / typecheck / lint / test all green (229 frontend tests)
cargo test --manifest-path apps/frontend/src-tauri/Cargo.toml                      # ✓ Rust suite green; ble::tests count == 18
pnpm exec prettier --check .                                                       # ✓ All matched files use Prettier code style (run from repo root)

# Scope-boundary verifications
git diff --name-only -- apps/frontend/src-tauri/ apps/frontend/src/app.tsx \
  apps/frontend/src/components/control-pad.tsx \
  apps/frontend/src/hooks/use-gamepad.ts apps/frontend/src/types.ts
# → empty diff: out-of-scope files unchanged

# Acceptance-criteria spot checks
grep -c "^export " apps/frontend/src/lib/encode-command.ts                         # ≥ 2 (encodeCommand + DEFAULT_PWM)
grep -c "^export default" apps/frontend/src/lib/encode-command.ts                  # 0
grep -c "^import type " apps/frontend/src/lib/encode-command.ts                    # ≥ 1
grep -c "never" apps/frontend/src/lib/encode-command.ts                            # ≥ 1 (T-20-15)
grep -nE "^\s*void invoke\(" apps/frontend/src/hooks/use-bluetooth.ts              # no matches (T-20-16)
grep -nE "\.catch\(" apps/frontend/src/hooks/use-bluetooth.ts                      # ≥ 1
grep -c "^## Closure Attempt" .planning/phases/20-protocol-domain/20-UAT.md        # 1
grep -c "^## Gaps" .planning/phases/20-protocol-domain/20-UAT.md                   # 1 (preserved)
grep -c "status: diagnosed" .planning/phases/20-protocol-domain/20-UAT.md          # 1 (preserved)
```

## Out-of-Scope Files Confirmation

Per the plan's no-touch list (Phase 21's adapter; Rust validator; types.ts; app.tsx; control-pad.tsx; use-gamepad.ts), git diff against base `4d324913` (the plan-add commit) returns ONLY:

```
.planning/phases/20-protocol-domain/20-UAT.md
apps/frontend/src/hooks/use-bluetooth.test.ts
apps/frontend/src/hooks/use-bluetooth.ts
apps/frontend/src/lib/encode-command.test.ts
apps/frontend/src/lib/encode-command.ts
```

`apps/frontend/src-tauri/` is byte-identical. The ble::tests count remains at 18; the validator is unchanged.

## Hardware Regression — OUTSTANDING (User-Owned)

This plan is NOT considered closed until the user runs the hardware regression documented under `regression_required` in `20-UAT.md`'s `## Closure Attempt` block. The frontmatter `status: diagnosed` stays as-is — gsd-verifier (or the user) toggles it to `closed` after Tests 4 and 5 transition from `issue` to `pass` on real hardware (BT24 + Steam Deck or gamepad).

Specifically the user must:
1. Run `pnpm dev` (or the installed Flatpak on the Deck).
2. Connect Bluetooth and wait for the StatusBar to reach connected.
3. Re-run UAT Test 4 (ControlPad button clicks drive the robot).
4. Re-run UAT Test 5 (gamepad triggers / stick drive the robot).
5. Bonus T-20-16 visibility check from the WebView devtools: `window.__TAURI_INTERNALS__.invoke('ble_send', { command: 'X' })` should now populate the bleError area below the Connect button. Before this plan, it did not.

## Known Stubs

- **DEFAULT_PWM = 150 is a temporary FE placeholder.** Phase 21's `gilrs_adapter` rewrite will emit analog `(direction, pwm)` payloads and Phase 22 will retire this encoder + the send wrapper in a single commit. No technical debt accumulates: when the adapter emits its own wire-format string (or when send(Command) lands per REQ-SPD-10), encode-command.ts + the send-side encode call can be deleted, and the validator stays unchanged.

## User Setup Required

None — no external service configuration, no env vars, no manual steps beyond the hardware regression listed above.

## Next Phase Readiness

- **Phase 21 (Gamepad Adapter & IPC) unblocked from the FE side.** When the adapter starts emitting wire-format payloads directly via a widened gamepad-direction event, use-bluetooth.send's encoder call can be retired in the same commit as that adapter change. The `.catch(setError)` defense-in-depth stays.
- **Phase 22 (FE Command type) unblocked.** This plan deliberately did NOT touch `apps/frontend/src/types.ts`. The Command type lands in Phase 22 per REQ-SPD-10. The FE encoder's API surface (`encodeCommand(direction: Direction): string`) is the staging ground for the future `encodeCommand(command: Command): string` overload.

## Self-Check: PASSED

- File `apps/frontend/src/lib/encode-command.ts` — FOUND.
- File `apps/frontend/src/lib/encode-command.test.ts` — FOUND.
- `grep -c "^export " apps/frontend/src/lib/encode-command.ts` ≥ 2 — VERIFIED (2 exports).
- `grep -c "^export default" apps/frontend/src/lib/encode-command.ts` == 0 — VERIFIED.
- `grep -c "^import type " apps/frontend/src/lib/encode-command.ts` ≥ 1 — VERIFIED.
- `grep -c "never" apps/frontend/src/lib/encode-command.ts` ≥ 1 — VERIFIED.
- `grep -nE "^\s*void invoke\(" apps/frontend/src/hooks/use-bluetooth.ts` — NONE.
- `grep -nE "\.catch\(" apps/frontend/src/hooks/use-bluetooth.ts` — VERIFIED ≥ 1.
- `grep -n "encodeCommand" apps/frontend/src/hooks/use-bluetooth.ts` — VERIFIED 2 lines (import + call site).
- `git diff --name-only -- apps/frontend/src-tauri/` — EMPTY.
- 12 tests in encode-command.test.ts — PASSING.
- 15 tests in use-bluetooth.test.ts (13 prior + 2 new) — PASSING.
- 229 frontend tests across 13 files — PASSING.
- Full `cargo test` — PASSING; ble::tests unchanged at 18.
- `pnpm exec prettier --check .` from repo root — CLEAN.
- Commits `706d1c49` / `731b1e35` / `c458b6ce` — FOUND in `git log --all`.
- `## Closure Attempt` in 20-UAT.md, `## Gaps` preserved, `status: diagnosed` preserved — VERIFIED.

---
*Phase: 20-protocol-domain*
*Plan: 04 — FE wire-format encoder (gap closure)*
*Completed: 2026-05-15*

---
phase: 20
plan: 04
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/frontend/src/lib/encode-command.ts
  - apps/frontend/src/lib/encode-command.test.ts
  - apps/frontend/src/hooks/use-bluetooth.ts
  - apps/frontend/src/hooks/use-bluetooth.test.ts
  - .planning/phases/20-protocol-domain/20-UAT.md
autonomous: true
gap_closure: true
requirements:
  - REQ-SPD-03
must_haves:
  truths:
    - "Clicking F/B/L/R/S on the on-screen ControlPad makes the robot drive in that direction (Test 4 UAT pass)."
    - "Pressing R2/L2 or pushing the left stick on a connected gamepad makes the robot drive (Test 5 UAT pass)."
    - "Every payload that reaches the Tauri ble_send IPC matches the Phase-20 wire-format regex."
    - "When ble_send rejects a payload, the rejection reason surfaces in the React UI via the existing bleError state."
    - "Hook return shape of useBluetooth is unchanged (additive-only per CLAUDE.md). useGamepad is untouched."
    - "Plan 21 is unaffected: gilrs_adapter.rs, domain/direction.rs, IPC payload names, gamepad event shape — none of these change in this plan."
  artifacts:
    - path: "apps/frontend/src/lib/encode-command.ts"
      provides: "Pure FE wire-format encoder mapping Direction to Phase-20 wire string"
      exports: ["encodeCommand", "DEFAULT_PWM"]
    - path: "apps/frontend/src/lib/encode-command.test.ts"
      provides: "Unit tests pinning wire format against the Rust validator regex"
      contains: "describe"
    - path: "apps/frontend/src/hooks/use-bluetooth.ts"
      provides: "send(Direction) now encodes via encodeCommand and catches invoke rejections via setError"
      contains: "encodeCommand"
    - path: "apps/frontend/src/hooks/use-bluetooth.test.ts"
      provides: "Tests asserting send(F) calls invoke ble_send with F150 newline payload and rejection surfaces in error state"
      contains: "F150"
  key_links:
    - from: "useBluetooth.send"
      to: "encode-command.encodeCommand"
      via: "synchronous function call before invoke ble_send"
      pattern: "encodeCommand\\("
    - from: "useBluetooth.send"
      to: "Tauri IPC ble_send"
      via: "invoke ble_send with encodeCommand output then .catch"
      pattern: "invoke\\(\"ble_send\""
    - from: "useBluetooth.send catch"
      to: "setError"
      via: ".catch arrow then setError"
      pattern: "\\.catch\\("
---

## Gap Closure Summary

Phase 20 plan 20-03 tightened `ble_send` to require wire-format payloads matching `^[FBLR]\d{2,3}\n$|^S\n$`, but the two upstream producers (FE `useBluetooth.send` and Rust `gilrs_adapter.emit_direction`) were left emitting legacy single-char `Direction` payloads. The new validator rejects every motion command. `useBluetooth.send` uses `void invoke(...)` with no `.catch`, so rejections are silently swallowed — the UI updates correctly via separate state paths (`setLastCommand`, gamepad event listener) while the robot stays still.

This plan closes both UAT gaps (Test 4 ControlPad, Test 5 gamepad) with the minimum FE-only slice:

1. A pure FE encoder (`encode-command.ts`) maps `Direction` to the Phase-20 wire format using `DEFAULT_PWM = 150` (firmware default per `.planning/PROJECT.md` Context section; inside the validator's 80..=255 accept range).
2. `useBluetooth.send` calls the encoder before crossing IPC.
3. `useBluetooth.send` installs a `.catch` on the invoke promise so future producer/validator mismatches surface in the existing `bleError` UI state (defense-in-depth against the swallowing bug that masked this regression).

### Scope decision — why FE-only, why not pull Phase 21 forward

- The FE side already converges every producer through `useBluetooth.send` (ControlPad click → App.sendCommand → send; gamepad → useGamepad.direction → App useEffect → sendCommand → send). One encoder at the hook boundary closes both gaps.
- Phase 21's deliverable (REQ-SPD-04..08) is the gilrs_adapter rewrite to emit analog `(direction, pwm)`, the IPC payload widening (`pwm: number | null`), and coalesce-on-`(dir, pwm_bucket)`. Pulling it forward would re-do work scheduled for Phase 21, require the FE `useGamepad` IPC types to widen prematurely, and would not unblock the UAT any sooner than this FE shim.
- The FE encoder is a clean shim: when Phase 21 lands and the adapter emits `F150\n` directly via a new event payload, OR when Phase 22 wires `useBluetooth.send(Command)` per REQ-SPD-10, the encoder + this `send` wrapper retires in a single commit. No technical debt accumulates.
- Re-widening the Rust validator was explicitly ruled out: it would defeat the T-20-08..T-20-14 STRIDE mitigations that plan 20-03 shipped.

### What this plan does NOT touch

- `apps/frontend/src-tauri/src/adapters/gilrs_adapter.rs` (Phase 21 owns this)
- `apps/frontend/src-tauri/src/ble/mod.rs` (validator is correct as-shipped)
- `apps/frontend/src-tauri/src/domain/direction.rs` (Command, compute_*_command, quantize_pressure already in place)
- `apps/frontend/src/hooks/use-gamepad.ts` (gamepad IPC contract is Phase 21's concern)
- `apps/frontend/src/app.tsx` (stays thin per CLAUDE.md; already passes Direction to send)
- `apps/frontend/src/components/control-pad.tsx` (BUTTONS still emits bare Direction)
- `apps/frontend/src/types.ts` (the FE Command type lands in Phase 22)

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/20-protocol-domain/20-UAT.md
@.planning/debug/controlpad-robot-no-response.md
@.planning/debug/gamepad-robot-no-response.md
@.planning/phases/20-protocol-domain/20-03-SUMMARY.md
@apps/frontend/src-tauri/src/ble/mod.rs
@apps/frontend/src/hooks/use-bluetooth.ts
@apps/frontend/src/hooks/use-bluetooth.test.ts
@apps/frontend/src/hooks/use-gamepad.ts
@apps/frontend/src/app.tsx
@apps/frontend/src/components/control-pad.tsx
@apps/frontend/src/types.ts
@apps/frontend/src/lib/apply-direction-inversion.ts
@apps/frontend/src/lib/is-tauri.ts
@CLAUDE.md
@.agents/rules/typescript.md

### Interfaces

Contracts the executor needs verbatim — no codebase exploration required.

From `apps/frontend/src/types.ts`:

    export type Direction = "F" | "B" | "L" | "R" | "S"

From `apps/frontend/src-tauri/src/ble/mod.rs` — the validator the FE must satisfy:

    BLE_COMMAND_RE = ^[FBLR]\d{2,3}\n$|^S\n$        // pwm range 80..=255

Accept-set: `F80\n` through `F255\n` (and B/L/R analog), plus exactly `S\n`.

From `apps/frontend/src-tauri/src/domain/direction.rs` — reference for `Command::Display`, which the FE encoder must mirror byte-for-byte for `Drive { dir, pwm: 150 }` and `Stop`:

    impl fmt::Display for Command {
        fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
            match self {
                Command::Drive { dir, pwm } => writeln!(f, "{}{}", dir.as_char(), pwm),
                Command::Stop => writeln!(f, "S"),
            }
        }
    }

From `apps/frontend/src/hooks/use-bluetooth.ts` — current shape:

    export function useBluetooth() {
      // ...
      const send = useCallback((data: string) => {
        if (!isTauri()) return
        void invoke("ble_send", { command: data })
      }, [])

      return {
        connected: state === "connected",
        connecting: state === "connecting",
        unsupported: false,
        connect,
        send,
        error,
      }
    }

The rejection-handling pattern to mirror, already in `connect`:

    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error("BLE connect failed:", e)
      setError(msg)
      setState("disconnected")
    }

Mirror error-extraction + `setError` in `send` (WITHOUT `setState("disconnected")` — a write failure does not necessarily mean BLE disconnected; the StatusBar reflects `ble-state-changed` events from Rust).

From `apps/frontend/src/lib/apply-direction-inversion.ts`:

    export function applyDirectionInversion(raw: Direction, inverted: boolean): Direction {
      if (!inverted) return raw
      if (raw === "F") return "B"
      if (raw === "B") return "F"
      return raw
    }

The encoder runs AFTER inversion in the call chain (callers already apply it). The encoder does NOT know about inversion.

From `apps/frontend/src/hooks/use-bluetooth.test.ts` — patterns to follow:

- `mockTauriInvoke.mockRejectedValue(new Error("..."))` for the rejection path
- `expect(mockTauriInvoke).toHaveBeenCalledWith("ble_send", { command: "F" })` for IPC-payload assertions — this plan UPDATES the existing `"send() calls invoke ble_send"` and `"send() calls invoke ble_send with B command"` cases so they expect `"F150\n"` and `"B150\n"`.

</context>

<threat_model>

### Trust Boundaries

| Boundary | Description |
|----------|-------------|
| ControlPad onClick / useGamepad.direction (untrusted FE state) → useBluetooth.send | Two FE producers funnel through `send`; this is where the FE-side encoder enforces the wire-format contract before bytes cross IPC |
| useBluetooth.send → Tauri ble_send IPC | Validated server-side by Phase-20 regex (already deployed); this plan ensures the FE side never emits a payload that would be rejected there |
| Tauri ble_send rejection → React UI (bleError) | New in this plan: rejections must NOT be swallowed. `.catch` + `setError` keeps silent-failure mode from masking future contract regressions |

### STRIDE Threat Register

Phase 20's BLE-side STRIDE register (T-20-08..T-20-14) is enforced server-side by `validate_ble_payload`. This plan adds FE producer hardening + FE-side surfacing.

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-20-08..T-20-12, T-20-14 | (carried over from plan 20-03) | validate_ble_payload | mitigate (already deployed) | NO change to validator; FE encoder produces only payloads in the validator's accept-set, so the existing mitigations remain the authoritative boundary |
| T-20-15 | Tampering (FE) | encodeCommand itself accepts a non-Direction input (e.g. caller passes "X" or null) | mitigate | encodeCommand is typed `(direction: Direction) => string` — TypeScript guards at compile time. Runtime exhaustiveness check (`never` assertion in the `default` branch) triggers a build failure if Direction is widened to include a new variant the encoder doesn't handle |
| T-20-16 | Repudiation / Silent failure | useBluetooth.send swallows invoke rejection via `void invoke(...)`, masking validator rejections, missing characteristics, BLE disconnects mid-write | mitigate | Replace `void invoke(...)` with `invoke(...).catch(e => setError(msg))`. Unit test asserts that a rejected mockTauriInvoke causes `result.current.error` to become the rejection message |
| T-20-17 | Information disclosure (FE) | The setError(msg) call could leak Rust internals if the validator error string changes shape in future phases | accept | Rust validator error already passes the T-20-14 scrub test (no MAC/UUID/state leakage). FE merely forwards what Rust returned. No additional scrubbing on the FE side |
| T-20-18 | Tampering | A future caller bypasses encodeCommand by calling `invoke("ble_send", { command: "F" })` directly from another React component | accept | The Tauri allowlist exposes ble_send; full FE-side mediation is out of scope. Server-side validator is the authoritative defense and will reject any malformed payload regardless of which FE caller produces it |

</threat_model>

<tasks>

<task type="auto">
  <name>Task 1: Create encode-command.ts encoder + unit tests</name>
  <files>apps/frontend/src/lib/encode-command.ts, apps/frontend/src/lib/encode-command.test.ts</files>
  <read_first>
@apps/frontend/src/types.ts — the Direction alias the encoder consumes
@apps/frontend/src-tauri/src/ble/mod.rs (lines 15-52) — regex + pwm-range contract the encoder must satisfy
@apps/frontend/src-tauri/src/domain/direction.rs (lines 42-55) — Rust Command::Display, the reference output format
@apps/frontend/src/lib/apply-direction-inversion.ts — style + structure of an existing single-purpose pure helper in lib/
@.agents/rules/typescript.md — no semicolons, 120-col, no any, no default exports, kebab-case filenames, top-level import type
  </read_first>
  <action>
Create two new files under `apps/frontend/src/lib/`.

A. `apps/frontend/src/lib/encode-command.ts`

Required structure (named exports only, no default export, no semicolons, Prettier 120-col, project TS conventions):

1. `import type { Direction } from "../types"` (top-level import type).
2. Export a const `DEFAULT_PWM` with explicit annotation `: number` and value `150`. Precede it with a JSDoc explaining: PWM 150 is the firmware default (per `.planning/PROJECT.md` Context section: "Default PWM 150 when omitted") and is within the Phase-20 validator accept range 80..=255. Note this is a temporary placeholder until Phase 21 wires analog `(direction, pwm)` through the gamepad adapter.
3. Export `encodeCommand(direction: Direction): string` with the required return-type annotation per `.agents/rules/typescript.md`:
   - `"S"` returns `"S\n"`.
   - `"F" | "B" | "L" | "R"` returns the template literal with `${direction}${DEFAULT_PWM}\n`.
   - Implement as a `switch (direction)` with a `default` branch containing an exhaustiveness check:

         const _exhaustive: never = direction
         throw new Error(`encodeCommand: unhandled Direction ${String(_exhaustive)}`)

     This forces a TypeScript build failure if Direction is widened to include a new variant the encoder does not cover (T-20-15 mitigation).
4. Add a one-line JSDoc on `encodeCommand` describing: encodes Direction to Phase-20 BLE wire format; Stop → `S\n`; F/B/L/R → `{dir}150\n`; output is byte-identical to Rust `Command::Display` for `Drive { dir, pwm: 150 }` / `Stop`.

Required output table (every value must match the Phase-20 validator):

| Input | Output bytes                        | Validator branch matched         |
|-------|-------------------------------------|----------------------------------|
| "F"   | F, 1, 5, 0, newline (5 bytes)       | `^[FBLR]\d{2,3}\n$` with pwm 150 |
| "B"   | B150 newline                        | as above                         |
| "L"   | L150 newline                        | as above                         |
| "R"   | R150 newline                        | as above                         |
| "S"   | S newline (2 bytes)                 | `^S\n$`                          |

Style rules (Prettier + ESLint flat config):
- No semicolons. No default export. Top-level `import type`. kebab-case filename. Template literals (not string concat). 120-col max. No `any`. No `as any`.

B. `apps/frontend/src/lib/encode-command.test.ts`

Vitest unit tests next to the source. Required cases inside a single `describe("encodeCommand")`:

- `it("encodes F to F150 newline")` — assert `encodeCommand("F") === "F150\n"`.
- `it("encodes B to B150 newline")`.
- `it("encodes L to L150 newline")`.
- `it("encodes R to R150 newline")`.
- `it("encodes S to S newline")` — assert `encodeCommand("S") === "S\n"`.
- `it("emits the trailing newline as a single 0x0A byte")` — for the F output assert the last char's `charCodeAt(0)` is `10`.
- `it("emits the Stop payload as exactly two bytes")` — assert `encodeCommand("S").length === 2`.
- `it("every directional output starts with the requested direction letter")` — loop over `["F","B","L","R"] as const` and assert `encodeCommand(d).startsWith(d)`.
- `it("every directional output ends with newline")` — same loop, assert `encodeCommand(d).endsWith("\n")`.
- `it("every directional output satisfies the BLE wire regex")` — same loop, assert `/^[FBLR]\d{2,3}\n$/.test(encodeCommand(d))` is true.
- `it("Stop payload satisfies the BLE Stop regex")` — assert `/^S\n$/.test(encodeCommand("S"))` is true.
- `it("DEFAULT_PWM is within the validator accept range")` — assert `DEFAULT_PWM >= 80 && DEFAULT_PWM <= 255`.

Test file imports:

    import { describe, expect, it } from "vitest"
    import { DEFAULT_PWM, encodeCommand } from "./encode-command"

No mocks, no React harness — pure synchronous assertions.

Commit (Conventional Commits, single commit for both new files): `feat(frontend): add encodeCommand wire-format encoder for BLE send path`. Lefthook commit-msg gate must pass.
  </action>
  <acceptance_criteria>
- File `apps/frontend/src/lib/encode-command.ts` exists.
- File `apps/frontend/src/lib/encode-command.test.ts` exists.
- `grep -c "^export " apps/frontend/src/lib/encode-command.ts` is at least 2 (encodeCommand and DEFAULT_PWM).
- `grep -c "^export default" apps/frontend/src/lib/encode-command.ts` is 0.
- `grep -c "^import type " apps/frontend/src/lib/encode-command.ts` is at least 1.
- `grep -c "never" apps/frontend/src/lib/encode-command.ts` is at least 1 (T-20-15).
- `pnpm --filter @ks0555/frontend test -- encode-command.test.ts` exits 0.
- `pnpm --filter @ks0555/frontend exec tsc --noEmit` exits 0.
- `pnpm --filter @ks0555/frontend exec eslint apps/frontend/src/lib/encode-command.ts apps/frontend/src/lib/encode-command.test.ts` exits 0.
- `pnpm --filter @ks0555/frontend exec prettier --check apps/frontend/src/lib/encode-command.ts apps/frontend/src/lib/encode-command.test.ts` exits 0.
  </acceptance_criteria>
  <verify>
    <automated>pnpm --filter @ks0555/frontend test -- encode-command.test.ts 2>&amp;1 | tail -30 &amp;&amp; pnpm --filter @ks0555/frontend exec tsc --noEmit 2>&amp;1 | tail -5 &amp;&amp; pnpm --filter @ks0555/frontend exec eslint apps/frontend/src/lib/encode-command.ts apps/frontend/src/lib/encode-command.test.ts 2>&amp;1 | tail -5 &amp;&amp; pnpm --filter @ks0555/frontend exec prettier --check apps/frontend/src/lib/encode-command.ts apps/frontend/src/lib/encode-command.test.ts 2>&amp;1 | tail -5</automated>
  </verify>
  <done>
encodeCommand and DEFAULT_PWM are exported. All five Direction inputs map to wire-format strings that match the Phase-20 validator regex. Unit tests, typecheck, ESLint, and Prettier are clean. Commit on the working branch.
  </done>
</task>

<task type="auto">
  <name>Task 2: Wire encodeCommand into useBluetooth.send and surface invoke rejections</name>
  <files>apps/frontend/src/hooks/use-bluetooth.ts, apps/frontend/src/hooks/use-bluetooth.test.ts</files>
  <read_first>
@apps/frontend/src/hooks/use-bluetooth.ts — full file; only send and imports are touched
@apps/frontend/src/hooks/use-bluetooth.test.ts — full file; the two existing send() tests (lines 125-153) and the connect() handles error test (line 100-112) are the templates
@apps/frontend/src/lib/encode-command.ts — the encoder from Task 1 (import target)
@apps/frontend/src/types.ts — Direction alias for the new send signature
@apps/frontend/src/app.tsx (lines 10-22) — caller of send; already passes Direction
@apps/frontend/src/components/control-pad.tsx (lines 15-19, 80-85) — confirms callers pass Direction
  </read_first>
  <action>
Modify `apps/frontend/src/hooks/use-bluetooth.ts`:

1. Add top-level imports near the existing imports:
   - `import type { Direction } from "../types"`
   - `import { encodeCommand } from "../lib/encode-command"`

2. Replace the send callback (currently lines 56-59). New body, preserving useCallback shape, isTauri() short-circuit, and no-semicolon style:

       const send = useCallback((direction: Direction) => {
         if (!isTauri()) return
         const payload = encodeCommand(direction)
         invoke("ble_send", { command: payload }).catch((e) => {
           const msg = e instanceof Error ? e.message : String(e)
           console.error("BLE send failed:", e)
           setError(msg)
         })
       }, [])

   Required behaviour:
   - Parameter type tightens from `data: string` to `direction: Direction`. Callers already pass Direction, so it is a no-op at every call site but makes the contract explicit at the hook boundary.
   - `void invoke(...)` is removed. The new form keeps fire-and-forget semantics (no await) but `.catch` surfaces rejections via setError. Mirrors the existing pattern in connect.
   - setState is NOT called on send failure (unlike connect). A write rejection from ble_send does not necessarily mean BLE is disconnected; the StatusBar reflects ble-state-changed events emitted by Rust, not IPC-call rejections.
   - The `[]` dependency array is preserved — encodeCommand is a module-scope pure function; no closure over hook state.

3. Do NOT change: the listener useEffect, the connect callback, the BluetoothState type alias, the useState initializations, or the returned object shape. Keys (connected, connecting, unsupported, connect, send, error) and their types are identical; send's return type stays void.

Modify `apps/frontend/src/hooks/use-bluetooth.test.ts`:

4. Update the two existing IPC-payload assertions so they expect the wire-format payload now produced by send:
   - In `"send() calls invoke ble_send"`: change final assertion to `expect(mockTauriInvoke).toHaveBeenCalledWith("ble_send", { command: "F150\n" })`.
   - In `"send() calls invoke ble_send with B command"`: change to `{ command: "B150\n" }`.

5. Add a new test inside `describe("useBluetooth (Tauri IPC)")`, after the two existing send tests and before `"updates state when ble-state-changed event fires"`:

       it("send() surfaces invoke rejection via error state", async () => {
         const { result } = renderHook(() => useBluetooth())

         await act(async () => {
           await result.current.connect()
         })

         mockTauriInvoke.mockClear()
         mockTauriInvoke.mockRejectedValueOnce(
           new Error("Invalid BLE payload \"X\": expected '<dir><pwm>\\n' ..."),
         )

         await act(async () => {
           result.current.send("F")
           // Flush rejected-promise microtask + setError-induced re-render.
           await Promise.resolve()
           await Promise.resolve()
         })

         expect(result.current.error).toBeTruthy()
         expect(result.current.error).toContain("Invalid BLE payload")
       })

   The substring assertion is deliberately loose — the contract under test is "when Tauri rejects an invoke, the hook surfaces the rejection through error", not the exact wording (so a future T-20-14-compliant validator-error tweak does not break this test).

6. Add a sibling test asserting the Stop payload crosses IPC in wire format:

       it("send() calls invoke ble_send with Stop payload S newline", async () => {
         const { result } = renderHook(() => useBluetooth())

         await act(async () => {
           await result.current.connect()
         })
         mockTauriInvoke.mockClear()

         act(() => {
           result.current.send("S")
         })

         expect(mockTauriInvoke).toHaveBeenCalledWith("ble_send", { command: "S\n" })
       })

7. Do NOT modify: connect() / ble-state-changed / unmount tests, hoisted mocks at the top, beforeEach/afterEach blocks, or the existing `"send() is a no-op outside Tauri"` test (still applies — `!isTauri()` short-circuit fires before any encoder call).

Constraints (verify via git diff before commit):

- `apps/frontend/src/app.tsx`, `apps/frontend/src/components/control-pad.tsx`, `apps/frontend/src/hooks/use-gamepad.ts`, `apps/frontend/src/types.ts` and ALL of `apps/frontend/src-tauri/` are byte-identical to before this task. Run `git diff --name-only -- apps/frontend/src/app.tsx apps/frontend/src/components/control-pad.tsx apps/frontend/src/hooks/use-gamepad.ts apps/frontend/src/types.ts apps/frontend/src-tauri/` and confirm empty before commit.

- The hook's exported return shape is additive-only per CLAUDE.md. This task makes NO additions and NO renames; it only changes the implementation of send and its parameter type. Direction is a subtype of string, so all existing call sites continue to type-check.

Commit message (Conventional Commits): `fix(ble): encode wire format in useBluetooth.send and surface IPC rejections`.
  </action>
  <acceptance_criteria>
- `grep -n "encodeCommand" apps/frontend/src/hooks/use-bluetooth.ts` matches at least 2 lines (import + call site).
- `grep -nE "^\s*void invoke\(" apps/frontend/src/hooks/use-bluetooth.ts` returns no matches.
- `grep -nE "\.catch\(" apps/frontend/src/hooks/use-bluetooth.ts` matches at least one line.
- `grep -n "Direction" apps/frontend/src/hooks/use-bluetooth.ts` matches at least the import type line and the send parameter annotation.
- `git diff --name-only -- apps/frontend/src/app.tsx apps/frontend/src/components/control-pad.tsx apps/frontend/src/hooks/use-gamepad.ts apps/frontend/src/types.ts apps/frontend/src-tauri/` is empty.
- `grep -nE 'F150.n|"F150' apps/frontend/src/hooks/use-bluetooth.test.ts` matches updated payload assertion.
- `grep -nE 'surfaces invoke rejection' apps/frontend/src/hooks/use-bluetooth.test.ts` matches the new rejection test.
- `grep -nE 'Stop payload' apps/frontend/src/hooks/use-bluetooth.test.ts` matches the new Stop-payload test.
- `pnpm --filter @ks0555/frontend test -- use-bluetooth.test.ts` exits 0.
- `pnpm --filter @ks0555/frontend exec tsc --noEmit` exits 0.
- `pnpm --filter @ks0555/frontend exec eslint apps/frontend/src/hooks/use-bluetooth.ts apps/frontend/src/hooks/use-bluetooth.test.ts` exits 0.
- `pnpm --filter @ks0555/frontend exec prettier --check apps/frontend/src/hooks/use-bluetooth.ts apps/frontend/src/hooks/use-bluetooth.test.ts` exits 0.
  </acceptance_criteria>
  <verify>
    <automated>pnpm --filter @ks0555/frontend test -- use-bluetooth.test.ts 2>&amp;1 | tail -30 &amp;&amp; pnpm --filter @ks0555/frontend exec tsc --noEmit 2>&amp;1 | tail -5 &amp;&amp; git diff --name-only -- apps/frontend/src/app.tsx apps/frontend/src/components/control-pad.tsx apps/frontend/src/hooks/use-gamepad.ts apps/frontend/src/types.ts apps/frontend/src-tauri/ | wc -l</automated>
  </verify>
  <done>
useBluetooth.send accepts Direction, calls encodeCommand to produce the Phase-20 wire-format payload, invokes ble_send, and chains .catch so rejections populate the existing error state. Updated and new tests pin both success-path payload format and rejection-surfacing behaviour. tsc --noEmit, the test suite, ESLint, and Prettier are clean. Out-of-scope files unchanged.
  </done>
</task>

<task type="auto">
  <name>Task 3: Full-suite green check + hardware regression note in UAT.md</name>
  <files>.planning/phases/20-protocol-domain/20-UAT.md</files>
  <read_first>
@.planning/phases/20-protocol-domain/20-UAT.md — preserve diagnosed gaps verbatim; append closure note only
  </read_first>
  <action>
Run the full pre-merge sanity sweep and append a closure note to the UAT.

1. Run `just check` from repo root (alias for project's pre-merge gate — lint, typecheck, test). Must exit 0. If just is unavailable, fall back to:
   - `pnpm --filter @ks0555/frontend lint`
   - `pnpm --filter @ks0555/frontend typecheck`
   - `pnpm --filter @ks0555/frontend test`

2. Run `cargo test --manifest-path apps/frontend/src-tauri/Cargo.toml`. All Rust tests must continue to pass (no Rust changes in this plan; regression guard against cross-language drift). The ble::tests count must remain at 18 — the validator is unchanged.

3. Run `pnpm --filter @ks0555/frontend exec prettier --check .` from repo root to confirm no other files drifted out of format.

4. Append a new `## Closure Attempt` section to `.planning/phases/20-protocol-domain/20-UAT.md` (append, do NOT overwrite — the `## Gaps` block and frontmatter must be preserved verbatim). Section content (substitute today's ISO date for the placeholder):

       ## Closure Attempt

       plan: 20-04-fe-wire-encoder-PLAN.md
       date: <YYYY-MM-DD>
       rationale: |
         FE-only fix. Encoded Phase-20 wire format in
         apps/frontend/src/lib/encode-command.ts and routed every payload
         through it in useBluetooth.send. Added .catch on the invoke promise
         so future producer/validator regressions surface in the UI's
         bleError state instead of being silently swallowed.

         gilrs_adapter.rs is unchanged — Phase 21 still owns the adapter
         rewrite to emit analog (direction, pwm) payloads. Until then this
         FE shim uses DEFAULT_PWM = 150 (firmware default per PROJECT.md
         Context section, within validator accept range 80..=255).

       verification_done:
         - "just check (pnpm lint + typecheck + test) exits 0"
         - "cargo test --manifest-path apps/frontend/src-tauri/Cargo.toml exits 0; ble::tests count unchanged at 18"
         - "pnpm --filter @ks0555/frontend exec prettier --check . exits 0"

       regression_required:
         scope: "User must re-run UAT Tests 4 and 5 with real hardware (BT24 + Steam Deck or gamepad)."
         steps:
           - "pnpm dev (or the installed Flatpak on the Deck)."
           - "Click Connect Bluetooth; wait for StatusBar to reach connected."
           - "Test 4: Click each ControlPad button (L, S, R; plus stick-driven F/B if applicable). Robot must drive in each direction; clicking S must stop it."
           - "Test 5: With a gamepad connected, push the left stick forward/backward/left/right and press R2/L2. Robot must drive. Release to center; robot must stop."
           - "Bonus T-20-16 visibility check: in the Tauri WebView devtools console, run window.__TAURI_INTERNALS__.invoke('ble_send', { command: 'X' }) once. The on-screen bleError area below the Connect button must now display the rejection message (it did NOT before this plan)."

5. Do NOT modify the `## Gaps` block. Do NOT change the `status: diagnosed` frontmatter (the user / gsd-verifier toggles that to `closed` once the hardware regression passes).

Commit message: `docs(phase-20): note 20-04 closure attempt and hardware regression steps`.
  </action>
  <acceptance_criteria>
- `pnpm --filter @ks0555/frontend test` exits 0 (all frontend tests including the two new test files green).
- `pnpm --filter @ks0555/frontend typecheck` exits 0.
- `pnpm --filter @ks0555/frontend lint` exits 0.
- `cargo test --manifest-path apps/frontend/src-tauri/Cargo.toml` exits 0.
- `git diff --name-only -- apps/frontend/src-tauri/` is empty (Rust files unchanged).
- `grep -c "^## Closure Attempt" .planning/phases/20-protocol-domain/20-UAT.md` is at least 1 (closure note appended).
- `grep -c "^## Gaps" .planning/phases/20-protocol-domain/20-UAT.md` is exactly 1 (original Gaps block preserved).
- `grep -c "status: diagnosed" .planning/phases/20-protocol-domain/20-UAT.md` is exactly 1 (frontmatter unchanged).
- `pnpm --filter @ks0555/frontend exec prettier --check .` exits 0.
  </acceptance_criteria>
  <verify>
    <automated>pnpm --filter @ks0555/frontend test 2>&amp;1 | tail -10 &amp;&amp; pnpm --filter @ks0555/frontend typecheck 2>&amp;1 | tail -5 &amp;&amp; pnpm --filter @ks0555/frontend lint 2>&amp;1 | tail -5 &amp;&amp; cargo test --manifest-path apps/frontend/src-tauri/Cargo.toml 2>&amp;1 | tail -5 &amp;&amp; grep -c "^## Closure Attempt" .planning/phases/20-protocol-domain/20-UAT.md &amp;&amp; grep -c "^## Gaps" .planning/phases/20-protocol-domain/20-UAT.md</automated>
  </verify>
  <done>
Full pnpm + cargo sweep is green. UAT.md has a `## Closure Attempt` section noting Plan 20-04, verification commands run, and explicit hardware regression steps for the user to follow. `## Gaps` block and `status: diagnosed` frontmatter are preserved verbatim. Rust source under apps/frontend/src-tauri/ is byte-identical to before this plan.
  </done>
</task>

</tasks>

<verification>

### Plan-level verification gates

Run from repo root after all three tasks land:

    just check
    cargo test --manifest-path apps/frontend/src-tauri/Cargo.toml
    pnpm --filter @ks0555/frontend exec prettier --check .

All must exit 0. The Rust test count for ble::tests must remain 18 (validator unchanged).

### Threat-model regression gates

Each STRIDE mitigation from Phase 20 plan 20-03 still holds:

- T-20-08..T-20-12, T-20-14 — validator still enforces them server-side; verified by `cargo test ble::tests` (18/18 pass).
- T-20-15 — new: TypeScript exhaustiveness check; verified by `grep -c "never" apps/frontend/src/lib/encode-command.ts >= 1` and `pnpm --filter @ks0555/frontend exec tsc --noEmit` exits 0.
- T-20-16 — new: rejection surfacing; verified by the `"send() surfaces invoke rejection via error state"` unit test passing.

### Scope-boundary gates

After all tasks, `git diff --name-only origin/main..HEAD` (or against the plan's base commit) must show ONLY:

    apps/frontend/src/lib/encode-command.ts                                       (new)
    apps/frontend/src/lib/encode-command.test.ts                                  (new)
    apps/frontend/src/hooks/use-bluetooth.ts                                      (modified)
    apps/frontend/src/hooks/use-bluetooth.test.ts                                 (modified)
    .planning/phases/20-protocol-domain/20-UAT.md                                 (appended)
    .planning/phases/20-protocol-domain/20-04-fe-wire-encoder-PLAN.md             (new — this plan file)
    .planning/phases/20-protocol-domain/20-04-SUMMARY.md                          (new — created post-execution)

Anything outside that list (especially apps/frontend/src-tauri/, apps/frontend/src/app.tsx, apps/frontend/src/components/control-pad.tsx, apps/frontend/src/hooks/use-gamepad.ts, apps/frontend/src/types.ts) signals a scope breach — revert and retry.

### Hardware regression (user-driven, NOT executor-automated)

Documented in Task 3 under regression_required. Tests 4 and 5 in the UAT must transition from `issue` to `pass` on real hardware before this gap is considered closed. Until then the UAT frontmatter stays at `status: diagnosed`.

</verification>

<success_criteria>

This plan is complete when:

1. `apps/frontend/src/lib/encode-command.ts` exists and exports `encodeCommand` + `DEFAULT_PWM`; all 12 unit tests in `encode-command.test.ts` pass.
2. `apps/frontend/src/hooks/use-bluetooth.ts` calls `encodeCommand` before `invoke("ble_send", ...)`, chains `.catch` to `setError`; no `void invoke(...)` remains in the file.
3. The existing `use-bluetooth.test.ts` payload assertions are updated to `F150\n` / `B150\n` / `S\n`; new tests for rejection-surfacing and Stop payload pass.
4. `pnpm --filter @ks0555/frontend test`, `pnpm --filter @ks0555/frontend typecheck`, `pnpm --filter @ks0555/frontend lint`, `cargo test --manifest-path apps/frontend/src-tauri/Cargo.toml`, and `pnpm --filter @ks0555/frontend exec prettier --check .` all exit 0.
5. `git diff --name-only` versus the plan's base commit shows ONLY the files listed under "Scope-boundary gates" above.
6. `.planning/phases/20-protocol-domain/20-UAT.md` has a `## Closure Attempt` section with hardware-regression steps; the `## Gaps` block and `status: diagnosed` frontmatter are unchanged.
7. STRIDE register (T-20-08..T-20-18) intact: original Rust-side mitigations preserved; new FE-side T-20-15 / T-20-16 are realized in code + tests.
8. Three Conventional-Commits commits land on the working branch (commit-msg gate via lefthook passes):
   - `feat(frontend): add encodeCommand wire-format encoder for BLE send path`
   - `fix(ble): encode wire format in useBluetooth.send and surface IPC rejections`
   - `docs(phase-20): note 20-04 closure attempt and hardware regression steps`

This plan is NOT complete (and `status: diagnosed` stays in UAT.md) until the user performs the hardware regression in Task 3's regression_required section. Marking Tests 4 / 5 as `pass` is explicitly outside this executor's authority.

</success_criteria>

<output>
After completion, create `.planning/phases/20-protocol-domain/20-04-SUMMARY.md` per `@$HOME/.claude/get-shit-done/templates/summary.md`, including:
- Files created / modified (the files from "Scope-boundary gates")
- Three commit SHAs
- Verification output excerpts (test counts, prettier/eslint/clippy clean)
- Note that hardware regression is OUTSTANDING and owned by the user
- `requirements-completed:` lists `REQ-SPD-03` (continues from 20-03; the FE producer now actually exercises the validator's accept-set, which 20-03 alone could not guarantee)
- Threat-mitigation table mirroring the format used by 20-03-SUMMARY.md, covering T-20-15 and T-20-16
</output>

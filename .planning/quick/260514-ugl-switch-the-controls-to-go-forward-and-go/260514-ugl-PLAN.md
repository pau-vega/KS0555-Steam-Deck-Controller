---
phase: quick-260514-ugl
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/frontend/src-tauri/src/ble/mod.rs
  - apps/frontend/src-tauri/src/lib.rs
  - apps/frontend/src/hooks/use-invert-controls.ts
  - apps/frontend/src/hooks/use-invert-controls.test.ts
  - apps/frontend/src/hooks/use-gamepad.ts
  - apps/frontend/src/hooks/use-gamepad.test.ts
  - apps/frontend/src/components/control-pad.tsx
  - apps/frontend/src/components/control-pad.test.tsx
autonomous: true
requirements: []

must_haves:
  truths:
    - "Pushing gamepad stick up sends backward command (B) when inverted"
    - "Pushing gamepad stick down sends forward command (F) when inverted"
    - "Control-pad ▲ button sends backward (B) when inverted"
    - "Control-pad ▼ button sends forward (F) when inverted"
    - "Left/Right/Stop commands are never affected by inversion"
    - "User can toggle inversion on/off from the UI"
    - "Last command display shows the effective (inverted) direction"
  artifacts:
    - path: "apps/frontend/src-tauri/src/ble/mod.rs"
      provides: "Inversion AtomicBool + toggle_invert / get_invert_state commands"
      contains: "static INVERTED"
    - path: "apps/frontend/src/hooks/use-invert-controls.ts"
      provides: "React hook for inversion state management"
      exports: ["useInvertControls"]
    - path: "apps/frontend/src/hooks/use-gamepad.ts"
      provides: "Gamepad direction with optional F↔B inversion"
    - path: "apps/frontend/src/components/control-pad.tsx"
      provides: "Control pad with inversion toggle button + F↔B transform"
  key_links:
    - from: "use-gamepad.ts"
      to: "use-invert-controls.ts"
      via: "useInvertControls() import"
      pattern: "import.*useInvertControls"
    - from: "control-pad.tsx"
      to: "use-invert-controls.ts"
      via: "useInvertControls() import"
      pattern: "import.*useInvertControls"
    - from: "use-invert-controls.ts"
      to: "toggle_invert / get_invert_state"
      via: "invoke()"
      pattern: "invoke.*toggle_invert|invoke.*get_invert_state"
---

<objective>
Add a configurable toggle to invert forward/backward controls. When enabled: gamepad stick up → backward (B), stick down → forward (F); control-pad ▲ → B, ▼ → F. Left/Right/Stop unchanged.

Purpose: User prefers tank-style controls where pushing forward on stick moves robot backward, and vice versa.
Output: Inversion toggle managed in Rust (AtomicBool), consumed by React hooks/components. No changes to locked `app.tsx`.
</objective>

<execution_context>
@/Users/pauvelascogarrofe/.config/opencode/get-shit-done/workflows/execute-plan.md
@/Users/pauvelascogarrofe/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/frontend/src-tauri/src/ble/mod.rs
@apps/frontend/src-tauri/src/ble/state.rs
@apps/frontend/src-tauri/src/gamepad/mod.rs
@apps/frontend/src-tauri/src/lib.rs
@apps/frontend/src/types.ts
@apps/frontend/src/hooks/use-gamepad.ts
@apps/frontend/src/hooks/use-bluetooth.ts
@apps/frontend/src/components/control-pad.tsx
@apps/frontend/src/app.tsx

<interfaces>
<!-- Key types and contracts from existing codebase -->

From apps/frontend/src/types.ts:
```typescript
export type Direction = "F" | "B" | "L" | "R" | "S"
```

From apps/frontend/src/hooks/use-gamepad.ts (return shape):
```typescript
{ direction: Direction, gamepadConnected: boolean, gamepadName: string | null, isDeck: boolean }
```
AGENTS.md contract: adding fields OK, renaming/removing not OK.

From apps/frontend/src/components/control-pad.tsx (props):
```typescript
interface ControlPadProps {
  onCommand: (command: Direction) => void
  disabled: boolean
}
```

From apps/frontend/src-tauri/src/ble/mod.rs (command signature):
```rust
#[tauri::command]
pub async fn ble_send(_app: AppHandle, state: tauri::State<'_, BleState>, command: String) -> Result<(), String>
```

From apps/frontend/src-tauri/src/lib.rs (invoke_handler registration):
```rust
.invoke_handler(tauri::generate_handler![
    ble_connect,
    ble_disconnect,
    ble_send,
])
```

IPC events:
- `gamepad-direction`: `{ direction: "F" | "B" | "L" | "R" | "S" }`
- `invert-changed`: `boolean` (new — defines the contract for this plan)
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add inversion state management in Rust</name>
  <files>
    apps/frontend/src-tauri/src/ble/mod.rs
    apps/frontend/src-tauri/src/lib.rs
  </files>
  <behavior>
    - Test 1: `toggle_invert` called when INVERTED is false → returns true, INVERTED becomes true
    - Test 2: `toggle_invert` called when INVERTED is true → returns false, INVERTED becomes false
    - Test 3: `get_invert_state` returns current INVERTED value without modifying it
    - Test 4: `toggle_invert` emits `invert-changed` event with the new boolean value
    - Test 5: `ble_send` is NOT modified — inversion happens in TS layer, not here
  </behavior>
  <action>
    In `ble/mod.rs`:
    1. Add `use std::sync::atomic::{AtomicBool, Ordering}` at top.
    2. Add `static INVERTED: AtomicBool = AtomicBool::new(false);` after the `BT24_NAME` constant (line ~13).
    3. Add `#[tauri::command] fn get_invert_state() -> bool` that returns `INVERTED.load(Ordering::Relaxed)`.
    4. Add `#[tauri::command] fn toggle_invert(app: AppHandle) -> Result<bool, String>` that:
       - Toggles via `INVERTED.fetch_xor(true, Ordering::SeqCst) ^ true` (fetch_xor returns OLD, so XOR with true gives NEW).
       - Emits `invert-changed` event: `app.emit("invert-changed", new_val).map_err(...)`.
       - Returns `Ok(new_val)`.
    5. Add `#[cfg(test)] mod tests` block at end of file testing both commands.
       - Test `toggle_invert`: call twice, assert returned values are `Ok(true)` then `Ok(false)`.
       - Test `get_invert_state`: toggle then assert state matches.
       - Test `ble_send` passes "F"/"B" through unchanged (no inversion in send path).

    In `lib.rs`:
    6. Add `toggle_invert` and `get_invert_state` to the import line: `use ble::{ble_connect, ble_disconnect, ble_send, setup_event_listener, BleState, toggle_invert, get_invert_state};`
    7. Add both commands to `invoke_handler` array.

    Do NOT modify `ble_send` logic — inversion is handled in the TypeScript hooks/components, not in the BLE send path. The Rust side is purely state management (source of truth for the toggle).
  </action>
  <verify>
    <automated>cargo test -- --test-threads=1 2>&1 | grep -E "(test result|toggle_invert|get_invert_state)"</automated>
  </verify>
  <done>
    `cargo test` passes. `toggle_invert` and `get_invert_state` commands are registered and functional. `INVERTED` AtomicBool toggles correctly. `invert-changed` event emitted on toggle.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Create useInvertControls hook and wire into useGamepad</name>
  <files>
    apps/frontend/src/hooks/use-invert-controls.ts
    apps/frontend/src/hooks/use-invert-controls.test.ts
    apps/frontend/src/hooks/use-gamepad.ts
    apps/frontend/src/hooks/use-gamepad.test.ts
  </files>
  <behavior>
    - Test 1: `useInvertControls` initial state is `false` before Tauri async resolves (default safe)
    - Test 2: `useInvertControls` calls `invoke("get_invert_state")` on mount, updates state to match
    - Test 3: `useInvertControls` listens for `invert-changed` event, updates state
    - Test 4: `toggleInvert()` calls `invoke("toggle_invert")`, event listener updates state
    - Test 5: `useInvertControls` cleanup unlistens from `invert-changed` event
    - Test 6: `useGamepad` inverted=false → direction passes through unchanged (F stays F, B stays B)
    - Test 7: `useGamepad` inverted=true → direction F becomes B, B becomes F
    - Test 8: `useGamepad` inverted=true → direction L, R, S pass through unchanged
    - Test 9: `useGamepad` exposes `inverted` and `toggleInvert` in return shape (adding fields, per AGENTS.md contract)
    - Test 10: `useGamepad` existing return fields (direction, gamepadConnected, gamepadName, isDeck) still present
  </behavior>
  <action>
    Create `use-invert-controls.ts`:
    1. Import `invoke` from `@tauri-apps/api/core`, `listen` from `@tauri-apps/api/event`.
    2. Export function `useInvertControls()` returning `{ inverted: boolean, toggleInvert: () => Promise<void> }`.
    3. Uses `useState(false)` for `inverted` (default false, safe).
    4. `useEffect` on mount:
       - Guard: if `!window.__TAURI_INTERNALS__` → return early (non-Tauri env, stays false).
       - Call `invoke<boolean>("get_invert_state")` → set `inverted` state.
       - `listen<boolean>("invert-changed", (event) => setInverted(event.payload))` → store unlisten.
       - Return cleanup: `unlisten()`.
    5. `toggleInvert` callback: calls `await invoke<boolean>("toggle_invert")` (event listener will update state).

    Create `use-invert-controls.test.ts`:
    6. Mock `@tauri-apps/api/core` (`invoke`) and `@tauri-apps/api/event` (`listen`).
    7. Tests for: initial state, get_invert_state on mount, invert-changed event, toggleInvert, cleanup.
    8. Stub `window.__TAURI_INTERNALS__` for all tests.
    9. Test non-Tauri path: hook returns `inverted: false` and `toggleInvert` is a no-op-ish function (invoke not called).

    Modify `use-gamepad.ts`:
    10. Import `useInvertControls` from `"./use-invert-controls"`.
    11. Call `const { inverted, toggleInvert } = useInvertControls()` at top of `useGamepad`.
    12. Create helper function inside the hook (before return):
        ```typescript
        function applyInvert(dir: Direction): Direction {
          if (!inverted) return dir
          if (dir === "F") return "B"
          if (dir === "B") return "F"
          return dir
        }
        ```
        This MUST be inside the component so it captures the current `inverted` value.
    13. In the `listen("gamepad-direction", ...)` callback, wrap the direction: `const effective = applyInvert(event.payload.direction); setDirection(effective);`
    14. Add `inverted` and `toggleInvert` to the return object (adding fields is allowed by AGENTS.md contract).

    Modify `use-gamepad.test.ts`:
    15. Mock `useInvertControls` import using `vi.mock`: return `{ inverted: false, toggleInvert: vi.fn() }` by default.
    16. Add new test: when `inverted=true`, "F" direction event sets direction to "B".
    17. Add new test: when `inverted=true`, "B" direction event sets direction to "F".
    18. Add new test: when `inverted=true`, "L"/"R"/"S" pass through unchanged.
    19. Add new test: `inverted` and `toggleInvert` appear in return shape.
  </action>
  <verify>
    <automated>pnpm --filter @ks0555/frontend test -- use-invert-controls.test.ts use-gamepad.test.ts</automated>
  </verify>
  <done>
    `pnpm test` passes for both test files. `useInvertControls` hook manages state from Rust source of truth. `useGamepad` transforms F↔B when inverted, exposes `inverted`/`toggleInvert` in return.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Wire inversion into ControlPad with toggle button</name>
  <files>
    apps/frontend/src/components/control-pad.tsx
    apps/frontend/src/components/control-pad.test.tsx
  </files>
  <behavior>
    - Test 1: inverted=false → ▲ calls onCommand("F"), ▼ calls onCommand("B")
    - Test 2: inverted=true → ▲ calls onCommand("B"), ▼ calls onCommand("F")
    - Test 3: inverted=true → ◀, ■, ▶ buttons still call onCommand("L"/"S"/"R") unchanged
    - Test 4: toggle button renders, clicking it calls toggleInvert
    - Test 5: toggle button shows current inverted state visually
    - Test 6: when disabled=true, toggle button also disabled
  </behavior>
  <action>
    Modify `control-pad.tsx`:
    1. Import `useInvertControls` from `"../hooks/use-invert-controls"`.
    2. Import type `Direction` from `"../types"` (already imported).
    3. Call `const { inverted, toggleInvert } = useInvertControls()` inside the component.
    4. Wrap the `onCommand` calls in each button's `onClick`:
       - Add helper before the return:
         ```typescript
         function handleCommand(raw: Direction) {
           if (!inverted) { onCommand(raw); return }
           if (raw === "F") onCommand("B")
           else if (raw === "B") onCommand("F")
           else onCommand(raw)
         }
         ```
       - Replace `onClick={() => onCommand(command)}` with `onClick={() => handleCommand(command)}`.
    5. Add an inversion toggle button BELOW the 3×3 grid (outside the grid div, inside the component's root):
       - A `<button>` with `aria-label="Invert forward/backward controls"` and `aria-pressed={inverted}`.
       - Text: `inverted ? "🔄 Inverted" : "↕️ Normal"` (or similar).
       - Styling: small, subtle, below the control pad. Class: `mt-3 px-3 py-1 text-xs rounded-lg border transition-colors`, with `inverted ? "bg-accent text-white border-accent" : "bg-surface text-gray-400 border-border hover:border-accent"`.
       - `onClick={() => void toggleInvert()}`.
       - `disabled={disabled}` — when BLE is disconnected, toggle is disabled too.

    Modify `control-pad.test.tsx`:
    6. Mock `useInvertControls`: `vi.mock("../hooks/use-invert-controls", () => ({ useInvertControls: vi.fn() }))`.
    7. Before each test: `vi.mocked(useInvertControls).mockReturnValue({ inverted: false, toggleInvert: vi.fn() })`.
    8. Existing tests should still pass (inverted=false is default mock).
    9. Add test: when inverted=true, clicking ▲ calls onCommand with "B".
    10. Add test: when inverted=true, clicking ▼ calls onCommand with "F".
    11. Add test: when inverted=true, L/R/S buttons unchanged.
    12. Add test: toggle button exists, clicking it calls `toggleInvert`.
    13. Add test: toggle button has `aria-pressed="true"` when inverted.
    14. Add test: when `disabled=true`, toggle button is also `disabled`.
  </action>
  <verify>
    <automated>pnpm --filter @ks0555/frontend test -- control-pad.test.tsx</automated>
  </verify>
  <done>
    All tests pass. Control-pad ▲/▼ swap F↔B when inverted. L/R/S unchanged. Toggle button visible, functional, respects disabled state. No changes to `app.tsx`.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client→IPC | `toggle_invert` and `get_invert_state` invocations cross the Tauri IPC boundary |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-quick-01 | Tampering | `toggle_invert` command | accept | Inversion is a UX preference, not a security control. An attacker toggling it can only swap F/B — no data leakage, no privilege escalation. |
| T-quick-02 | Information Disclosure | `get_invert_state` command | accept | Returns a boolean with no PII or sensitive data. |
</threat_model>

<verification>
1. `cargo test` passes (Rust tests)
2. `pnpm test` passes (all frontend tests)
3. `pnpm typecheck` passes (no TypeScript errors)
4. Manual: run `pnpm dev`, confirm toggle appears on control-pad, clicking it swaps ▲/▼ behavior
</verification>

<success_criteria>
- [ ] AtomicBool inversion state in Rust with toggle_invert / get_invert_state commands
- [ ] useInvertControls hook reads/writes inversion state via Tauri IPC
- [ ] useGamepad transforms direction F↔B when inverted, exposes inverted/toggleInvert
- [ ] control-pad.tsx transforms ▲/▼ commands when inverted, shows toggle button
- [ ] app.tsx unchanged (locked file constraint respected)
- [ ] All existing tests pass, new tests cover inversion paths
- [ ] L/R/S never affected by inversion
</success_criteria>

<output>
After completion, create `.planning/quick/260514-ugl-switch-the-controls-to-go-forward-and-go/260514-ugl-SUMMARY.md`
</output>

# Phase 9: Hook Rewrites - Context

**Gathered:** 2026-05-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Rewrite `apps/frontend/src/hooks/use-bluetooth.ts` and `apps/frontend/src/hooks/use-gamepad.ts` to use Tauri IPC (`invoke`/`listen` from `@tauri-apps/api`) instead of Web Bluetooth API and Gamepad API. The Rust backend (btleplug commands + gilrs thread) is already implemented in Phases 7 and 8. Phase 9 is pure frontend TypeScript work.

Return shapes are locked and must not change — `app.tsx`, `control-pad.tsx`, and `status-bar.tsx` must be untouched after migration. Remove `@types/web-bluetooth` from `devDependencies`. Rewrite hook tests to mock `@tauri-apps/api` instead of browser APIs.

</domain>

<decisions>
## Implementation Decisions

### Unlisten Cleanup Pattern
- **D-01:** Use `useRef` to store unlisteners — `const unlistenersRef = useRef<UnlistenFn[]>([])`. In `useEffect`, each `listen()` resolves to a `UnlistenFn` and pushes it into the array. Cleanup function: `() => { unlistenersRef.current.forEach(fn => fn()) }`. Synchronous cleanup, prevents stale listeners on remount.
- **D-02:** Use a single array ref per hook (not one ref per listener). `useBluetooth` has 1 listener (`ble-state-changed`). `useGamepad` has 3 listeners (`gamepad-direction`, `gamepad-connected`, `gamepad-disconnected`). Array ref handles both cases cleanly.

### BLE State Payload Format
- **D-03:** `ble-state-changed` payload is a **raw string** (`"connecting"` | `"connected"` | `"disconnected"`). The Rust code emits `app.emit("ble-state-changed", "connecting")` — confirmed in `apps/frontend/src-tauri/src/ble/mod.rs`. Hook types it as `listen<string>`. No Rust changes needed.
- **D-04:** Cast payload to `'connecting' | 'connected' | 'disconnected'` union type at point of use inside the listener callback.

### Gamepad Event Payloads
- **D-05:** `gamepad-direction` payload: `{ direction: Direction }` (string char `'F' | 'B' | 'L' | 'R' | 'S'`). Confirmed from Phase 8 D-35.
- **D-06:** `gamepad-connected` / `gamepad-disconnected` payload: `{ name: string }`. Confirmed from Phase 8 D-36. Hook only needs `name` for future display; `gamepadConnected` boolean derived from which event fired.

### Direction Type Source
- **D-07:** `Direction` type (`"F" | "B" | "L" | "R" | "S"`) imported from `apps/frontend/src/types.ts` — single source of truth, already used by `app.tsx`. `BluetoothState` union (`"disconnected" | "connecting" | "connected"`) stays defined inline in `use-bluetooth.ts`.
- **D-08:** Event payload types use inline anonymous types in `listen<>` generic (e.g., `listen<{ direction: Direction }>('gamepad-direction', ...)`). No named payload interfaces.

### Initial State on Mount
- **D-09:** `useBluetooth` starts with state `"disconnected"`. BLE connection is user-initiated (Connect button). No auto-connect on mount.
- **D-10:** `useGamepad` starts with `gamepadConnected: false` and `direction: "S"`. Hook waits for Tauri events. gilrs emits a `Connected` event during app startup if a gamepad is already present — first event will update the hook state promptly. No Rust query command needed.

### Disconnect on Unmount
- **D-11:** `useBluetooth` does **not** call `invoke('ble_disconnect')` on unmount. App is single-page; hook lives for the full app lifetime. Disconnect is user-initiated. Matches current Web Bluetooth hook behavior.

### send() Implementation
- **D-12:** `send(data)` is fire-and-forget — `void invoke('ble_send', { command: data })`. Matches current `void characteristic.writeValue(...)` pattern. No connection guard (Rust returns `Err` if disconnected, silently ignored). `useCallback` with empty deps for stable reference (consumed by `app.tsx` as dependency in `sendCommand`).

### connect() Implementation
- **D-13:** `connect()` wrapped in `useCallback` with empty deps for stable reference (passed as `onClick` prop). Sets `setState('connecting')` before calling `invoke('ble_connect')`. On rejection: `setState('disconnected')` then re-throws. Matches current try/catch behavior and `app.tsx` call pattern (`void connect()`).
- **D-14:** `listen('ble-state-changed')` set up in a `useEffect` with empty deps (runs once on mount). Listener is ready before user clicks Connect.

### Test Rewrite Strategy
- **D-15:** Rewrite both hook test files to mock `@tauri-apps/api`. Delete browser-API mocks (`navigator.bluetooth`, `navigator.getGamepads`, `requestAnimationFrame` loop). Use `vi.mock('@tauri-apps/api/core')` for `invoke`, `vi.mock('@tauri-apps/api/event')` for `listen`.
- **D-16:** Simulate Tauri listener callbacks by capturing the callback in the mock: `let capturedCallback; listen.mockImplementation((_event, cb) => { capturedCallback = cb; return Promise.resolve(vi.fn()) })`. Then trigger in tests: `act(() => capturedCallback({ payload: { direction: 'F' } }))`. No RAF loop, no polling — purely event-driven.
- **D-17:** Test coverage parity: same behaviors tested as before — connect sets state, send calls invoke, listener fires state update, cleanup calls unlisteners.

### @types/web-bluetooth Removal
- **D-18:** Remove `@types/web-bluetooth` from `apps/frontend/package.json` `devDependencies`. No types from it should appear in the rewritten hooks (no `BluetoothRemoteGATTCharacteristic`, `BluetoothDevice`, etc.).

### the agent's Discretion
- Hook return shapes are fixed — do not add or remove fields from `{ connected, connecting, unsupported, connect, send }` or `{ direction, gamepadConnected }`.
- `unsupported` is always `false` in Tauri context (invoke always available). The field stays in the return shape for API stability — set it to a constant `false`.
- `send` calls `invoke('ble_send', { command: data })` — fire-and-forget (`void` the promise).
- `connect` catches invoke errors, sets `"disconnected"`, re-throws.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Phase Goal
- `.planning/REQUIREMENTS.md` — HOOK-01 through HOOK-05 (Hook Rewrite requirements)
- `.planning/ROADMAP.md` § Phase 9 — Goal, success criteria, dependencies (Phase 7, Phase 8)
- `.planning/PROJECT.md` § Constraints — Hook interfaces stable, no new UI components, src-tauri in apps/frontend/

### Prior Phase Context (locked decisions)
- `.planning/phases/07-ble-commands-with-btleplug/07-CONTEXT.md` — BLE IPC contract: invoke names, event names, Result<(), String> error propagation
- `.planning/phases/08-gamepad-monitoring-with-gilrs/08-CONTEXT.md` — Gamepad event contract: payload shapes, deadzone, direction logic already in Rust

### Existing Code to Rewrite
- `apps/frontend/src/hooks/use-bluetooth.ts` — Current Web Bluetooth implementation (60 lines). Rewrite in-place.
- `apps/frontend/src/hooks/use-gamepad.ts` — Current Gamepad API implementation (72 lines). Rewrite in-place.
- `apps/frontend/src/hooks/use-bluetooth.test.ts` — Current tests (117 lines). Rewrite to mock @tauri-apps/api.
- `apps/frontend/src/hooks/use-gamepad.test.ts` — Current tests (185 lines). Rewrite to mock @tauri-apps/api.

### Code That Must Not Change
- `apps/frontend/src/app.tsx` — Consumes `{ connected: bleConnected, connecting, connect, send }` and `{ direction, gamepadConnected }`
- `apps/frontend/src/components/control-pad.tsx` — Must be unchanged
- `apps/frontend/src/components/status-bar.tsx` — Must be unchanged

### Rust Backend (read-only reference — do not modify)
- `apps/frontend/src-tauri/src/ble/mod.rs` — BLE commands and emit format (payload is raw string)
- `apps/frontend/src-tauri/src/gamepad/mod.rs` — Gamepad thread and event emission

### Tauri v2 API
- `apps/frontend/package.json` — `@tauri-apps/api ^2.11.0` already in dependencies; `@types/web-bluetooth` to remove from devDependencies
- Tauri v2 invoke: `import { invoke } from '@tauri-apps/api/core'`
- Tauri v2 listen: `import { listen, type UnlistenFn } from '@tauri-apps/api/event'` — returns `Promise<UnlistenFn>`

### Shared Types
- `apps/frontend/src/types.ts` — `Direction` type (imported by use-gamepad.ts)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/frontend/src/types.ts` — `Direction` type (`"F" | "B" | "L" | "R" | "S"`). Import in `use-gamepad.ts` for `listen<{ direction: Direction }>` type parameter.
- `@tauri-apps/api` — Already in `dependencies` (not devDependencies). `invoke` from `@tauri-apps/api/core`, `listen`/`UnlistenFn` from `@tauri-apps/api/event`.

### Established Patterns
- Current hooks use `useRef` for mutable state that doesn't trigger re-renders (e.g., `characteristicRef`, `frameRef`, `connectedRef`). Extend the same pattern for `unlistenersRef`.
- `useCallback` used for `connect` and `send` — use with empty deps (both only reference stable `setState` and module-level `invoke`).
- `useEffect` with cleanup return — the `listen()` async setup sets up listeners on mount and returns unlisten cleanup.
- Error handling in `connect()`: catch block sets state to `"disconnected"` then re-throws. Keep same pattern with `invoke` rejection.
- `send()` is fire-and-forget (`void` the promise) — errors silently ignored, matching current pattern.

### Integration Points
- `use-bluetooth.ts` `useEffect`: set up `listen("ble-state-changed", ...)` to update `BluetoothState`. `connect` callback calls `invoke("ble_connect")`. `send` callback calls `invoke("ble_send", { command: data })`.
- `use-gamepad.ts` `useEffect`: set up 3 listeners — `listen("gamepad-direction", ...)` updates `direction`, `listen("gamepad-connected", ...)` sets `gamepadConnected: true`, `listen("gamepad-disconnected", ...)` sets `gamepadConnected: false` and `direction: "S"`.
- Remove `requestAnimationFrame` polling loop entirely from `use-gamepad.ts`.
- Remove all `navigator.bluetooth` and `navigator.getGamepads` references.

</code_context>

<specifics>
## Specific Ideas

- `unsupported` state: always `false` in Tauri (invoke is always available). Initialize state to `"disconnected"` directly, remove the `typeof navigator !== "undefined" && "bluetooth" in navigator` check.
- `send` function: `void invoke("ble_send", { command: data })` — fire-and-forget matching current behavior.
- Test mock pattern for listen: `vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn().mockResolvedValue(vi.fn()) }))`. Capture specific event callbacks by branching on the event name argument.
- `Direction` type imported from `src/types.ts` (not defined locally). `BluetoothState` union stays inline.
- `connect()`: `useCallback` with empty deps, sets `"connecting"` before `invoke`, catches errors → `"disconnected"` → re-throw.
- Listener setup: `useEffect` on mount for all `listen()` calls. Store `UnlistenFn` in `unlistenersRef` array. Cleanup calls all unlisteners.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 9 scope.

</deferred>

---

*Phase: 9-Hook Rewrites*
*Context gathered: 2026-05-06*

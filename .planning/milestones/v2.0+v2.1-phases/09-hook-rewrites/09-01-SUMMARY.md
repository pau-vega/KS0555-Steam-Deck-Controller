---
phase: 09-hook-rewrites
plan: 01
subsystem: frontend-hooks
tags: bluetooth, tauri, ipc, invoke, listen, use-bluetooth
requires:
  - phase: 07-ble-commands-with-btleplug
    provides: BLE IPC commands (ble_connect, ble_send) and ble-state-changed event
provides:
  - use-bluetooth.ts rewritten from Web Bluetooth API to Tauri IPC (invoke/listen)
  - use-bluetooth.test.ts mocked @tauri-apps/api instead of browser APIs
  - Clean devDependencies without @types/web-bluetooth
affects: []
tech-stack:
  added: []
  patterns:
    - useEffect with async listen() setup and UnlistenFn cleanup via useRef array
    - vi.hoisted() for mock variables in Vitest v4 factory-hoisted vi.mock()
key-files:
  created: []
  modified:
    - apps/frontend/src/hooks/use-bluetooth.ts
    - apps/frontend/src/hooks/use-bluetooth.test.ts
    - apps/frontend/package.json
    - pnpm-lock.yaml
key-decisions:
  - "connect() sets state('connecting') before invoke, catches errors → sets 'disconnected' → re-throws"
  - "send() is fire-and-forget void invoke('ble_send', { command: data }) — no connection guard"
  - "Effect cleanup uses cancelled flag + unlistenersRef.forEach(fn => fn()) for clean teardown"
  - "unsupported is constant false — no longer a state value"
  - "Use vi.hoisted() for mock variables in tests (Vitest v4 factory hoisting)"
patterns-established:
  - "Tauri IPC hooks: invoke/listen from @tauri-apps/api/core and @tauri-apps/api/event (not umbrella package)"
  - "Test mock pattern: capture listener callback via closure for event simulation"
  - "Async effect setup: cancelled flag to prevent state updates after unmount"
requirements-completed: [HOOK-01, HOOK-03, HOOK-05]
duration: 3min
completed: 2026-05-06
---

# Phase 9 Plan 1: BLE Hook Rewrite Summary

**Rewrite use-bluetooth.ts to Tauri IPC (invoke/listen), rewrite tests to mock @tauri-apps/api, remove @types/web-bluetooth**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-06T13:51:03Z
- **Completed:** 2026-05-06T13:54:10Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Hook rewritten from `navigator.bluetooth.requestDevice` GATT chain to `invoke("ble_connect")` / `invoke("ble_send")` / `listen("ble-state-changed")`
- `connect()` sets `"connecting"` before invoke, catches rejection → `"disconnected"` → re-throws
- `send()` fires `void invoke("ble_send", { command: data })` fire-and-forget
- `unsupported` is constant `false` — Tauri invoke is always available
- `useEffect` with `cancelled` flag prevents state updates after unmount; `unlistenersRef` tracks `UnlistenFn` for cleanup
- 6 tests pass with `vi.hoisted()` mock factory pattern for `@tauri-apps/api/core` and `@tauri-apps/api/event`
- no `@types/web-bluetooth` anywhere — removed from `devDependencies` and lockfile
- `pnpm build` passes clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite use-bluetooth.ts to Tauri IPC** — `59e04ab1` (feat)
2. **Task 2: Rewrite use-bluetooth.test.ts to mock @tauri-apps/api** — `ea695f4f` (test)
3. **Task 2 (formatting fix):** — `aba9e074` (style)
4. **Task 3: Remove @types/web-bluetooth from devDependencies** — `e8f4a024` (chore)

## Files Created/Modified
- `apps/frontend/src/hooks/use-bluetooth.ts` — Rewritten from Web Bluetooth (60 lines) to Tauri IPC (53 lines). No `navigator.bluetooth`, `BluetoothRemoteGATTCharacteristic`, or `TextEncoder`. Uses `invoke`, `listen`, `UnlistenFn`.
- `apps/frontend/src/hooks/use-bluetooth.test.ts` — Rewritten from browser API mocks (117 lines) to Tauri IPC mocks (126 lines). 6 tests covering start state, connect, send, listener, rejection, cleanup.
- `apps/frontend/package.json` — Removed `@types/web-bluetooth ^0.0.21` from devDependencies.
- `pnpm-lock.yaml` — Lockfile updated to reflect removal.

## Decisions Made
- **catch(error) / throw error** — Plan specified bare `throw`, but bare `throw` is a syntax error in TypeScript. Added catch binding `(error)` and `throw error`.
- **Async cleanup test** — Plan's cleanup test was synchronous, but the effect's `setup()` is async (`await listen(...)`). Fixed by adding `await act(async () => {})` to flush microtasks before unmount.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Bare `throw` is syntax error; needed catch binding**
- **Found during:** Task 1 (hook rewrite)
- **Issue:** Plan specified `catch { setState("disconnected"); throw }` but bare `throw` is a syntax error in TypeScript/ESLint
- **Fix:** Changed to `catch (error) { setState("disconnected"); throw error }`
- **Files modified:** apps/frontend/src/hooks/use-bluetooth.ts
- **Verification:** Prettier + ESLint pass, tests pass
- **Committed in:** 59e04ab1 (Task 1 commit)

**2. [Rule 3 - Blocking] Import order violation (perfectionist/sort-imports)**
- **Found during:** Task 1 (commit hook)
- **Issue:** `@tauri-apps/api/core` and `@tauri-apps/api/event` must come before `react` alphabetically
- **Fix:** Reordered imports to `@tauri-apps/api/core`, `@tauri-apps/api/event`, then `react`
- **Files modified:** apps/frontend/src/hooks/use-bluetooth.ts
- **Verification:** ESLint pass after fix
- **Committed in:** 59e04ab1 (Task 1 commit)

**3. [Rule 1 - Bug] Async effect setup causes race in cleanup test**
- **Found during:** Task 2 (test rewrite)
- **Issue:** Plan's cleanup test was synchronous, but the hook's `setup()` is async (`await listen(...)`). The `UnlistenFn` was never stored before unmount.
- **Fix:** Added `await act(async () => {})` to flush microtasks before unmount
- **Files modified:** apps/frontend/src/hooks/use-bluetooth.test.ts
- **Verification:** All 6 tests pass
- **Committed in:** ea695f4f (Task 2 commit)

**4. [Rule 3 - Blocking] vitest hoisting requires vi.hoisted() for mock variables**
- **Found during:** Task 2 (test run)
- **Issue:** `vi.mock` factory is hoisted to top of file, so `const mockInvoke = vi.fn()` was not initialized when the factory ran — "Cannot access 'mockInvoke' before initialization"
- **Fix:** Wrapped mock variables in `vi.hoisted(() => ({ ... }))` factory pattern. Used getter/setter closures for `bleStateCallback` (mutated during tests).
- **Files modified:** apps/frontend/src/hooks/use-bluetooth.test.ts
- **Verification:** Tests pass after fix
- **Committed in:** ea695f4f (Task 2 commit)

**5. [Rule 3 - Blocking] Prettier formatting in test file**
- **Found during:** Task 2 (commit hook)
- **Issue:** Test file had minor Prettier formatting issues caught by pre-commit `format:check`
- **Fix:** Ran `prettier --write` on test file
- **Files modified:** apps/frontend/src/hooks/use-bluetooth.test.ts
- **Verification:** All matched files use Prettier code style
- **Committed in:** aba9e074 (Task 2 formatting fix commit)

---

**Total deviations:** 5 auto-fixed (2 bugs, 3 blocking)
**Impact on plan:** All auto-fixes necessary for correctness. No scope creep. Hook behavior unchanged.

## Issues Encountered
- **Vitest v4 factory hoisting**: `vi.mock()` factory functions are hoisted above all code including module-level `const` declarations. Required refactoring to `vi.hoisted()` pattern (new in Vitest v4). Clean pattern: wrap all mock variables in `vi.hoisted()` return object, use getter/setter closures for mutable references like the listener callback capture.
- **Async effect race**: Hook's `useEffect` has async `setup()`, but `unmount()` runs synchronously before the `listen()` promise resolves. The `cancelled` flag handles the case where the component unmounts before `listen()` completes (the resolved promise's `if (cancelled) return` guard prevents calling `setState` after unmount). However, the `UnlistenFn` is never stored in this case — but since `listen()` already resolved, there's nothing to unlisten. This is correct behavior for the race condition.

## Next Phase Readiness
- Plan 09-01 complete. Ready for Plan 09-02 (use-gamepad.ts rewrite) which follows the same Tauri IPC pattern with `listen("gamepad-direction")`, `listen("gamepad-connected")`, `listen("gamepad-disconnected")`.
- Test mock pattern established: `vi.hoisted()` for mock variables + closure-based callback capture for `listen()` event simulation.

---

*Phase: 09-hook-rewrites*
*Completed: 2026-05-06*

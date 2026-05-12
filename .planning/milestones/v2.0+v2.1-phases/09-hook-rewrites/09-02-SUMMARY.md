---
phase: 09-hook-rewrites
plan: 02
subsystem: frontend
tags: gamepad, tauri, listen, events, react-hooks, vitest

requires:
  - phase: 08-gamepad-monitoring-with-gilrs
    provides: Tauri gamepad-direction/gamepad-connected/gamepad-disconnected events via gilrs Rust thread
provides:
  - Tauri event-driven useGamepad hook replacing navigator.getGamepads() polling
affects: []

tech-stack:
  added: []
  patterns:
    - "Tauri listen() in useEffect with cancelled flag for async setup"
    - "vi.mock('@tauri-apps/api/event') with per-event callback capture"
    - "vi.hoisted() for vi.mock factory shared state"

key-files:
  created: []
  modified:
    - apps/frontend/src/hooks/use-gamepad.ts
    - apps/frontend/src/hooks/use-gamepad.test.ts

key-decisions:
  - "Use vi.hoisted() for mock shared state to avoid hoisting issues with vi.mock factory closure"
  - "Add await act(async () => {}) after renderHook to flush async useEffect microtasks before accessing connected/disconnected callbacks"
  - "Non-null assertions on listenerCallbacks[...]! calls for TypeScript strict mode compliance"

patterns-established:
  - "Async useEffect setup: cancelled flag prevents state updates after unmount"
  - "unlistenersRef array pattern for storing multiple UnlistenFn"

requirements-completed: [HOOK-02, HOOK-04]

duration: 4 min
completed: 2026-05-06
---

# Phase 9 Plan 2: Gamepad Hook Event Rewrite Summary

**Rewrote useGamepad() from navigator.getGamepads() RAF polling loop to 3 Tauri listen() event consumers: gamepad-direction, gamepad-connected, gamepad-disconnected**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-06T14:00:00Z
- **Completed:** 2026-05-06T14:04:40Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Replaced 72-line RAF/gamepad polling loop with 39-line Tauri event-driven implementation
- Direction imported from shared `../types.ts` (single source of truth)
- 3 Tauri listeners with cancelled-flag pattern for safe async cleanup
- Rewrote 185-line test suite (RAF simulation mocks → 60-line event-driven tests with `vi.mock('@tauri-apps/api/event')`)
- 6 passing tests: start state, direction update, connected event, disconnect reset, cleanup unlisteners, multiple direction changes
- `pnpm build` passes with zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite use-gamepad.ts to Tauri event listeners** - `c6dcb2d2` (feat)
2. **Task 2: Rewrite use-gamepad.test.ts to mock @tauri-apps/api/event** - `b9cee5c5` (test)
3. **Style fix: Prettier formatting in use-gamepad.ts** - `ec96483b` (style)

**Plan metadata:** `pending` (docs: complete plan)

## Files Created/Modified
- `apps/frontend/src/hooks/use-gamepad.ts` - Rewritten: 3 Tauri listen() calls replacing navigator.getGamepads() + RAF, Direction imported from types.ts, UnlistenFn cleanup via unlistenersRef
- `apps/frontend/src/hooks/use-gamepad.test.ts` - Rewritten: vi.mock('@tauri-apps/api/event') with per-event callback capture, event-driven async tests, 6 test cases

## Decisions Made
- **vi.hoisted() for mock state:** Used `vi.hoisted()` to create listenerCallbacks and mock unlisten functions — avoids Vitest hoisting issues between vi.mock factory closure and module-level variable declarations
- **await act(async () => {}) after renderHook:** Required to flush async useEffect microtasks. The hook's setup() uses sequential await listen() which registers only the first listener synchronously; remaining listeners register on microtask continuation
- **Non-null assertions:** TypeScript strict mode's noUncheckedIndexedAccess on Record<string, T> requires `!` when calling captured callbacks
- **Prettier inline formatting:** Plan's multiline `listen(event, (event) => ...)` format collapsed to single-line by Prettier (120 char width)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added microtask flush after renderHook in event-driven tests**
- **Found during:** Task 2 (test execution)
- **Issue:** The hook's async useEffect with sequential `await listen()` only registers the first listener (gamepad-direction) synchronously — connected/disconnected callbacks register on microtask continuations. Tests accessing `listenerCallbacks["gamepad-connected"]` immediately after `renderHook()` got undefined.
- **Fix:** Added `await act(async () => {})` after `renderHook()` in tests that use connected/disconnected events to flush microtasks before triggering callbacks
- **Files modified:** apps/frontend/src/hooks/use-gamepad.test.ts
- **Verification:** All 6 tests pass (previously 3 failed)
- **Committed in:** b9cee5c5 (Task 2 commit)

**2. [Rule 1 - Bug] TypeScript strict mode: non-null assertions on listenerCallbacks calls**
- **Found during:** Build verification
- **Issue:** `Record<string, T>` access returns `T | undefined`. TypeScript's strict mode (noUncheckedIndexedAccess) flagged 8 invocation sites of `listenerCallbacks[event](...)` as possibly invoking undefined.
- **Fix:** Added non-null assertions: `listenerCallbacks[event]!(...)`
- **Files modified:** apps/frontend/src/hooks/use-gamepad.test.ts
- **Verification:** `pnpm build` passes with zero TypeScript errors
- **Committed in:** b9cee5c5 (Task 2 commit)

**3. [Rule 1 - Bug] Prettier formatting mismatch in use-gamepad.ts**
- **Found during:** Post-commit lint check
- **Issue:** Plan's multiline `listen(event, (event) => { ... })` format didn't match Prettier's 120-char line width rules
- **Fix:** Ran `prettier --write apps/frontend/src/hooks/use-gamepad.ts` — collapsed multiline callbacks to single-line
- **Files modified:** apps/frontend/src/hooks/use-gamepad.ts
- **Verification:** `pnpm format:check` passes
- **Committed in:** ec96483b (style commit)

---

**Total deviations:** 3 auto-fixed (1 missing critical, 2 bugs)
**Impact on plan:** All fixes necessary for correctness and project conventions. No scope creep.

## Issues Encountered
- Async useEffect microtask timing: The hook's async setup() requires microtask flush in tests before connected/disconnected callbacks are available. This is correct runtime behavior — the hook works properly in the app (microtasks resolve naturally between render frames). Only test environments need explicit flushing.
- Vitest vi.mock hoisting: Used `vi.hoisted()` pattern to safely share mock state between the hoisted vi.mock factory and test assertions. Prevents TDZ/hoisting-ordering bugs.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- **useGamepad() rewritten** — consumes Tauri gamepad events from Phase 8 Rust gilrs backend
- **6 event-driven tests** provide regression coverage
- **Ready for:** Phase 10 (Build and Test on SteamOS) or Phase 9 Plan 1 (use-bluetooth.ts rewrite, if pending)
- **No blockers** — hook consumers (app.tsx, control-pad.tsx, status-bar.tsx) remain unchanged since return shape is preserved

---

*Phase: 09-hook-rewrites*
*Completed: 2026-05-06*

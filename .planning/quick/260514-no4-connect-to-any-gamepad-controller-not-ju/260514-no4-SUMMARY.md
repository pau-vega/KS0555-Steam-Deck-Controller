---
phase: quick-no4
plan: "01"
subsystem: frontend/gamepad
tags: [gamepad, hook, refactor, tdd]
dependency-graph:
  requires: []
  provides: [gamepadName-exposure]
  affects: [use-gamepad, gamepad-connected-event]
tech-stack:
  added: []
  patterns: [tdd, hook-state-management]
key-files:
  created: []
  modified:
    - apps/frontend/src/hooks/use-gamepad.ts
    - apps/frontend/src/hooks/use-gamepad.test.ts
decisions:
  - "Keep isDeck: false literal for backward compat — no consumer uses it but hook contract forbids removal"
metrics:
  duration: ~5m
  completed_date: "2026-05-14"
  tasks: 2
  files_changed: 2
  tests_added: 4
---

# Quick Task 260514-no4: Connect to Any Gamepad Controller

Removed dead Steam-Deck-only detection code from the gamepad hook. Now captures and exposes gamepad name from `gamepad-connected` event payload so any controller (Xbox, PS, 8BitDo, generic) shows its identity.

## Tasks Completed

| Task | Name                                           | Commit    | Files                           |
| ---- | ---------------------------------------------- | --------- | ------------------------------- |
| 1    | Clean hook, expose gamepadName (RED+GREEN)     | 1a379983, 8ea758c5 | use-gamepad.ts, use-gamepad.test.ts |
| 2    | Test coverage for gamepadName (verification)   | (in Task 1) | use-gamepad.test.ts |

## TDD Gate Compliance

| Gate    | Commit    | Description                                                |
| ------- | --------- | ---------------------------------------------------------- |
| RED     | 1a379983  | `test(quick-no4)`: add failing tests for gamepadName       |
| GREEN   | 8ea758c5  | `feat(quick-no4)`: implement gamepadName + remove dead code |

RED confirmed failing (3 new tests, `undefined` vs expected values). GREEN confirmed passing (all 198 tests, 10 test files).

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

| File | Line | Stub | Reason |
|------|------|------|--------|
| use-gamepad.ts | 49 | `isDeck: false` literal | Backward compat — hook contract prohibits removal. app.tsx does not consume this field. |

## Verification

- `pnpm test`: 198 tests pass (10 test files), zero regressions
- `pnpm typecheck`: zero errors
- Zero references to `navigator.getGamepads`, `STEAM_DECK_VENDOR_ID`, `STEAM_DECK_PRODUCT_ID`, `isSteamDeck`, or `detectSteamDeck` in hook
- `gamepadName: string | null` exported from hook return
- `app.tsx` not modified (locked file constraint respected)
- `gamepadName` populated from `gamepad-connected` event payload, cleared on disconnect

## Self-Check

PASSED — all files exist, all commits exist.

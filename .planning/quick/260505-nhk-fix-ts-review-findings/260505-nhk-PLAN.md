---
phase: quick-260505-nhk
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/frontend/src/app.tsx
  - apps/frontend/src/main.tsx
  - apps/backend/src/index.ts
  - apps/frontend/src/hooks/use-websocket.test.ts
autonomous: true
requirements: [WR-01, WR-02, WR-03, WR-05]

must_haves:
  truths:
    - "No semicolons in app.tsx and main.tsx imports"
    - "No unused type imports in backend index.ts"
    - "Direction type imported from ./types, not redefined in app.tsx"
    - "Mock variables in use-websocket.test.ts use definite assignment (!:)"
  artifacts:
    - path: "apps/frontend/src/app.tsx"
      provides: "Semicolon-free imports, Direction imported from ./types"
      contains: "import type { Direction } from"
    - path: "apps/frontend/src/main.tsx"
      provides: "Semicolon-free imports"
    - path: "apps/backend/src/index.ts"
      provides: "Only used type imports"
    - path: "apps/frontend/src/hooks/use-websocket.test.ts"
      provides: "Definite assignment assertions for mock variables"
  key_links:
    - from: "apps/frontend/src/app.tsx"
      to: "apps/frontend/src/types.ts"
      via: "import type { Direction }"
      pattern: "import type.*Direction.*from.*types"
---

<objective>
Fix the 4 warnings (WR-01 through WR-05, excluding WR-04 which is already resolved) from the
Phase 04 code review. All fixes are mechanical: remove semicolons, prune an unused import, import
an existing type instead of redefining it, and replace a double-cast null initialization with a
definite-assignment assertion.

Purpose: Keep the codebase consistent with project conventions (Prettier semi:false, no unused
imports, no duplicate types, no null-cast mock variables).
Output: Four files corrected, all tests and lint still green.
</objective>

<execution_context>
@/Users/pauvelascogarrofe/Documents/KS0555-Steam-Deck-Controller-2/.planning/quick/260505-nhk-fix-ts-review-findings/260505-nhk-PLAN.md
</execution_context>

<context>
@/Users/pauvelascogarrofe/Documents/KS0555-Steam-Deck-Controller-2/.planning/STATE.md
@/Users/pauvelascogarrofe/Documents/KS0555-Steam-Deck-Controller-2/.planning/PROJECT.md

## Note on WR-04
WR-04 (missing tsconfigRootDir in react.js) was fixed during Phase 5 when react.js was converted
to react.ts. The file at `packages/eslint-config/src/react.ts` already contains
`tsconfigRootDir: process.cwd()`. No action needed.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix semicolons and duplicate Direction type in frontend files</name>
  <files>apps/frontend/src/app.tsx, apps/frontend/src/main.tsx</files>
  <action>
    In `apps/frontend/src/app.tsx`:
    1. Remove trailing semicolons from all import statements (lines 1-6).
    2. Remove the local `type Direction = "F" | "B" | "L" | "R" | "S"` definition (line 8).
    3. Add `import type { Direction } from "./types"` as a new import line (place it with the
       other local imports, after the third-party imports, per perfectionist/sort-imports — after
       the hooks imports).

    In `apps/frontend/src/main.tsx`:
    Remove trailing semicolons from all import statements (lines 1-5).

    The final import block in app.tsx should look like:
    ```
    import { useState, useEffect, useCallback, useRef } from "react"

    import { ControlPad } from "./components/control-pad"
    import { StatusBar } from "./components/status-bar"
    import { useGamepad } from "./hooks/use-gamepad"
    import { useWebSocket } from "./hooks/use-websocket"
    import type { Direction } from "./types"
    ```
    (No local `type Direction` definition after the imports.)

    The final import block in main.tsx should look like:
    ```
    import { StrictMode } from "react"
    import { createRoot } from "react-dom/client"

    import { App } from "./app"
    import "./index.css"
    ```
  </action>
  <verify>
    <automated>cd /Users/pauvelascogarrofe/Documents/KS0555-Steam-Deck-Controller-2 && grep -c '";$' apps/frontend/src/app.tsx apps/frontend/src/main.tsx || true</automated>
  </verify>
  <done>
    Zero lines ending with `";` in app.tsx and main.tsx. No local Direction type in app.tsx.
    `import type { Direction } from "./types"` present in app.tsx.
  </done>
</task>

<task type="auto">
  <name>Task 2: Remove unused WebSocketMessage import and fix mock variable declarations</name>
  <files>apps/backend/src/index.ts, apps/frontend/src/hooks/use-websocket.test.ts</files>
  <action>
    In `apps/backend/src/index.ts` line 5:
    Remove `WebSocketMessage` from the type import. `ServerConfig` IS used (line 10 declares
    `serverConfig: ServerConfig`), so keep it. Final import:
    ```
    import type { ValidCommand, SerialPortConfig, ServerConfig } from './types.js'
    ```

    In `apps/frontend/src/hooks/use-websocket.test.ts` lines 10-11:
    Replace the null-cast initializations with definite assignment assertions:
    ```
    let mockSendFn!: Mock
    let mockCloseFn!: Mock
    ```
    (The `beforeEach` already initializes them with `vi.fn()` — verified by reading the file.)
    Do not change anything else in the test file.
  </action>
  <verify>
    <automated>cd /Users/pauvelascogarrofe/Documents/KS0555-Steam-Deck-Controller-2 && pnpm --filter @ks0555/backend typecheck && pnpm --filter @ks0555/frontend typecheck</automated>
  </verify>
  <done>
    `WebSocketMessage` no longer appears in the index.ts import line.
    `null as unknown as Mock` no longer appears in use-websocket.test.ts.
    Both typecheck commands exit with code 0.
  </done>
</task>

<task type="auto">
  <name>Task 3: Validate — lint and tests all pass</name>
  <files></files>
  <action>
    Run the full validation suite to confirm no regressions from the four fixes:
    1. `pnpm lint` — must exit 0 (checks Prettier semi:false, no unused imports, sort-imports)
    2. `pnpm test` — all 51 tests must pass (39 frontend + 12 backend)
    3. `pnpm build` — full build must succeed

    If `pnpm lint` reports a sort-imports error for the new `import type { Direction }` line in
    app.tsx, adjust its position to satisfy perfectionist/sort-imports (type imports are sorted
    with value imports by default in this config — place it where ESLint expects it and re-run).
  </action>
  <verify>
    <automated>cd /Users/pauvelascogarrofe/Documents/KS0555-Steam-Deck-Controller-2 && pnpm lint && pnpm test && pnpm build</automated>
  </verify>
  <done>
    `pnpm lint` exits 0. `pnpm test` reports 51 passed. `pnpm build` exits 0.
  </done>
</task>

</tasks>

<verification>
After all tasks complete:
- `grep -rn 'WebSocketMessage' apps/backend/src/index.ts` returns no results
- `grep -n 'type Direction' apps/frontend/src/app.tsx` returns the import line only (not a local type definition)
- `grep -n 'null as unknown as Mock' apps/frontend/src/hooks/use-websocket.test.ts` returns no results
- `pnpm lint && pnpm test && pnpm build` all exit 0
</verification>

<success_criteria>
- WR-01 resolved: No semicolons in app.tsx or main.tsx import statements
- WR-02 resolved: Only `ValidCommand`, `SerialPortConfig`, `ServerConfig` imported in backend index.ts
- WR-03 resolved: Direction imported from ./types in app.tsx, no local type definition
- WR-04 already resolved: react.ts already has tsconfigRootDir (no action taken)
- WR-05 resolved: mockSendFn and mockCloseFn use `!:` definite assignment
- All 51 tests pass, lint clean, build succeeds
</success_criteria>

<output>
After completion, create `.planning/quick/260505-nhk-fix-ts-review-findings/260505-nhk-SUMMARY.md`
with the standard summary format documenting what was changed and the validation results.
</output>

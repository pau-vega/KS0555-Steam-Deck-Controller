---
phase: 04-typescript-quality-hardening
reviewed: 2026-05-05T09:45:00Z
depth: standard
files_reviewed: 17
files_reviewed_list:
  - apps/backend/src/__tests__/types.test.ts
  - apps/backend/src/__tests__/index.test.ts
  - apps/backend/src/index.test.ts
  - apps/backend/src/index.ts
  - apps/frontend/src/hooks/use-gamepad.test.ts
  - apps/frontend/src/hooks/use-websocket.test.ts
  - apps/frontend/src/components/control-pad.test.tsx
  - apps/frontend/src/app.tsx
  - apps/frontend/src/App.test.tsx
  - apps/frontend/src/main.tsx
  - apps/frontend/src/components/status-bar.test.tsx
  - packages/eslint-config/src/react.js
  - packages/eslint-config/src/node.js
  - apps/backend/tsconfig.json
  - apps/frontend/tsconfig.json
  - apps/frontend/vite.config.ts
  - apps/frontend/vitest.config.ts
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-05-05T09:45:00Z
**Depth:** standard
**Files Reviewed:** 17
**Status:** issues_found

## Summary

Reviewed all source files modified during phase 04 (TypeScript Quality Hardening). The phase successfully eliminated `any` types from test files, fixed `import type` syntax, added TypeScript parser to ESLint configs, and deleted 13 superseded JS files. Build, typecheck, and lint all pass.

However, several convention violations and code quality issues were found — primarily semicolons in import statements (violating project Prettier config), unused type imports, and a duplicate `Direction` type definition.

## Warnings

### WR-01: Semicolons in import statements violate Prettier config

**File:** `apps/frontend/src/app.tsx:1-6`
**Issue:** Import statements use semicolons, violating the project's Prettier config (`"semi": false`). The same issue appears in `main.tsx:1`.

```typescript
import { useState, useEffect, useCallback, useRef } from "react";
//                                                      ^
```

**Fix:**
Run Prettier to fix all files, or manually remove semicolons:
```typescript
import { useState, useEffect, useCallback, useRef } from "react"
```

Apply to both `app.tsx` and `main.tsx`.

---

### WR-02: Unused type imports in backend index.ts

**File:** `apps/backend/src/index.ts:5`
**Issue:** Type imports `WebSocketMessage` and `ServerConfig` are imported but never used in the code.

```typescript
import type { ValidCommand, WebSocketMessage, SerialPortConfig, ServerConfig } from './types.js'
//                          ^^^^^^^^^^^^^^^^                    ^^^^^^^^^^^^
```

**Fix:** Remove unused type imports:
```typescript
import type { ValidCommand, SerialPortConfig } from './types.js'
```

---

### WR-03: Duplicate Direction type definition

**File:** `apps/frontend/src/app.tsx:8`
**Issue:** `Direction` type is defined locally in `app.tsx`, but the same type is already exported from `apps/frontend/src/types.ts` and used in other files (e.g., `control-pad.test.tsx` imports it from `../types`). This creates a duplicate type that could diverge.

```typescript
type Direction = "F" | "B" | "L" | "R" | "S";  // app.tsx:8
// vs
export type Direction = "F" | "B" | "L" | "R" | "S";  // types.ts:1
```

**Fix:** Import `Direction` from `types.ts` instead of redefining it:

```typescript
import type { Direction } from "./types";

// Remove the local type definition:
// type Direction = "F" | "B" | "L" | "R" | "S";
```

---

### WR-04: Missing tsconfigRootDir in react.js ESLint config

**File:** `packages/eslint-config/src/react.js:9-13`
**Issue:** The `react.js` ESLint config is missing `tsconfigRootDir: process.cwd()`, which is present in the `node.js` config. Without it, the `@typescript-eslint/parser` might not resolve `tsconfig.json` correctly when ESLint is run from different working directories.

```javascript
languageOptions: {
  parser: require("@typescript-eslint/parser"),
  parserOptions: {
    project: "./tsconfig.json"
    // Missing: tsconfigRootDir: process.cwd()
  }
}
```

**Fix:** Add `tsconfigRootDir` to match `node.js` config:
```javascript
languageOptions: {
  parser: require("@typescript-eslint/parser"),
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: process.cwd()
  }
}
```

---

### WR-05: Null initialization with type assertions for Mock objects

**File:** `apps/frontend/src/hooks/use-websocket.test.ts:10-11`
**Issue:** `mockSendFn` and `mockCloseFn` are initialized with `null as unknown as Mock`, which is a pattern that bypasses type safety. If the variables are accessed before `beforeEach` initializes them, they would be `null` at runtime despite TypeScript thinking they're `Mock`.

```typescript
let mockSendFn: Mock = null as unknown as Mock
let mockCloseFn: Mock = null as unknown as Mock
```

**Fix:** Use proper initialization or definite assignment assertions:

```typescript
let mockSendFn!: Mock
let mockCloseFn!: Mock

// Then initialize in beforeEach:
beforeEach(() => {
  mockSendFn = vi.fn()
  mockCloseFn = vi.fn()
})
```

Or use a simpler pattern without the double assertion:
```typescript
let mockSendFn = vi.fn()
let mockCloseFn = vi.fn()
```

---

## Info

### IN-01: Gamepad mock uses double type assertion

**File:** `apps/frontend/src/hooks/use-gamepad.test.ts:17`
**Issue:** The `createMockGamepad` function uses `as unknown as Gamepad` double assertion to bypass TypeScript's type checking. While this works for tests, it could hide type errors if the `Gamepad` interface changes.

```typescript
return {
  axes,
  id,
  ...
} as unknown as Gamepad
```

**Fix:** Consider using a more type-safe approach:
```typescript
function createMockGamepad(axes: number[], id = 'Steam Deck Gamepad'): Gamepad {
  return {
    axes,
    id,
    connected: true,
    timestamp: 0,
    mapping: 'standard' as GamepadMappingType,
    index: 0,
    buttons: [] as GamepadButton[],
    hapticActuators: [],
    vibrationActuator: null,
  } satisfies Gamepad
}
```

Or use `vi.mocked` or proper mock factories if available.

---

### IN-02: WebSocket test defines custom WS_* constants

**File:** `apps/frontend/src/hooks/use-websocket.test.ts:22-24`
**Issue:** The test defines custom `WS_OPEN`, `WS_CLOSED`, `WS_CONNECTING` constants, but could use the built-in `WebSocket.OPEN`, `WebSocket.CLOSED`, `WebSocket.CONNECTING` values for consistency with the actual implementation.

```typescript
const WS_OPEN = 1
const WS_CLOSED = 3
const WS_CONNECTING = 0
```

**Fix:** Use WebSocket constants directly:
```typescript
// Remove custom constants, use WebSocket.* instead:
this.readyState = WebSocket.CONNECTING
// ...
MockWebSocket.OPEN = WebSocket.OPEN
```

---

### IN-03: createMockGamepad missing some Gamepad properties

**File:** `apps/frontend/src/hooks/use-gamepad.test.ts:6-18`
**Issue:** The mock Gamepad object is missing some properties that might be required in certain TypeScript configurations or future Gamepad API updates. The mock also uses `buttons: []` which should be `buttons: readonly GamepadButton[]`.

**Note:** This is currently working for the tests, but could be fragile if the `Gamepad` interface changes.

**Fix:** Consider using a more complete mock or the `satisfies` keyword (if using TypeScript 4.9+):
```typescript
function createMockGamepad(axes: number[], id = 'Steam Deck Gamepad'): Gamepad {
  return {
    axes,
    id,
    connected: true,
    timestamp: 0,
    mapping: 'standard' as const,
    index: 0,
    buttons: [] as GamepadButton[],
    hapticActuators: [],
    vibrationActuator: null,
  } satisfies Gamepad
}
```

---

## Skipped Files

The following files were deleted in phase 04-01 and thus not reviewed:
- `apps/frontend/src/app.js`
- `apps/frontend/src/App.test.js`
- `apps/frontend/src/control-pad.js`
- `apps/frontend/src/control-pad.test.js`
- `apps/frontend/src/status-bar.js`
- `apps/frontend/src/status-bar.test.js`
- `apps/frontend/src/use-gamepad.js`
- `apps/frontend/src/use-gamepad.test.js`
- `apps/frontend/src/use-websocket.js`
- `apps/frontend/src/use-websocket.test.js`
- `apps/frontend/src/main.js`
- `apps/frontend/src/setupTests.js`
- `apps/frontend/src/types.js`

---

_Reviewed: 2026-05-05T09:45:00Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_

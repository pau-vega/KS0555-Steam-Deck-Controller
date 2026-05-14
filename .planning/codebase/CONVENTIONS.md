# Coding Conventions

**Analysis Date:** 2026-05-14

The TypeScript style is governed by `.agents/rules/typescript.md`. The Rust style is governed by `cargo fmt`. The project enforces Conventional Commits via `commitlint.config.ts` and runs `lint → typecheck → test` via lefthook on every commit.

## Naming Patterns

**Files (TypeScript/TSX):**
- kebab-case for all source files: `control-pad.tsx`, `status-bar.tsx`, `use-bluetooth.ts`, `error-boundary.tsx`
- Test files mirror the source filename with `.test.ts(x)` suffix: `control-pad.test.tsx`, `use-bluetooth.test.ts`
- Exception: `App.test.tsx` and `setupTests.ts` use PascalCase / camelCase respectively (historical, do not propagate)
- TypeScript type declaration files use `.d.ts`: `vite-env.d.ts`
- Examples: `apps/frontend/src/components/control-pad.tsx`, `apps/frontend/src/hooks/use-gamepad.ts`

**Files (Rust):**
- snake_case modules: `mod.rs`, `state.rs`, `main.rs`, `lib.rs`
- snake_case integration tests with `_test` suffix: `ble_connect_test.rs`, `flatpak_sandbox_test.rs`
- Module subdirectories with `mod.rs` entry: `src/ble/mod.rs`, `src/gamepad/mod.rs`

**Functions:**
- TypeScript: camelCase — `useBluetooth()`, `isTauri()`, `sendCommand()`, `detectSteamDeck()`
- Rust: snake_case — `ble_connect`, `ble_send`, `ble_disconnect`, `setup_event_listener`, `compute_direction`, `get_direction_from_axes`, `find_bt24`

**Variables:**
- TypeScript: camelCase — `bleConnected`, `gamepadConnected`, `prevDirection`, `lastCommand`
- React props as destructured interface fields: `{ onCommand, disabled }`
- Rust: snake_case — `connected_gamepad_id`, `last_direction`, `dpad_button_x`

**Types & Interfaces:**
- TypeScript types/interfaces use PascalCase: `Direction`, `BluetoothState`, `ControlPadProps`, `StatusBarProps`, `ErrorBoundaryState`
- React components use PascalCase: `App`, `ControlPad`, `StatusBar`, `ErrorBoundary`
- Rust types use PascalCase: `BleState`, `Direction` (in `gamepad/mod.rs`)

**Constants:**
- TypeScript module-level constants: `SCREAMING_SNAKE_CASE` — `SERVICE_UUID`, `CHARACTERISTIC_UUID`, `STEAM_DECK_VENDOR_ID`, `STEAM_DECK_PRODUCT_ID` in `apps/frontend/src/hooks/use-bluetooth.ts` and `use-gamepad.ts`
- TypeScript local array of config objects: `BUTTONS` in `apps/frontend/src/components/control-pad.tsx:3`
- Rust: `SCREAMING_SNAKE_CASE` — `BT24_NAME`, `SCAN_TIMEOUT`, `BT24_CHAR_UUID`, `DEADZONE`

**Type Parameters:**
- T-prefixed generics per `.agents/rules/typescript.md` — `TItem`, `TData`, `TKey`, `TValue`
- Current codebase has minimal generics, but rule applies: e.g. `Mock<(command: Direction) => void>` in `apps/frontend/src/components/control-pad.test.tsx:11`

## Code Style

**Formatting (Prettier):**
- Config: `.prettierrc` — `{ "semi": false, "printWidth": 120 }`
- No semicolons at statement ends
- 120-character line width
- Default Prettier rules for everything else (double quotes, 2-space indent, trailing commas)
- Run: `pnpm format` (writes) / `pnpm format:check` (verifies). CI runs `format:check` after build.
- Prettier ignores in `.prettierignore` cover `dist/`, `target/`, `node_modules/`, etc.

**Linting (ESLint):**
- Root config: `eslint.config.ts` (flat config, ESLint v10). Only enforces JSON linting at root level and ignores common build dirs.
- Frontend uses `packages/eslint-config/src/react.ts` (selected via `apps/frontend/package.json` `lint` script — explicit `--config` pointer).
- Rules currently enforced:
  - `perfectionist/sort-imports`: error (alphabetical import sorting)
- Plugins available but not yet rule-configured: `eslint-plugin-react`, `eslint-plugin-react-hooks`, `@typescript-eslint`
- Run: `pnpm lint` (via turbo).

**TypeScript Compiler:**
- Base config: `packages/tsconfig/tsconfig.json`
  - `strict: true`
  - `noUncheckedIndexedAccess: true` — array/record indexing returns `T | undefined`; handle undefined explicitly
  - `target: "ES2022"`, `module: "ESNext"`, `moduleResolution: "bundler"`
  - `forceConsistentCasingInFileNames: true`
- React variant: `packages/tsconfig/tsconfig.react.json` adds `jsx: "react-jsx"` and DOM libs
- Run: `pnpm typecheck` (`tsc --noEmit` via turbo)

## Import Organization

**Order (enforced by `perfectionist/sort-imports`):**
1. Type imports (`import type { ... }`) — grouped at top
2. External packages (e.g. `react`, `@tauri-apps/api/core`, `@testing-library/react`)
3. Internal relative imports (`./`, `../`)

**Example** (`apps/frontend/src/app.tsx`):
```ts
import { useState, useEffect, useCallback, useRef } from "react"

import type { Direction } from "./types"

import { ControlPad } from "./components/control-pad"
import { StatusBar } from "./components/status-bar"
import { useBluetooth } from "./hooks/use-bluetooth"
import { useGamepad } from "./hooks/use-gamepad"
```

**Type-only imports:**
- Always use top-level `import type` — never inline `import { type X }`
- See `apps/frontend/src/components/control-pad.tsx:1`, `apps/frontend/src/components/error-boundary.tsx:1`, `apps/frontend/src/hooks/use-gamepad.ts:1`

**Path aliases:**
- `@/*` → `./src/*` is configured in `apps/frontend/tsconfig.json` and `apps/frontend/vite.config.ts`
- Not currently used in source — relative imports dominate. Prefer relative imports for siblings; reserve `@/` for cross-directory clarity if introduced.

**Exports:**
- Named exports only. Default exports are prohibited per `.agents/rules/typescript.md` (exception: framework-required defaults, none currently).
- All components and hooks use named exports: `export function App()`, `export function ControlPad()`, `export function useBluetooth()`.

## Types & Interfaces

**Discriminated unions for variant state:**
- See `BluetoothState` in `apps/frontend/src/hooks/use-bluetooth.ts:5` — `"disconnected" | "connecting" | "connected" | "unsupported"`
- See `Direction` in `apps/frontend/src/types.ts:1` — `"F" | "B" | "L" | "R" | "S"`
- Single source of truth for `Direction` lives in `apps/frontend/src/types.ts` and is imported wherever needed

**Interface vs type alias:**
- React component props use `interface ... { ... }` — `ControlPadProps`, `StatusBarProps`, `ErrorBoundaryState`
- String literal unions use `type ... = ...` — `Direction`, `BluetoothState`
- Prefer `interface extends X, Y {}` over `type C = X & Y` for inheritance (rule)

**Optional properties:**
- Use `prop?: T` instead of `prop: T | undefined` — e.g. `connecting?: boolean` in `StatusBarProps` (`apps/frontend/src/components/status-bar.tsx:4`)

**No `readonly` by default:**
- Add `readonly` only when immutability is a critical invariant. Current props/state types intentionally omit it.

**No enums:**
- TypeScript `enum` is forbidden. Use `as const` objects for keyed lookup tables and string-literal unions for tagged values. Rust enums (e.g. `Direction` in `apps/frontend/src-tauri/src/gamepad/mod.rs:8`) are unaffected by this rule.

## Functions

**Top-level return types:**
- Required on module-level utility functions: `function isTauri(): boolean` (`apps/frontend/src/hooks/use-bluetooth.ts:24`), `function isSteamDeck(gamepad: Gamepad): boolean` (`apps/frontend/src/hooks/use-gamepad.ts:9`)
- Not required on React components: `export function App()` returns JSX inferred
- Not required on custom hooks: `export function useBluetooth()` returns an object literal inferred
- Rust functions follow standard explicit return-type style: `pub async fn ble_connect(...) -> Result<(), String>`

**Arrow vs function declarations:**
- Top-level React components and exports use `function` declarations: `export function App() { ... }`
- Inline callbacks and detection helpers use arrow functions: `const isBluetoothConnecting = connecting && !bleConnected`, `() => onCommand(command)`, `const setup = async () => { ... }`
- React `useCallback` wraps stable callbacks: `const sendCommand = useCallback((cmd: Direction) => { ... }, [send])`

**No `any`:**
- Codebase avoids `any`. Where DOM globals must be patched in tests, cast to `unknown` first:
  - `delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__` (`apps/frontend/src/hooks/use-bluetooth.test.ts:40`)
- For event payloads of unknown shape, type as `unknown` and narrow at the boundary.

## Error Handling

**Frontend (TypeScript):**
- Async I/O wrapped in `try/catch`, errors normalized to `string` for UI display:
  ```ts
  // apps/frontend/src/hooks/use-bluetooth.ts:78-83
  try {
    await invoke("ble_connect")
    setState("connected")
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error("BLE connect failed:", e)
    setError(msg)
    setState("disconnected")
  }
  ```
- Always narrow `unknown` errors via `e instanceof Error ? e.message : String(e)` before surfacing.
- Component-level error capture via `ErrorBoundary` class component (`apps/frontend/src/components/error-boundary.tsx`) wrapping `<App />` in `main.tsx`.

**Result types over throwing:**
- The rule favors `Result<T, E>` (`type Result<T, E extends Error> = { ok: true; value: T } | { ok: false; error: E }`) over throwing when the caller must explicitly handle failure.
- React event handlers and framework-caught throws are fine as-is. Use Result-style returns when adding new pure utility functions whose failure is part of their contract.

**Backend (Rust):**
- All Tauri commands return `Result<(), String>` — frontend receives the `Err` string verbatim:
  ```rust
  // apps/frontend/src-tauri/src/ble/mod.rs:32
  pub async fn ble_connect(app: AppHandle, state: tauri::State<'_, BleState>) -> Result<(), String>
  ```
- Convert library errors via `.map_err(|e| format!("...: {}", e))?` — produces user-readable messages:
  ```rust
  // apps/frontend/src-tauri/src/ble/mod.rs:36-38
  let manager = Manager::new()
      .await
      .map_err(|e| format!("Failed to create BLE manager: {}", e))?;
  ```
- Event listener spawned in `setup_event_listener` silently ignores errors with `let _ = ...` — appropriate for fire-and-forget event emission. Do not propagate this pattern to command bodies.
- Mutex unwrap is acceptable for unrecoverable poisoning in `BleState::set/get` (`apps/frontend/src-tauri/src/ble/state.rs:16,22`).

## Logging

**Framework:**
- TypeScript: `console.error`/`console.log` only. No structured logger.
  - `console.error("Failed to set up BLE event listener:", e)` (`apps/frontend/src/hooks/use-bluetooth.ts:59`)
  - `console.log("[SteamDeck] Detected:", deck.id)` (`apps/frontend/src/hooks/use-gamepad.ts:59`)
- Rust: `eprintln!` for diagnostics, prefixed with module tag.
  - `eprintln!("[ble] {}", msg)` (`apps/frontend/src-tauri/src/ble/mod.rs:113`)
  - `eprintln!("[gamepad] found on startup: ...")` (`apps/frontend/src-tauri/src/gamepad/mod.rs:131`)
  - `eprintln!("[debug] D-Bus rewrite: ...")` (`apps/frontend/src-tauri/src/lib.rs:24`)

**Conventions:**
- Module/subsystem prefix in brackets: `[ble]`, `[gamepad]`, `[debug]`, `[SteamDeck]`
- Log errors at the catch site, then surface a clean message to the user via state.
- Do not introduce new logging libraries without ADR.

## Comments

**When to comment:**
- Cross-reference requirement/decision IDs from `.planning/` docs in source: `// BLE-01`, `// D-04`, `// VAL-03`, `// GPAD-05`, `// SBX-05`, `// FRONT-07`
- Explain non-obvious platform behavior: see `apps/frontend/src/hooks/use-bluetooth.ts:10-23` (Tauri global detection rationale)
- Document pitfalls inline: `apps/frontend/src-tauri/src/lib.rs:20-23` ("Pitfall 13"), `apps/frontend/src-tauri/src/main.rs:2` ("WebKit bug 180739")

**JSDoc:**
- Use `/** ... */` only when behavior isn't self-evident. Keep concise.
- Example: `apps/frontend/src/hooks/use-bluetooth.ts:10-23` documents `isTauri()` with multi-line block including the silent-failure history.
- No JSDoc on trivial component props or self-explanatory pure functions.

**Section dividers (Rust):**
- Long modules use Unicode box-drawing dividers for sections:
  - `// ── Unit Tests ─────────────────────────` (`apps/frontend/src-tauri/src/gamepad/mod.rs:221`)
  - `// ── VAL-03: BLE Event Pipeline ────────` (`apps/frontend/src-tauri/tests/validation_test.rs:11`)

## Function Design

**Size:**
- React components stay small (<60 lines). `App` is 47 lines (`apps/frontend/src/app.tsx`), `ControlPad` is 37 lines, `StatusBar` is 30 lines.
- Hooks are larger when they encapsulate async setup/teardown: `useBluetooth` is 143 lines, `useGamepad` is 73 lines.
- Rust command functions: `ble_connect` is ~95 lines including timeout/event loop — acceptable for the protocol logic it owns.

**Parameters:**
- React components use destructured props with explicit interface: `function ControlPad({ onCommand, disabled }: ControlPadProps)`
- Hooks take no parameters in this codebase; they encapsulate global subsystems (`useBluetooth`, `useGamepad`).
- Tauri commands accept `AppHandle`, `tauri::State<'_, BleState>`, and a `command: String` payload — typed per Tauri's `#[tauri::command]` macro.

**Return values:**
- Hooks return an object literal of `{ state, actions }` — destructured at the call site: `const { connected, connecting, connect, send, error } = useBluetooth()`
- Pure helpers return discriminants or primitives: `isTauri(): boolean`, `isSteamDeck(gamepad): boolean`, `get_direction_from_axes(x, y) -> Direction`

## Module Design

**Exports:**
- Named exports only. No default exports (rule enforced by `.agents/rules/typescript.md`).
- Hook files export the hook only: `export function useBluetooth() { ... }`
- Component files export the component only: `export function ControlPad(...) { ... }`
- Shared types live in `apps/frontend/src/types.ts` — `export type Direction = ...`

**Barrel files:**
- Not used. Each module is imported directly from its source file. Do not introduce `index.ts` re-export barrels — they hide dependency direction and complicate tree-shaking.

**Workspace boundaries (pnpm + Turborepo):**
- `apps/frontend` is the only application package (`@ks0555/frontend`).
- Shared config packages: `@ks0555/eslint-config` (`packages/eslint-config`), `@ks0555/tsconfig` (`packages/tsconfig`).
- Cross-package references use `workspace:*` in `package.json`.
- `turbo.json` defines task graph: `build`, `lint`, `typecheck`, `test` all support `dependsOn: ["^X"]`.

## Rust-Specific Conventions

**Module layout:**
- Feature-based modules with `mod.rs`: `src/ble/mod.rs` + `src/ble/state.rs`, `src/gamepad/mod.rs`
- Public API re-exported at module root: `pub use state::BleState;` (`apps/frontend/src-tauri/src/ble/mod.rs:10`)
- Crate library entry `src/lib.rs` exposes `pub fn run()`; `src/main.rs` calls `app_lib::run()` after one `set_var` call.

**Tauri commands:**
- All commands annotated `#[tauri::command]` and registered in `tauri::generate_handler![ble_connect, ble_disconnect, ble_send]` (`apps/frontend/src-tauri/src/lib.rs:54-58`).
- Return `Result<(), String>` for IPC-friendly error messages.

**State management:**
- Tauri-managed state via `app.manage(ble_state.clone())` (`apps/frontend/src-tauri/src/lib.rs:44`).
- `BleState` uses `Arc<Mutex<Option<Peripheral>>>` and implements `Clone` (`apps/frontend/src-tauri/src/ble/state.rs`) — the Arc clone is the shared handle.

**Threading model:**
- BLE event listener: `tauri::async_runtime::spawn` (tokio task)
- Gamepad monitor: `std::thread::spawn` — required because `gilrs::Gilrs` is `!Send + !Sync` and must live for the thread lifetime (`apps/frontend/src-tauri/src/gamepad/mod.rs:119`, documented D-32/D-33).
- Do not mix the two for the same subsystem.

**Event payloads:**
- JSON via `serde_json::json!`: `app_handle.emit("gamepad-direction", serde_json::json!({ "direction": "F" }))` (`apps/frontend/src-tauri/src/gamepad/mod.rs:189`)
- Event name format: kebab-case dash-separated — `ble-state-changed`, `gamepad-direction`, `gamepad-connected`, `gamepad-disconnected`.

## Pre-Commit / CI Enforcement

**lefthook (`lefthook.yml`):**
- `pre-commit` runs in parallel: `just format` (auto-stages fixes), `just lint`, `just typecheck`
- `commit-msg` runs `commitlint --edit "$LEFTHOOK_COMMIT_MSG"`
- `.husky/pre-commit` and `.husky/commit-msg` are thin shims that delegate to lefthook

**Commitlint (`commitlint.config.ts`):**
- `extends: ["@commitlint/config-conventional"]`
- Required format: `<type>(<scope>): <description>`, e.g. `feat(tauri): add BLE retry`, `fix(ble): handle null GATT`, `chore(ci): bump turbo`
- See recent log: `chore(main): release 0.0.1`, `fix(ci): simplify release-please tag format`

**CI (`.github/workflows/ci.yml`):**
- Runs on PRs to `main`. Single job: `pnpm turbo build lint typecheck test` then `pnpm format:check` then `git diff --exit-code -- apps/frontend/src/app.tsx`.
- Build runs **before** lint/typecheck (turbo task graph). Build failures must be fixed first.
- `app.tsx` is locked — any modification fails CI. Edit components, hooks, or new files instead.

**Release tooling:**
- `release-please` (configured via `.github/release-please-config.json` and `.github/workflows/release-please.yml`) generates `CHANGELOG.md` and bumps versions from Conventional Commits.
- Per-package versioning: `apps/frontend` (`0.1.3`), `apps/frontend/src-tauri/Cargo.toml` (`0.1.21`), root (`0.0.1`).

## Dependency Management

- Package manager: `pnpm@10.29.3` (pinned in root `package.json` via `packageManager` field).
- Workspace declared in `pnpm-workspace.yaml`.
- Node version: `>=18.0.0` (`engines.node` in root `package.json`); `.nvmrc` pins specific version.
- When adding dependencies, use the CLI (`pnpm add` / `pnpm add -D`) so the latest version is resolved — do not hand-edit `package.json`.
- Rust dependencies in `apps/frontend/src-tauri/Cargo.toml`; Linux-only target overrides for `gilrs` evdev features.

---

*Convention analysis: 2026-05-14*

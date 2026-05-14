# Testing Patterns

**Analysis Date:** 2026-05-14

The project has two parallel test stacks: **Vitest** for the TypeScript/React frontend, and **`cargo test`** for the Rust Tauri backend (`src-tauri`). Both run under `pnpm test` via Turborepo, and CI runs `pnpm turbo build lint typecheck test` on every PR (`.github/workflows/ci.yml`).

## Test Framework

**Frontend Runner:**
- `vitest@^4.1.5` (`apps/frontend/package.json`)
- Config: `apps/frontend/vitest.config.ts`
- Environment: `jsdom@^29.1.1`
- React testing: `@testing-library/react@^16.3.2` + `@testing-library/jest-dom@^6.9.1`

**Backend Runner:**
- `cargo test` (built into Rust toolchain)
- Cargo manifest: `apps/frontend/src-tauri/Cargo.toml`
- Integration tests live alongside the crate under `apps/frontend/src-tauri/tests/`
- Unit tests live inline with `#[cfg(test)] mod tests { ... }`

**Assertion Libraries:**
- TypeScript: Vitest's built-in `expect` + `@testing-library/jest-dom/vitest` matchers (`toBeInTheDocument`, `toBeDisabled`, etc.)
- Rust: standard `assert!`, `assert_eq!` from `std`

**Run Commands:**
```bash
pnpm test                       # All tests via turbo (Vitest in frontend; cargo test if wired)
pnpm --filter @ks0555/frontend test   # Frontend only
cd apps/frontend && pnpm test   # Vitest run (single pass, no watch)
cd apps/frontend/src-tauri && cargo test   # Rust unit + integration tests
just test                       # Alias for pnpm test
just check                      # lint → typecheck → test (full pre-commit suite)
```

The frontend `test` script is `vitest run` (`apps/frontend/package.json:13`) — single-pass non-watch mode for CI. Use `vitest` directly for watch mode locally.

## Test File Organization

**Location (TypeScript):**
- Co-located with source files: `apps/frontend/src/components/control-pad.tsx` ↔ `control-pad.test.tsx`
- Hook tests in the same directory: `apps/frontend/src/hooks/use-bluetooth.ts` ↔ `use-bluetooth.test.ts`
- App-level test at `apps/frontend/src/App.test.tsx` (note PascalCase — historical exception; new tests use kebab-case)
- Cross-cutting structural tests (CI, docs, deployment) at `apps/frontend/src/` root: `ci-workflow.test.ts`, `docs.test.ts`, `deployment.test.ts`, `verification-docs.test.ts`, `tauri-frontend.test.ts`

**Location (Rust):**
- Inline unit tests with `#[cfg(test)] mod tests` directly below the implementation: `apps/frontend/src-tauri/src/gamepad/mod.rs:221`
- Integration tests in `apps/frontend/src-tauri/tests/*.rs` — one file per requirement area:
  - `ble_connect_test.rs`, `ble_disconnect_test.rs`, `ble_send_test.rs`, `ble_event_test.rs`
  - `ble_state_test.rs`, `ble_linux_filter_test.rs`
  - `flatpak_sandbox_test.rs`, `tauri_shell_test.rs`
  - `validation_test.rs` (cross-cutting contract tests)

**Naming:**
- TS: `<source>.test.ts(x)` — kebab-case matching source filename
- Rust integration: `<feature>_test.rs` — snake_case feature + `_test` suffix
- Test suites named after the symbol under test: `describe("ControlPad", ...)`, `describe("useBluetooth (Tauri IPC)", ...)`

**Vitest include pattern:**
```ts
// apps/frontend/vitest.config.ts
test: {
  environment: "jsdom",
  include: ["src/**/*.test.{ts,tsx}"],
  setupFiles: ["./src/setupTests.ts"],
}
```

## Test Structure

**Suite Organization (Vitest):**
```ts
// apps/frontend/src/components/control-pad.test.tsx
import type { Mock } from "vitest"

import { render, screen, fireEvent, within } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import type { Direction } from "../types"

import { ControlPad } from "./control-pad"

describe("ControlPad", () => {
  let mockOnCommand: Mock<(command: Direction) => void>

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnCommand = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders all 5 control buttons", () => {
    const { container } = render(<ControlPad onCommand={mockOnCommand} disabled={false} />)
    const buttons = container.querySelectorAll("button")
    expect(buttons).toHaveLength(5)
  })
})
```

**Patterns:**
- Always import explicit Vitest globals: `describe`, `it`, `expect`, `vi`, `beforeEach`, `afterEach`, plus types (`Mock`) when needed
- One `describe` per symbol under test; nested `describe` for variant contexts (e.g. `describe("useBluetooth (Web Bluetooth)")` and `describe("useBluetooth (Tauri IPC)")` in `use-bluetooth.test.ts:49,150`)
- `beforeEach` resets mocks via `vi.clearAllMocks()` and reinitializes fresh mock objects
- `afterEach` calls `vi.restoreAllMocks()` to restore any spy-replaced globals
- Test descriptions follow the requirement-tracking convention: `it("FRONT-07: send() called once when direction changes ...", ...)` (`apps/frontend/src/App.test.tsx:88`) — link tests to requirement IDs from `.planning/` docs

**Suite Organization (Rust):**
```rust
// apps/frontend/src-tauri/src/gamepad/mod.rs:223
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_deadzone_returns_stop() {
        assert_eq!(get_direction_from_axes(0.0, 0.0), Direction::S);
        assert_eq!(get_direction_from_axes(0.1, 0.1), Direction::S);
        assert_eq!(get_direction_from_axes(-0.14, 0.14), Direction::S);
    }
}
```

```rust
// apps/frontend/src-tauri/tests/ble_send_test.rs
#[cfg(test)]
mod tests {
    use std::fs;

    #[test]
    fn test_ble_send_function_exists() {
        let content = fs::read_to_string("src/ble/mod.rs").expect("Should be able to read mod.rs");
        assert!(
            content.contains("pub async fn ble_send"),
            "ble_send function should be public and async"
        );
    }
}
```

**Patterns:**
- Inline `#[cfg(test)] mod tests` for pure-function unit tests (e.g. `get_direction_from_axes`)
- Integration tests gated by `#![cfg(test)]` or `#[cfg(test)]` at module level
- Test functions named `test_<requirement_id>_<behavior>` or `test_<what_it_does>` — e.g. `test_taur02_tauri_conf_json_has_product_name`
- Failure messages encode the expectation: `assert!(matches, "Should ...")` — diagnostic text appears in CI logs

## Mocking

**Framework:** `vi` from Vitest (`vi.mock`, `vi.fn`, `vi.spyOn`, `vi.hoisted`, `vi.stubGlobal`).

**Module mocking pattern (`vi.mock` factory):**
```ts
// apps/frontend/src/App.test.tsx:12-24
const mockSend = vi.fn()
const mockConnect = vi.fn()

vi.mock("./hooks/use-bluetooth", () => ({
  useBluetooth: () => ({
    connected: true,
    connecting: false,
    unsupported: false,
    connect: mockConnect,
    send: mockSend,
  }),
}))

vi.mock("./hooks/use-gamepad", () => ({
  useGamepad: () => mockUseGamepad(),
}))
```

The `vi.mock(...)` calls are hoisted by Vitest above the file's imports and `const` declarations, so any variable captured in the factory body must itself be hoisted with `vi.hoisted`.

**`vi.hoisted` for shared mock state:**
```ts
// apps/frontend/src/hooks/use-bluetooth.test.ts:14-26
const capturedBleHandler = vi.hoisted(() => ({ current: null as ((event: { payload: string }) => void) | null }))
const mockUnlisten = vi.hoisted(() => vi.fn())
const mockTauriListen = vi.hoisted(() =>
  vi.fn((_event: string, handler: (event: { payload: string }) => void) => {
    capturedBleHandler.current = handler
    return Promise.resolve(mockUnlisten)
  }),
)
const mockTauriInvoke = vi.hoisted(() => vi.fn())

vi.mock("@tauri-apps/api/core", () => ({ invoke: mockTauriInvoke }))
vi.mock("@tauri-apps/api/event", () => ({ listen: mockTauriListen }))
```

**Capturing Tauri event handlers** is the key idiom: `mockTauriListen` stores the callback passed to `listen()` so the test can invoke it later via `capturedBleHandler.current?.({ payload: "connected" })`.

**Object destructuring of hoisted mocks:**
```ts
// apps/frontend/src/hooks/use-gamepad.test.ts:8-16
const { listenerCallbacks, mockUnlistenDirection, mockUnlistenConnected, mockUnlistenDisconnected } = vi.hoisted(() => {
  const callbacks: Record<string, (payload: unknown) => void> = {}
  return {
    listenerCallbacks: callbacks,
    mockUnlistenDirection: vi.fn(),
    mockUnlistenConnected: vi.fn(),
    mockUnlistenDisconnected: vi.fn(),
  }
})
```

**Global stubbing:**
```ts
// apps/frontend/src/hooks/use-gamepad.test.ts:6
vi.stubGlobal("__TAURI_INTERNALS__", {})
```

**Manual `window` patching for Tauri-vs-browser path selection:**
```ts
// apps/frontend/src/hooks/use-bluetooth.test.ts:38-43
beforeEach(() => {
  vi.clearAllMocks()
  delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__
  delete (window as unknown as Record<string, unknown>).__TAURI__
  capturedBleHandler.current = null
})
```

**Web Bluetooth API mocking:**
```ts
// apps/frontend/src/hooks/use-bluetooth.test.ts:50-65
beforeEach(() => {
  mockWriteValue.mockResolvedValue(undefined)
  mockGetCharacteristic.mockResolvedValue({ writeValue: mockWriteValue })
  mockGetPrimaryService.mockResolvedValue({ getCharacteristic: mockGetCharacteristic })
  mockGattConnect.mockResolvedValue({ getPrimaryService: mockGetPrimaryService })
  mockRequestDevice.mockResolvedValue({
    gatt: { connect: mockGattConnect },
    addEventListener: mockAddEventListener,
  })
  Object.defineProperty(navigator, "bluetooth", {
    value: { requestDevice: mockRequestDevice },
    configurable: true,
    writable: true,
  })
})
```

Build the GATT chain bottom-up; chain each mock's `mockResolvedValue` to the next layer.

**Typed `Mock` for prop callbacks:**
```ts
// apps/frontend/src/components/control-pad.test.tsx:11
let mockOnCommand: Mock<(command: Direction) => void>
```

**What to Mock:**
- Tauri IPC (`@tauri-apps/api/core` → `invoke`, `@tauri-apps/api/event` → `listen`)
- Web Bluetooth (`navigator.bluetooth`)
- Custom hooks at the component-test level (`./hooks/use-bluetooth`, `./hooks/use-gamepad` mocked in `App.test.tsx`)
- Global discovery flags (`window.__TAURI_INTERNALS__`)

**What NOT to Mock:**
- React state, refs, effects — render the real component and assert on observable behavior
- Pure utility functions (e.g. `get_direction_from_axes` in Rust is tested directly with values)
- The component under test itself

## Async Testing

**`act()` wrapping for state-changing operations:**
```ts
// apps/frontend/src/hooks/use-bluetooth.test.ts:74-83
it("connect() sets connected after GATT chain resolves", async () => {
  const { result } = renderHook(() => useBluetooth())

  await act(async () => {
    await result.current.connect()
  })

  expect(result.current.connected).toBe(true)
  expect(result.current.connecting).toBe(false)
})
```

**Awaiting pending effects in `renderHook`:**
```ts
// apps/frontend/src/hooks/use-gamepad.test.ts:43-44
const { result } = renderHook(() => useGamepad())
await act(async () => {})    // Flush pending useEffect promises
```

The empty `act(async () => {})` lets pending async setup inside `useEffect` resolve before assertions run.

**Manually-controlled promise resolution:**
```ts
// apps/frontend/src/hooks/use-bluetooth.test.ts:191-215
it("connect() sets connecting state before invoke resolves", async () => {
  let resolveInvoke: () => void = () => {}
  mockTauriInvoke.mockImplementation(
    () =>
      new Promise<void>((r) => {
        resolveInvoke = r
      }),
  )
  const { result } = renderHook(() => useBluetooth())

  let promise: Promise<void>
  act(() => {
    promise = result.current.connect()
  })

  expect(result.current.connecting).toBe(true)   // Mid-flight assertion
  expect(result.current.connected).toBe(false)

  await act(async () => {
    resolveInvoke()
    await promise!
  })

  expect(result.current.connected).toBe(true)
})
```

**Firing captured event handlers synchronously inside `act`:**
```ts
// apps/frontend/src/hooks/use-bluetooth.test.ts:272-288
it("updates state when ble-state-changed event fires", () => {
  const { result } = renderHook(() => useBluetooth())

  act(() => {
    capturedBleHandler.current?.({ payload: "connecting" })
  })
  expect(result.current.connecting).toBe(true)

  act(() => {
    capturedBleHandler.current?.({ payload: "connected" })
  })
  expect(result.current.connected).toBe(true)
})
```

## Error Testing

```ts
// apps/frontend/src/hooks/use-bluetooth.test.ts:217-229
it("connect() handles error and sets disconnected + error", async () => {
  mockTauriInvoke.mockRejectedValue(new Error("No Bluetooth adapter found"))
  const { result } = renderHook(() => useBluetooth())

  await act(async () => {
    await result.current.connect()
  })

  expect(mockTauriInvoke).toHaveBeenCalledWith("ble_connect")
  expect(result.current.connected).toBe(false)
  expect(result.current.connecting).toBe(false)
  expect(result.current.error).toBe("No Bluetooth adapter found")
})
```

- Use `mockRejectedValue(new Error("..."))` for thrown failures
- Assert on both the cleared state and the user-facing error string
- For non-Error rejections, assert that the hook stringifies via `String(e)` (covered by the `instanceof Error` narrowing in source)

## Query & Selection Patterns

**Selectors used (in order of preference):**
1. `screen.getByText(/regex/)` — visible text content (`App.test.tsx:43`)
2. `container.querySelectorAll("button")` — count assertions when accessible roles aren't expressive enough
3. `container.querySelector('button[style*="1 / 2"]')` — fall back to attribute selectors when the only differentiator is layout (e.g. CSS grid position) — see `control-pad.test.tsx:34`
4. `container.firstElementChild?.firstElementChild` — chained DOM walk for tightly-coupled markup (e.g. status pills) — see `status-bar.test.tsx:18`
5. `screen.getAllByText(...)` when multiple matches are expected

**Accessibility note:** Buttons have `aria-label` (`apps/frontend/src/components/control-pad.tsx:22`), but tests currently rely on grid-area attribute selectors. Future tests should prefer `screen.getByRole("button", { name: /forward/i })` for resilience.

**Use `act` around state-driving DOM events:**
```ts
// apps/frontend/src/App.test.tsx:100-106
act(() => {
  mockUseGamepad.mockReturnValue({
    direction: "F" as const,
    gamepadConnected: true,
  })
})
rerender(<App />)
```

## Setup Files

**`apps/frontend/src/setupTests.ts`:**
```ts
import "@testing-library/jest-dom/vitest"
```

Single-line setup that registers DOM-aware matchers (`toBeInTheDocument`, `toBeDisabled`, `toBeVisible`, etc.). Referenced from `vitest.config.ts` via `setupFiles: ["./src/setupTests.ts"]`.

## Rust Test Patterns

**Pure function unit tests:**
```rust
// apps/frontend/src-tauri/src/gamepad/mod.rs:227-233
#[test]
fn test_deadzone_returns_stop() {
    assert_eq!(get_direction_from_axes(0.0, 0.0), Direction::S);
    assert_eq!(get_direction_from_axes(0.1, 0.1), Direction::S);
    assert_eq!(get_direction_from_axes(-0.14, 0.14), Direction::S);
}
```

Direct invocation, multiple `assert_eq!` per test grouped by equivalence class.

**Structural/contract tests via file content scanning:**

The Rust integration tests in `apps/frontend/src-tauri/tests/*.rs` use a **content-scanning pattern** instead of compiling and running the live `tauri::command` functions. They read source files with `fs::read_to_string("src/ble/mod.rs")` and `assert!(content.contains("..."))` for required substrings. This is **deliberate** — annotated `// Per D-07: Pragmatic pass model — structural verification sufficient for CI` in `validation_test.rs:5`.

```rust
// apps/frontend/src-tauri/tests/ble_connect_test.rs:24-33
#[test]
fn test_ble_connect_returns_result_string() {
    let content = fs::read_to_string("src/ble/mod.rs").expect("Should be able to read mod.rs");
    assert!(
        content.contains("-> Result<(), String>"),
        "ble_connect should return Result<(), String>"
    );
}
```

**Why this approach:** real BLE/gamepad behavior requires hardware, and Tauri command bodies own platform-coupled state. Structural tests verify contract requirements (event names, payload shapes, function signatures, decision-record adherence) without spinning up Tauri or hardware. They run fast and stay green in CI.

**Patterns inside content-scan tests:**
- Read source via relative path from `src-tauri/` working directory: `fs::read_to_string("src/ble/mod.rs")`
- Cross-reference frontend from Rust tests using `../../../`: `fs::read_to_string("../../../apps/frontend/src/hooks/use-bluetooth.ts")` (`validation_test.rs:183`)
- Parse JSON config files: `serde_json::from_str(&content)` for `tauri.conf.json` (`tauri_shell_test.rs:68`)
- Count occurrences for duplicate checks: `content.matches("\"disconnected\"").count()` (`ble_disconnect_test.rs:62`)
- Forbidden-content checks: `assert!(!content.contains("--filesystem=home"))` (`flatpak_sandbox_test.rs:230`)

## Cross-Cutting Structural Tests

A meaningful fraction of TypeScript tests do not exercise runtime behavior — they assert structural facts about the repo:

- **`ci-workflow.test.ts`** — asserts `.github/workflows/build.yml` contains required steps (flatpak-builder, sha256sum, no AppImage refs, single `build` job, etc.)
- **`docs.test.ts`** — asserts documentation files exist, have minimum line counts, and contain mandated cross-references
- **`deployment.test.ts`** — asserts `upgrade-robot-controller.sh` is executable, has expected flags, and `justfile` has the flatpak group
- **`verification-docs.test.ts`** — asserts phase `VERIFICATION.md` files use concrete commands (not hand-wavy language)
- **`tauri-frontend.test.ts`** — asserts `package.json` and `vite.config.ts` have required Tauri integration fields

These guard requirements from the `.planning/` milestone docs at CI time. When adding a similar requirement, write a matching structural test rather than relying on documentation alone.

## Fixtures and Factories

No dedicated fixture or factory modules. Test data is inlined:
- Direction strings (`"F"`, `"B"`, `"L"`, `"R"`, `"S"`) used directly per test
- Event payloads constructed inline: `{ payload: "connected" }`, `{ direction: "F" }`, `{ name: "Steam Deck Controller" }`
- Mock Bluetooth devices built inline in `beforeEach`

If you need shared fixtures across tests, prefer a co-located `fixtures.ts` next to the tests that consume it. Do not create a global `__fixtures__` directory.

## Coverage

**Requirements:**
- No coverage threshold enforced in `vitest.config.ts` or CI.
- Coverage tooling (`@vitest/coverage-v8`) is **not** currently installed.
- To add coverage: `pnpm --filter @ks0555/frontend add -D @vitest/coverage-v8`, then run `vitest run --coverage`.

**Pragmatic targets:**
- Custom hooks: full coverage of state transitions and error paths (current pattern)
- Components: smoke + interaction tests covering all branches of conditional rendering
- Pure utilities: exhaustive equivalence-class coverage (see `get_direction_from_axes` tests for the model)
- Tauri command bodies: structural coverage only — real I/O is not testable in CI

## Test Types

**Unit Tests:**
- Frontend hooks (`useBluetooth`, `useGamepad`) — render with `renderHook`, mock Tauri APIs, drive state via captured event handlers
- Frontend components (`ControlPad`, `StatusBar`, `App`) — render with `@testing-library/react`, assert on DOM
- Rust pure functions (`get_direction_from_axes`) — direct call + `assert_eq!`

**Integration Tests:**
- Rust integration tests in `apps/frontend/src-tauri/tests/` verify contract between BLE/gamepad source, frontend hooks, Flatpak manifest, and `tauri.conf.json`
- Cross-cutting TypeScript tests verify CI YAML, docs, and deployment scripts

**E2E Tests:**
- Not implemented. Hardware-dependent paths (real BT24 robot, real Steam Deck gamepad) are documented as manual verification only (per `D-07` pragmatic pass model).
- Playwright/Cypress: not configured. If added, place under `apps/frontend/e2e/`.

## Anti-Patterns to Avoid

- **Do not** mock the symbol under test — only mock its dependencies.
- **Do not** mock React's primitives (`useState`, `useEffect`). Render real components and drive state via props/events.
- **Do not** assert on internal implementation details (CSS class names) unless they're load-bearing for the test's intent. Prefer text, ARIA roles, or accessible labels.
- **Do not** introduce hand-wavy assertions like "should work" or "should look correct". Tests must be deterministic and binary.
- **Do not** add coverage requirements without first establishing a baseline — premature thresholds block legitimate refactors.
- **Do not** convert structural content-scan Rust tests into hardware tests without an ADR — they're intentional per `D-07`.

## Test File Inventory

**Frontend (`apps/frontend/src/`):**
| File | Lines | What it covers |
|------|-------|----------------|
| `App.test.tsx` | 123 | App composition, gamepad → BLE send wiring (FRONT-07) |
| `components/control-pad.test.tsx` | 101 | All 5 direction buttons + disabled state |
| `components/status-bar.test.tsx` | 75 | BLE/gamepad connection pills, connecting state |
| `hooks/use-bluetooth.test.ts` | 300 | Web Bluetooth path + Tauri IPC path |
| `hooks/use-gamepad.test.ts` | 115 | Tauri event listener, connect/disconnect cleanup |
| `tauri-frontend.test.ts` | 54 | `package.json` + `vite.config.ts` integration contract |
| `ci-workflow.test.ts` | 161 | `.github/workflows/build.yml` structure |
| `docs.test.ts` | 252 | `README.md`, `docs/*.md`, `flatpak/README.md` contracts |
| `deployment.test.ts` | 152 | `upgrade-robot-controller.sh`, justfile flatpak group |
| `verification-docs.test.ts` | 209 | Phase `VERIFICATION.md` quality gate |

**Backend (`apps/frontend/src-tauri/`):**
| File | Lines | What it covers |
|------|-------|----------------|
| `src/gamepad/mod.rs` (inline) | 8 tests | `get_direction_from_axes` deadzone + direction logic |
| `tests/ble_connect_test.rs` | 109 | BLE-01: `ble_connect` structure, scan, timeout |
| `tests/ble_disconnect_test.rs` | 88 | BLE-02: `ble_disconnect` structure |
| `tests/ble_send_test.rs` | 129 | BLE-03: `ble_send` validation, WriteType::WithoutResponse |
| `tests/ble_event_test.rs` | 78 | BLE-05: disconnect event listener |
| `tests/ble_state_test.rs` | 89 | BLE-04: `BleState` Arc/Mutex contract |
| `tests/ble_linux_filter_test.rs` | 128 | BLE-06: Linux/BlueZ post-filter logic |
| `tests/flatpak_sandbox_test.rs` | 278 | SBX-01..06: Flatpak finish-args, anti-features |
| `tests/tauri_shell_test.rs` | 182 | TAUR-01..05: Cargo deps, tauri.conf.json |
| `tests/validation_test.rs` | 270 | VAL-02..03: cross-stack event contract |

---

*Testing analysis: 2026-05-14*

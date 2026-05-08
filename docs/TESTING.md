<!-- generated-by: gsd-doc-writer -->

# Testing

This document covers automated testing infrastructure and manual test procedures for the Steam Deck Robot Controller.

## Test Framework and Setup

### Frontend (React/TypeScript)

The frontend uses **Vitest 4.1.4** for unit and component tests, configured in `apps/frontend/vitest.config.ts`. The test environment is jsdom (browser-like DOM simulation).

**Required setup:**

- `pnpm install` must be run once to install devDependencies (@testing-library/react, @testing-library/jest-dom, jsdom)

### Backend (Rust)

The Rust backend has **integration tests** in `apps/frontend/src-tauri/tests/` but no unit test framework configured. Tests are cargo integration tests (a Rust standard library feature). A few `#[test]` marked functions exist for isolated checks, but most hardware-dependent code (BLE peripheral, gamepad event loop) is tested manually.

**Key test files:**

- `tauri_shell_test.rs` — Verifies Cargo.toml and tauri.conf.json configuration
- `ble_*.rs` (6 files) — Integration tests for BLE state machine, connect, disconnect, send, event handling, and Linux peripheral filter
- `validation_test.rs` — Combined validation of configuration and dependencies

### E2E Testing

No automated end-to-end suite exists. The frontend depends on `@vitest/browser-playwright` for Vitest's optional browser-mode tests, but a dedicated Playwright E2E harness has not been wired up. End-to-end flows (BLE pairing → robot motion) are validated manually — see the manual test plan below.

## Running Tests

### Frontend Tests

Run the Vitest test suite:

```bash
pnpm test
```

This command runs from the workspace root and executes all tests in `apps/frontend/src/**/*.test.ts*`.

To run tests in watch mode (re-run on file changes):

```bash
pnpm --filter @ks0555/frontend vitest
```

To run a single test file:

```bash
pnpm --filter @ks0555/frontend vitest src/App.test.tsx
```

### Backend (Rust) Tests

Run Rust integration tests:

```bash
cd apps/frontend/src-tauri
cargo test
```

This compiles and runs all tests in the `tests/` directory and any `#[test]` functions in the library code.

Run a specific test file:

```bash
cargo test --test tauri_shell_test
```

Run with verbose output (shows println! and eprintln! from tests):

```bash
cargo test -- --nocapture
```

## Writing New Tests

### Frontend Tests

**File naming convention:** `*.test.ts` or `*.test.tsx` (colocated with the component/hook being tested)

**Test location examples:**

- Hook tests: `src/hooks/use-bluetooth.test.ts`
- Component tests: `src/components/control-pad.test.tsx`
- Module tests: `src/App.test.tsx`

**Test setup:**

- Use `describe()` and `it()` from vitest
- Mock Tauri IPC with `vi.mock("@tauri-apps/api/...")` (see `use-bluetooth.test.ts` for patterns)
- Use React Testing Library's `render()`, `renderHook()`, and `screen` for DOM testing
- Import testing utilities at the top: `import { describe, it, expect, vi } from "vitest"`

**Example pattern:**

```typescript
import { describe, it, expect, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"

describe("useMyHook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("does something expected", () => {
    const { result } = renderHook(() => useMyHook())
    expect(result.current.something).toBe(true)
  })
})
```

### Backend (Rust) Tests

**File naming convention:** `*.rs` in `apps/frontend/src-tauri/tests/` directory

**Integration test structure:**

```rust
#[test]
fn test_my_feature() {
    // Arrange
    let some_value = setup();

    // Act
    let result = some_function(some_value);

    // Assert
    assert_eq!(result, expected_value);
}
```

**Unit tests (in-library tests):** Add `#[cfg(test)]` modules alongside implementation code for small, isolated checks. Most hardware-dependent logic (BLE, gamepad) cannot be unit tested in isolation and requires integration testing or manual testing.

## Coverage Requirements

No automated code coverage thresholds are configured. Coverage measurement is not enforced in CI.

**Current coverage status:** Limited. Automated tests cover:

- React component rendering and interaction (App, ControlPad, StatusBar)
- React hooks (useBluetooth, useGamepad) with mocked Tauri IPC
- Tauri shell configuration validation
- BLE state machine (basic integration tests)
- Gamepad event handling (basic integration tests)

Hardware-dependent code paths (actual BLE peripheral writes, gamepad input from real devices) are not covered by automated tests and require manual testing on target devices.

## CI Integration

The `.github/workflows/build.yml` file does **not** run tests as part of the CI pipeline. Tests must be run locally before pushing to a PR.

**Recommended pre-commit workflow:**

```bash
pnpm typecheck    # TypeScript type checking
pnpm lint          # ESLint
pnpm test          # Frontend unit tests
cd apps/frontend/src-tauri && cargo test  # Rust integration tests
```

## Manual Testing Plan

Automated tests do not cover hardware interaction (BLE pairing, real gamepad input, Arduino robot commands). Manual testing is required for end-to-end validation.

### Steam Deck BLE Testing

**Prerequisites:**

- Steam Deck in developer mode
- DX-BT24 module in pairing mode (LED flashing)
- Arduino sketch running on the robot

**Procedure:**

1. Launch the app from the desktop or Steam Library
2. Observe "Scanning..." state in the UI
3. Verify BLE scan discovers the DX-BT24 device
4. Click the connect button in the UI
5. Confirm pairing dialog appears (if first connection)
6. Observe "Connected" state in the UI
7. Test gamepad direction input:
   - Press left stick Forward — verify "F" command sent and robot moves forward
   - Press left stick Backward — verify "B" command sent and robot moves backward
   - Press left stick Left — verify "L" command sent and robot turns left
   - Press left stick Right — verify "R" command sent and robot turns right
   - Release stick to center — verify "S" (stop) command sent and robot stops
8. Observe gamepad dead-zone (0.15) — verify small stick movements do not trigger commands
9. Disconnect in the UI — verify BLE link closes cleanly

### macOS BLE Testing (Development)

**Prerequisites:**

- Mac with Bluetooth enabled
- Arduino robot with DX-BT24 module in pairing mode

**Procedure:**

1. Run `pnpm dev` from the project root
2. Tauri dev window opens and prompts for Bluetooth permission (first run only)
3. Grant the permission in System Preferences > Security & Privacy > Bluetooth
4. Follow the same connection and gamepad test steps as Steam Deck (above)
5. Verify CoreBluetooth integration (macOS-specific code path tested)

### Gamepad Input Testing

**Prerequisites:**

- Steam Deck controller or USB controller connected
- App running (either Tauri dev or built binary)

**Procedure:**

1. Verify gamepad detection in "Gamepad Status" section
2. Move left stick in all four cardinal directions
3. Verify direction changes displayed in "Current direction" field
4. Verify direction changes only emit when crossing the dead-zone threshold (0.15)
5. Verify small stick movements within dead-zone do not trigger commands
6. Verify direction change coalescing — moving the stick rapidly in different directions sends only the final direction command

### End-to-End Robot Control

**Prerequisites:**

- Arduino robot with DX-BT24 BLE module and sketch installed
- Robot powered on
- Steam Deck or Mac running the app

**Procedure:**

1. Establish BLE connection (see Steam Deck or macOS BLE testing above)
2. Verify gamepad is detected and connected
3. Move the left stick forward — robot should move forward
4. Move the left stick backward — robot should move backward
5. Move the left stick left — robot should turn left
6. Move the left stick right — robot should turn right
7. Move the left stick to center — robot should stop
8. Test rapid direction changes — verify no lag or doubled commands
9. Test partial stick movements near dead-zone boundary — verify commands only send on intentional direction change
10. Disconnect and reconnect — verify clean state and ability to reconnect

### Regression Testing Checklist

After changes to BLE, gamepad, or UI code, run this checklist on both Steam Deck (or Linux desktop) and macOS:

- [ ] App launches without errors
- [ ] Gamepad detection works (connected state updates)
- [ ] BLE scan finds available devices
- [ ] BLE connect/disconnect succeeds without crashes
- [ ] Direction changes trigger commands only once per change
- [ ] Dead-zone filtering prevents spurious commands
- [ ] No commands sent on startup or reconnect (only on direction change)
- [ ] UI reflects current state accurately (connected, disconnected, direction, gamepad connected)
- [ ] Console logs show expected state transitions (no spam)

## Debugging Tests

### Frontend Tests

Run Vitest in watch mode and inspect failures:

```bash
pnpm --filter @ks0555/frontend vitest --watch
```

Use `vi.mock()` to isolate the code under test and verify mock call counts with `expect(mockFn).toHaveBeenCalledTimes(n)`.

For React component issues, inspect the DOM with `screen.debug()` in your test:

```typescript
it("example", () => {
  render(<App />)
  screen.debug() // prints the entire DOM tree
})
```

### Backend (Rust) Tests

Run with backtrace for panic diagnostics:

```bash
RUST_BACKTRACE=1 cargo test -- --nocapture
```

Use `eprintln!()` or `println!()` in test code to output debug information (visible with `-- --nocapture`).

## Next Steps

- See [GETTING-STARTED.md](./GETTING-STARTED.md) for first-run instructions
- See [DEVELOPMENT.md](./DEVELOPMENT.md) for local development setup and build commands
- See [CONFIGURATION.md](./CONFIGURATION.md) for environment variable and config details

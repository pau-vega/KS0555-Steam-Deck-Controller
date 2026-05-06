# Phase 10 Research: Build and Test on SteamOS

**Researched:** 2026-05-06

---

## 1. tauri-action v2

### Source
GitHub: `tauri-apps/tauri-action` (dev branch, v0.6.2 latest)

### Key Architecture
- tauri-action is a Node.js GitHub Action (node24 runtime)
- It wraps `tauri build` and optionally uploads to GitHub Releases
- **Build-only mode:** Omit `tagName`, `releaseName`, `releaseId` inputs — the action builds but does not upload anywhere
- **Artifact upload:** Set `uploadWorkflowArtifacts: true` to make AppImage available as a downloadable workflow artifact (no release needed)

### Relevant Inputs

| Input | Value for Phase 10 | Purpose |
|-------|-------------------|---------|
| `projectPath` | `apps/frontend/src-tauri` | Points to Tauri project inside monorepo |
| `args` | (empty for Linux x86_64) | Extra `tauri build` args |
| `uploadWorkflowArtifacts` | `true` | Store AppImage as build artifact (for manual download) |
| `tauriScript` | (not set — uses pnpm) | Custom CLI path if needed |

### System Dependencies (Ubuntu)
Standard `apt` packages required for Tauri on Linux:
```
libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
```
These can be installed manually before tauri-action, or tauri-action may auto-install them depending on version. Per D-15: let tauri-action handle deps.

### Usage Pattern (build-only)
Per official `examples/test-build-only.yml`:
```yaml
- uses: tauri-apps/tauri-action@v1
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    args: ${{ matrix.args }}
```
For our monorepo, add `projectPath: apps/frontend/src-tauri`.

### Tauri Build Constraints
- `tauri build` requires `beforeBuildCommand` to have already run (i.e., frontend must be built first via `pnpm build`)
- Our `ci.yml` already runs `pnpm turbo build` which handles frontend build
- For the CI build workflow, we should run `pnpm install` and `pnpm build` before tauri-action
- On CI, `tauri.conf.json`'s `beforeBuildCommand: "pnpm build"` will run inside tauri-action context

---

## 2. Tauri v2 Icon & Bundle Configuration

### Current State
- `apps/frontend/src-tauri/tauri.conf.json` has `bundle: { active: true, targets: ["appimage"] }` — no icon config
- `apps/frontend/src-tauri/icons/icon.png` exists at 32x32 (placeholder from Phase 6)

### Tauri v2 Icon Convention
- Tauri v2 **auto-discovers** icons in `src-tauri/icons/` directory
- No explicit `bundle.icon` array needed if PNG files are in the right location
- Auto-generation: `tauri build` generates platform-specific icon formats from source PNGs
- Desktop file: Tauri v2 generates `.desktop` file from `productName` + `identifier` in config

### Explicit Config Pattern
If explicit icon path is preferred:
```json5
{
  bundle: {
    active: true,
    targets: ["appimage"],
    icon: ["icons/icon.png"]
  },
}
```

### Required Changes (per D-12)
1. Replace `icons/icon.png` (32x32) with a 256x256 PNG
2. Optionally add explicit `bundle.icon` to tauri.conf.json for clarity
3. Tauri generates `productName.desktop` metadata automatically — no manual desktop file needed

### SteamOS Read-Only Filesystem (D-11)
- AppImage runs from `~/` — no root needed
- No SteamOS dev mode required (D-13)
- Bluetooth: btleplug needs DBus access and bluez daemon running — these are standard on SteamOS Gaming Mode since bluez is a core dependency

---

## 3. Existing Codebase Test Patterns

### Phase 7 Integration Tests (Structural Pattern)
Existing tests in `apps/frontend/src-tauri/tests/` use a **structural verification pattern**:
- Read source files with `std::fs::read_to_string()`
- Assert string presence: function names, type signatures, constants
- Do NOT compile or run actual btleplug/gilrs code
- Example: `test_ble_connect_function_exists` asserts `"pub async fn ble_connect"` in source

This pattern works because:
- btleplug/gilrs require real Bluetooth hardware / gamepad to function
- Structural tests validate code correctness at source level
- `cargo test` runs them as part of the regular test suite
- They are deterministic (no hardware dependency)

### Gamepad Pure Function
`get_direction_from_axes(x: f32, y: f32) -> Direction` in `gamepad/mod.rs` is a pure function — it can be unit tested with real I/O assertions:
- (0.0, 0.0) → S
- (-0.5, -1.0) → F (abs_y > abs_x, y < 0)
- (0.5, 1.0) → B (abs_y > abs_x, y > 0)
- (-1.0, -0.2) → L (abs_x > abs_y, x < 0)
- (1.0, -0.2) → R (abs_x > abs_y, x > 0)
- (0.1, 0.1) → S (below deadzone)

### btleplug Mocking Challenge
- btleplug platform types (`Peripheral`, `Manager`, `Adapter`) are concrete types from the platform-specific module
- No trait abstraction exists in the current codebase to swap implementations for testing
- Two approaches for VAL-02/VAL-03:

**Approach A: Trait-based (high effort)**
- Extract `BleAdapter` trait from ble/mod.rs
- Implement for real btleplug, mock for tests
- Requires significant refactoring of Phase 7 code
- More robust but exceeds phase scope

**Approach B: Structural tests (pragmatic, per D-07)**
- Follow existing pattern from Phase 7 tests
- Read source files, verify:
  - Tauri command functions exist with correct signatures
  - Event names match frontend expectations (gamepad-direction, ble-state-changed, etc.)
  - App.tsx unchanged (git diff check)
- Lower effort, matches D-07 pragmatic pass model

**Approach C: Inline `#[cfg(test)]` unit tests**
- Add test modules inside `ble/mod.rs` and `gamepad/mod.rs`
- Test pure functions (`get_direction_from_axes`) with real I/O
- For event pipeline: test event payload construction by calling internal functions
- Works best combined with Approach B for full coverage

---

## 4. CI Workflow Design

### Existing CI
`.github/workflows/ci.yml` runs on push/PR to main:
- Checkout + pnpm setup + node setup
- `pnpm install --frozen-lockfile`
- `pnpm turbo build lint typecheck test`
- `pnpm format:check`

### New Build Workflow (per D-02, D-14)
Trigger: tag push (`v*`) + `workflow_dispatch`

```yaml
name: 'Build Tauri AppImage'

on:
  push:
    tags: ['v*']
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v5
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - uses: dtolnay/rust-toolchain@stable
      - name: install system deps
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - uses: tauri-apps/tauri-action@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          projectPath: apps/frontend/src-tauri
          uploadWorkflowArtifacts: true
```

Key design choices:
- Uses `@v1` tag for tauri-action (stable release channel, not dev branch)
- Excludes `tagName`/`releaseName` → build-only mode
- `uploadWorkflowArtifacts: true` makes AppImage downloadable from CI
- Runs frontend build first so `tauri build` doesn't need to do it
- `pnpm build` via turbo already handles `@ks0555/frontend` build

---

## 5. Verification Strategy (per D-08, D-09, D-10)

### CI-Enforced Checks
1. **VAL-01:** tauri-action producing AppImage means `tauri build` succeeded
2. **VAL-02:** Rust integration tests validate event pipeline (Approach B + C)
3. **VAL-03:** Same test suite covers BLE event flow
4. **VAL-04:** `git diff --exit-code -- apps/frontend/src/app.tsx` in CI

### Hardware Test Procedure (non-blocking, per D-10)
Documented in verification section:
1. Download AppImage from CI artifacts
2. Copy to Steam Deck (scp or USB)
3. `chmod +x && ./RobotController_*.AppImage`
4. Verify UI loads (fullscreen window, connection status visible)
5. Connect BT24 robot — verify "connected" status
6. Send F/B/L/R commands — verify robot moves
7. Disconnect robot — verify "disconnected" status
8. Press Steam Deck gamepad buttons — verify direction indicator changes
9. Disconnect gamepad — verify "disconnected" status

---

## Key Decisions from Research

| Topic | Finding | Plan Impact |
|-------|---------|-------------|
| tauri-action version | Use `@v1` tag (stable), NOT dev branch | Plan 1 |
| Build mode | Build-only + workflow artifacts (no release) | Plan 1 |
| Icon | Replace 32x32 with 256x256 PNG in `icons/` dir | Plan 1 |
| Desktop metadata | Tauri auto-generates from config — no manual file | Plan 1 |
| Test pattern | Approach B (structural) + C (unit tests) combined | Plan 2 |
| Gamepad unit tests | `get_direction_from_axes` pure function — easy to test | Plan 2 |
| CI dep management | Manual apt-get install (explicit, not relying on tauri-action auto-install) | Plan 1 |
| app.tsx check | `git diff --exit-code` in CI | Plan 2 |
| Hardware test | Document inline, non-blocking | Plan 2 |

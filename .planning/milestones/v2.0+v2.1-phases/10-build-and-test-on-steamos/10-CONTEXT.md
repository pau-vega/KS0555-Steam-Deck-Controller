# Phase 10: Build and Test on SteamOS - Context

**Gathered:** 2026-05-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Produce a Tauri AppImage binary for Linux and validate the full stack (Rust gilrs + btleplug → Tauri event → React hooks) runs correctly on SteamOS. No new feature code — all implementation is complete in Phases 6-9. This phase covers build tooling, CI pipeline, validation tests, and manual hardware test procedure.

</domain>

<decisions>
## Implementation Decisions

### Build Approach
- **D-01:** Use Docker cross-compile via `tauri-apps/tauri-action` GitHub Action to produce the Linux AppImage from CI. No native macOS build for SteamOS.
- **D-02:** Build trigger: on tag push (`v*`) AND manual `workflow_dispatch`. Not on every push to main.
- **D-03:** Do NOT cross-compile from macOS directly. All Linux builds happen in CI's Linux environment.

### CI Validation Tests
- **D-04:** Write Rust `#[cfg(test)]` integration tests that mock btleplug/gilrs adapters and verify Tauri commands emit correct events (gamepad-direction, ble-state-changed, gamepad-connected/disconnected). Validates VAL-02 and VAL-03 event pipeline structurally.
- **D-05:** VAL-01 pass criteria: `tauri build` succeeds producing AppImage output. CI verifies build success.
- **D-06:** VAL-04 pass criteria: `git diff -- apps/frontend/src/app.tsx` shows no changes. CI verifies app.tsx is untouched.
- **D-07:** Pragmatic pass model — CI validates build, mocked event flow, and app.tsx integrity. Hardware-dependent paths (real BLE, real gamepad) are documented but not CI-enforced.

### Hardware Validation
- **D-08:** Document manual hardware test procedure inline in the plan's verification section (not a separate file).
- **D-09:** Hardware procedure covers: AppImage launch on Steam Deck, BLE connect/send with BT24 robot, gamepad direction detection with Steam Deck built-in controller, and unexpected disconnect behavior.
- **D-10:** Phase completion does NOT require hardware signoff — CI validation is sufficient. Hardware procedure serves as a manual verification guide for actual Steam Deck use.

### SteamOS-Specific Setup
- **D-11:** Focus on read-only filesystem concerns (AppImage runs from `~/`, no root needed) and Bluetooth permissions (bluez daemon running, DBus access for btleplug).
- **D-12:** Add a proper application icon (256x256 PNG) and desktop file metadata to the Tauri bundle config, replacing the Phase 6 placeholder icon.
- **D-13:** No SteamOS dev mode or pacman package installation required — AppImage is self-contained.

### CI Pipeline Setup
- **D-14:** Create `.github/workflows/build.yml` with `tauri-apps/tauri-action`. Workflow builds AppImage on Linux runner, uploads as build artifact.
- **D-15:** GitHub Actions runner handles all Linux system dependencies (libwebkit2gtk, libappindicator, etc.) via tauri-action's built-in dependency installation.

### the agent's Discretion
- Rust integration test structure: use `#[cfg(test)]` module inside existing Rust source files or a separate `tests/` dir. Agent chooses cleanest approach.
- AppImage icon: agent sources or generates a 256x256 PNG. A simple robot/controller icon is appropriate.
- Test mock detail level: agent decides how deep to mock btleplug Peripheral/gilrs Gamepad internals vs event emission verification only.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Phase Goal
- `.planning/REQUIREMENTS.md` — VAL-01 through VAL-04 (Validation requirements)
- `.planning/ROADMAP.md` § Phase 10 — Goal: "Full stack validated on target platform with production build", success criteria, dependencies (Phase 9)
- `.planning/PROJECT.md` § Constraints — AppImage target, Linux/SteamOS only, monorepo preserved, no new UI components

### Build Configuration
- `apps/frontend/src-tauri/tauri.conf.json` — Build config: `"targets": ["appimage"]`, fullscreen window, CSP settings. Plan must update bundle icons and metadata.
- `apps/frontend/src-tauri/Cargo.toml` — Rust deps: btleplug 0.12.0, gilrs 0.11.1, tokio, serde. No changes expected.
- `apps/frontend/package.json` — Tauri scripts: `"tauri": "tauri"`, `"tauri:build": "tauri build"`.

### Prior Phase Decisions (locked contracts)
- `.planning/phases/07-ble-commands-with-btleplug/07-CONTEXT.md` — BLE IPC contract: invoke names, event names, Result<(), String> error propagation, 5s timeout, auto-reconnect
- `.planning/phases/08-gamepad-monitoring-with-gilrs/08-CONTEXT.md` — Gamepad event contract: payload shapes `{ direction: 'F' }`, `{ name: '...' }`, deadzone 0.15, direction change guard
- `.planning/phases/09-hook-rewrites/09-CONTEXT.md` — Hook IPC: useBluetooth and useGamepad rewritten to Tauri invoke/listen, all 43 tests pass, app.tsx unchanged

### Existing Code (read-only — do not modify unless this phase requires it)
- `apps/frontend/src-tauri/src/main.rs` — Tauri setup with BLE and gamepad modules
- `apps/frontend/src-tauri/src/ble/mod.rs` — BLE command implementations and event emission
- `apps/frontend/src-tauri/src/gamepad/mod.rs` — Gamepad gilrs thread and event emission

### Code That Must Not Change
- `apps/frontend/src/app.tsx` — VAL-04: must remain unchanged (verified by git diff)
- `apps/frontend/src/components/control-pad.tsx` — Must be unchanged
- `apps/frontend/src/components/status-bar.tsx` — Must be unchanged

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/frontend/src-tauri/tauri.conf.json` — Already configured with `"targets": ["appimage"]` and `"active": true`. Needs icon/metadata entries added.
- `.github/workflows/` — Currently empty. This phase will create `build.yml`.
- Existing frontend test suite (43 tests passing) — Provides the test infrastructure for VAL-04 verification.

### Established Patterns
- Tauri v2 `tauri build` produces platform-appropriate bundle (`.deb`/`.AppImage` on Linux). Bundle config in `tauri.conf.json` under `"bundle"`.
- Rust modules in `src-tauri/src/` use `#[cfg(test)]` for inline tests and separate `tests/` for integration tests.
- CI-free project — no existing GitHub Actions workflows. This phase creates the first one.

### Integration Points
- `tauri.conf.json` bundle section — Add icon path and desktop file metadata for AppImage.
- `apps/frontend/src-tauri/build.rs` (if exists) or icon placement — Tauri v2 expects icons in `src-tauri/icons/` by convention.
- GitHub Actions Linux runner — Provides Ubuntu environment for tauri-action's cross-compile deps.

</code_context>

<specifics>
## Specific Ideas

- tauri-action: `tauri-apps/tauri-action@v2` handles Linux system dep installation and produces AppImage. Use with `strategy: { matrix: { platform: [ubuntu-latest] } }` — single platform since SteamOS is the only target.
- AppImage icon: Place a 256x256 PNG in `src-tauri/icons/`. Tauri v2 reads from this directory by convention — no explicit config needed if file is present.
- Rust integration tests: Create `src-tauri/tests/validation.rs` with mock btleplug and gilrs adapters. Test functions call Tauri command functions directly (not through IPC).
- VAL-04 git diff check: Add a CI step `git diff --exit-code -- apps/frontend/src/app.tsx` after build to catch accidental modifications.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 10 scope.

</deferred>

---

*Phase: 10-Build and Test on SteamOS*
*Context gathered: 2026-05-06*

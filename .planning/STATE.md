---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: milestone
status: executing
last_updated: "2026-05-06T18:40:00.000Z"
last_activity: 2026-05-07 - Completed quick task 260507-002: Mac dev support + low-friction Steam Deck install
progress:
  total_phases: 5
  completed_phases: 5
  total_plans: 10
  completed_plans: 10
  percent: 100
---

# STATE.md

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-05)

**Core value:** Control a real robot from Steam Deck gamepad input with low latency — commands must reach the robot reliably and quickly.
**Current focus:** Phase 10 Build and Test on SteamOS — In progress
 
## Current Position

Phase: 10
Plan: 2/2
Status: Complete
Last activity: 2026-05-06

## Progress

| Phase | Status | Plans | Progress |
|-------|--------|-------|----------|
| 6. Tauri Shell Setup | Complete | 2/2 | 100% |
| 7. BLE Commands with btleplug | Complete | 3/3 | 100% |
| 8. Gamepad Monitoring with gilrs | Complete | 3/3 | 100% |
| 9. Hook Rewrites | Complete (verified) | 2/2 | 100% |
| 10. Build and Test on SteamOS | Complete | 2/2 | 100% |

## Decisions Made

- D-02: Backend extends @ks0555/tsconfig/tsconfig.node.json
- D-07: Backend ESLint uses packages/eslint-config/src/node.js
- D-10: Frontend extends @ks0555/tsconfig/tsconfig.react.json
- D-12: Frontend ESLint uses packages/eslint-config/src/react.js
- D-13: Use factory functions (createMockGamepad) instead of Partial<T> for complex DOM mock types
- D-14: Use non-null assertions (!) for mock instances guaranteed by beforeEach setup
- D-15: Added @typescript-eslint/parser to react.js ESLint config for TypeScript parsing
- D-16: Set tsconfigRootDir to process.cwd() in node.js ESLint config for correct tsconfig resolution
- D-17: Add ESLint overrides for *.config.ts files to exclude from type-aware linting
- D-18: (Phase 5) Use ESM export default [...] for eslint-config (not CommonJS module.exports)
- D-19: (Phase 5) Use "type": "module" in packages/eslint-config/package.json
- D-20: (Phase 5) Use import type {...} for plugin types, import() for runtime plugin loading
- D-21: (Phase 5) Use tsup to compile .ts → .js + .d.ts (ESM format)
- D-22: (Phase 5) Rename node.js → node.ts, react.js → react.ts in packages/eslint-config/src/
- D-23: (Phase 5) Disable dts in tsup.config.ts (eslint-plugin-perfectionist has no Plugin export)
- D-24: (Phase 5) Add tsconfig.json with relative path to @ks0555/tsconfig (not package reference)
- D-25: (Phase 7) Auto-reconnect with backoff when BT24 disconnects
- D-26: (Phase 7) Use WriteType::WithoutResponse for BLE commands
- D-27: (Phase 7) ble_connect scan timeout: 5 seconds
- D-28: (Phase 7) Tauri commands return Result<(), String> for error propagation
- D-29: (Phase 7) Use [default] section with permissions array in default.toml (Tauri v2 format)
- D-30: (Phase 7) Post-filter BLE scan results by device name 'BT24' on Linux for BLE-06 (Pitfall 2)
- D-31: (Phase 7) Add service UUID verification after connection as optional enhancement
- D-32: (Phase 8) Use std::thread::spawn for gilrs background thread
- D-33: (Phase 8) Clone AppHandle and move into thread (no Arc needed)
- D-34: (Phase 8) Spawn thread in setup() hook, no lifecycle management
- D-35: (Phase 8) gamepad-direction payload: { direction: 'F' } (char only)
- D-36: (Phase 8) gamepad-connected/disconnected payload: { name: '...' } (name only)
- D-37: (Phase 8) No rate limiting — direction change guard + gilrs event-driven sufficient
- D-38: (Phase 8) Ignore emit errors silently, no thread lifecycle management
- D-39: (Phase 8) Pick first gamepad with name containing "Steam", ignore additional
- D-40: (Phase 8) Auto-reconnect on disconnect (wait for new Connected event)
- D-41: (Phase 8) Direction change guard in gilrs thread (store last_direction)
- D-42: (Phase 8) Use Axis::LeftStickX/Y, deadzone 0.15, port getDirectionFromAxes()
- D-43: (Phase 10) Docker cross-compile via tauri-action GitHub Action for Linux AppImage
- D-44: (Phase 10) Build trigger: tag push + manual dispatch only
- D-45: (Phase 10) Rust #[cfg(test)] integration tests mock btleplug/gilrs for VAL-02/VAL-03
- D-46: (Phase 10) Pragmatic pass model — CI validation sufficient, hardware test doc is non-blocking
- D-47: (Phase 10) Focus SteamOS setup on read-only filesystem + Bluetooth permissions
- D-48: (Phase 10) Add custom app icon and desktop metadata (replace Phase 6 placeholder)
- D-49: (Plan 10-01) Use @v4 for checkout/setup-node, dtolnay/rust-toolchain@stable in build workflow
- D-50: (Plan 10-01) Build-only mode for tauri-action — no release creation, artifact upload only
- D-51: (Plan 10-02) Structural Rust tests validate event pipeline via fs::read_to_string assertions — no hardware required

## Accumulated Context

### Phase 6 Notes

- Phase 6 COMPLETE — Tauri v2 shell initialized and Vite configured
- `apps/frontend/src-tauri/` created with Cargo.toml, tauri.conf.json, src/main.rs, build.rs, permissions/default.toml
- Tauri v2.11.0 (plan specified 2.10.1, auto-corrected to latest), tauri-build 2.6.0
- Rust deps: btleplug 0.12.0 (bluez feature removed — doesn't exist), gilrs 0.11.1, tokio with macros + rt-multi-thread
- Frontend package.json: @tauri-apps/cli ^2.10.1, @tauri-apps/api ^2.10.1, tauri scripts added
- Vite config: clearScreen false, strictPort true, port 5173, watch ignore src-tauri/**
- Deviations: bundle format corrected for Tauri 2.11.0, placeholder RGBA icon added for generate_context!()
- `pnpm --filter @ks0555/frontend build` passes ✅
- All 39 tests pass ✅

### Phase 7 Notes

- Phase 7 CONTEXT COMPLETE — Ready for planning
- Decisions captured: Auto-reconnect (D-25), WithoutResponse (D-26), 5s timeout (D-27), Result error propagation (D-28)
- BLE commands: ble_connect, ble_disconnect, ble_send
- BT24 device: service UUID 0000ffe0-..., char UUID 0000ffe1-..., device name "BT24"
- Events: ble-state-changed
- State: Peripheral stored via app.manage()

### Phase 8 Notes

- Phase 8 COMPLETE — Gamepad monitoring module executed ✓
- `apps/frontend/src-tauri/src/gamepad/mod.rs` created with gilrs thread spawn, Steam filter, direction detection
- Connected/Disconnected events emit with `{ name: '...' }` payload
- AxisChanged reads LeftStickX/Y with 0.15 deadzone, emits `{ direction: 'F' }` on direction change
- Direction change guard (`last_direction`) prevents event spam
- `cargo check` passes, all 46 frontend tests pass
- Ready for Phase 9 Hook Rewrites (use-gamepad.ts → listen("gamepad-direction"))

### Phase 9 Notes

- Phase 9 COMPLETE & VERIFIED — Both hooks rewritten to Tauri IPC ✓
- `use-bluetooth.ts`: Uses `invoke("ble_connect")`, `invoke("ble_send")`, and `listen("ble-state-changed")`. No navigator.bluetooth. Unsupported always false. UnlistenFn cleanup via useRef array.
- `use-gamepad.ts`: Uses 3 Tauri listeners (`gamepad-direction`, `gamepad-connected`, `gamepad-disconnected`). Direction imported from types.ts. No requestAnimationFrame, no navigator.getGamepads, no DOM events.
- `@types/web-bluetooth` removed from devDependencies.
- Hook return shapes preserved: `{ connected, connecting, unsupported, connect, send }` and `{ direction, gamepadConnected }`.
- All 43 tests pass (6 test files) ✅
- `pnpm build` passes ✅
- app.tsx, control-pad.tsx, status-bar.tsx unchanged ✅
- UAT: 10/10 tests passed ✅

### Phase 10 Notes

- Phase 10 READY TO PLAN — Context gathered, verified, transitioned
- Build approach: Docker cross-compile via tauri-action (GitHub Actions), not native macOS build
- CI pipeline: `.github/workflows/build.yml` with tag + manual trigger
- Validation: Rust integration tests for event pipeline (mocked), git diff for app.tsx integrity
- Hardware test procedure documented inline in plan (non-blocking)
- SteamOS setup: read-only fs handling, Bluetooth permissions, custom AppImage icon
- Same constraints as prior phases: no app.tsx changes, no new UI components

- Phase 5 COMPLETE — ESLint config converted to TypeScript ESM
- `node.js` → `node.ts`, `react.js` → `react.ts` (ESM export default)
- Added `tsup.config.ts` for ESM build (dist/ output)
- Updated `package.json` with `"type": "module"`, `"main": "dist/node.js"`, `"types": "dist/node.d.ts"`
- Both apps' lint scripts updated to reference `.ts` config files
- `pnpm build`, `pnpm typecheck`, `pnpm lint` all pass with zero errors
- Auto-fixes: installed tsup, @types/node; added tsconfig.json; disabled dts (eslint-plugin-perfectionist has no Plugin export)
- Known issue resolved by quick task 260505-nxp: 15 leftover `.js` files in `apps/frontend/` deleted (all had .ts/.tsx counterparts)

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260505-nhk | fix ts-review findings | 2026-05-05 | 7a6b3a8 | [260505-nhk-fix-ts-review-findings](./quick/260505-nhk-fix-ts-review-findings/) |
| 260505-nxp | delete 15 leftover .js files from TS migration | 2026-05-05 | 9332916 | [260505-nxp-make-sure-there-are-no-js-files-after-th](./quick/260505-nxp-make-sure-there-are-no-js-files-after-th/) |
| 260507-001 | Apply the best practices for steam deck | 2026-05-07 | 731d92ad | [260507-001-steam-deck-best-practices](./quick/260507-001-steam-deck-best-practices/) |
| 260507-002 | Mac dev support + low-friction Steam Deck install | 2026-05-07 | 70fa8961 | [260507-002-mac-dev-and-low-friction-deck-install](./quick/260507-002-mac-dev-and-low-friction-deck-install/) |

## Session Continuity

Last session: 2026-05-06
Stopped at: Phase 10 complete — all plans executed (10-01 CI/build + 10-02 validation tests)
Resume file: None

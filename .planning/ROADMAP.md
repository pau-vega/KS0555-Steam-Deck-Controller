# Roadmap: Steam Deck Robot Controller

This roadmap is append-only across milestones. v2.0 phases (6–10) are complete and frozen. v2.1 phases (11–16) extend it for the Flatpak Packaging milestone.

---

## Milestone v2.0 — Tauri Migration (Complete)

**Goal:** Migrate apps/frontend from browser-based React+Vite to a Tauri v2 desktop app, replacing broken Web Bluetooth and Gamepad APIs with native Rust alternatives.
**Granularity:** Coarse (5 phases)

---

## Phases

- [x] **Phase 6: Tauri Shell Setup** - Initialize Tauri v2 project with Cargo.toml, tauri.conf.json, Vite integration
- [x] **Phase 7: BLE Commands with btleplug** - Implement Rust BLE module for BT24 robot communication via Tauri commands (completed 2026-05-06)
- [x] **Phase 8: Gamepad Monitoring with gilrs** - Background thread polling gilrs and emitting gamepad events
- [x] **Phase 9: Hook Rewrites** - Rewrite use-bluetooth.ts and use-gamepad.ts to use Tauri IPC with stable interfaces (completed 2026-05-06)
- [x] **Phase 10: Build and Test on SteamOS** - Validate full stack on target platform with production AppImage (completed 2026-05-06)
- [x] **Phase 11: Bundle Pipeline Restructure** - Switch tauri.conf.json bundle.targets from appimage to deb; drop custom tauri-cli fork; pick Flatpak runtime
- [x] **Phase 12: Manifest + AppStream + Local Build** - Author Flatpak manifest, AppStream metainfo, build.sh; first local `flatpak run` opens the window
- [x] **Phase 13: Sandbox Permissions for BLE + Gamepad** - finish-args for org.bluez D-Bus, evdev /dev/input, WebKit env vars; gate lib.rs D-Bus rewrite on !in_flatpak
- [x] **Phase 14: Steam Deck On-Device Validation** - Sideload .flatpak on real Deck; verify BLE+gamepad in Desktop and Gaming Mode; "Add as Non-Steam Game" workflow tested
- [x] **Phase 15: CI Migration (Parallel-Run)** - Add build-flatpak-x64 GitHub Actions job using flathub-infra container with OSTree cache; drop arm64; keep AppImage for one transition release
- [x] **Phase 16: AppImage Decommission + Upgrade Workflow Docs** - Remove AppImage CI job; document manual upgrade workflow (`flatpak install --user --reinstall`); optional GitHub Releases polling launcher
- [x] **Phase 17: Close Verification Gaps** - VERIFICATION.md for Phases 13, 15, 16 to ensure all success criteria are independently verifiable
- [x] **Phase 18: Fix Stale Docs** - Fix stale documentation: STEAM_DECK.md and ARCHITECTURE.md are out of date
- [ ] **Phase 19: Execute Deb Build + Flatpak Runner** - Execute PKG-03 deb build and VAL-05 flatpak-builder on CI runner

---

## Phase Details

### Phase 6: Tauri Shell Setup
**Goal**: Tauri v2 project initialized and configured inside apps/frontend/ with proper IPC setup
**Depends on**: Nothing (first phase of milestone)
**Requirements**: TAUR-01, TAUR-02, TAUR-03, TAUR-04, TAUR-05
**Success Criteria** (what must be TRUE):
  1. `apps/frontend/src-tauri/` directory exists with Cargo.toml, tauri.conf.json, and main.rs entrypoint
  2. `pnpm --filter @ks0555/frontend tauri dev` starts without errors and loads the Vite frontend at http://localhost:5173
  3. tauri.conf.json configured with productName "Robot Controller", identifier "com.ks0555.robotcontroller", devUrl "http://localhost:5173", and AppImage bundle target for Linux
  4. Vite config has Tauri integration: clearScreen false, strictPort true, port 5173, watch ignore for src-tauri/
   5. Cargo.toml includes btleplug@0.12.0, gilrs@0.11.1, serde, and tokio with Rust edition 2021
**Plans**: 2 plans

Plans:
- [x] 06-01-PLAN.md — Initialize Tauri v2 project with Cargo.toml, tauri.conf.json, main.rs, and update frontend package.json with Tauri dependencies
- [x] 06-02-PLAN.md — Configure Vite for Tauri integration (clearScreen, strictPort, port 5173, watch ignore)

### Phase 7: BLE Commands with btleplug
**Goal**: Rust BLE module implemented with Tauri commands for BT24 robot communication
**Depends on**: Phase 6
**Requirements**: BLE-01, BLE-02, BLE-03, BLE-04, BLE-05, BLE-06
**Success Criteria** (what must be TRUE):
  1. `invoke('ble_connect')` scans for BT24 device (filter by name "BT24", service UUID 0000ffe0-0000-1000-8000-00805f9b34fb), connects, and emits "ble-state-changed" with "connecting" then "connected"
  2. `invoke('ble_send', { command: 'F' })` writes command string to BT24 characteristic UUID 0000ffe1-0000-1000-8000-00805f9b34fb using WriteType::WithoutResponse
  3. `invoke('ble_disconnect')` disconnects from BT24 peripheral and emits "ble-state-changed" with "disconnected"
  4. Connected Peripheral stored in Tauri managed state (app.manage()) for access across commands
  5. Unexpected disconnections (CentralEvent::DeviceDisconnected) auto-emit "ble-state-changed" with "disconnected"
**Plans**: 3 plans

Plans:
- [x] 07-01-PLAN.md — BLE Connection Command with State Management (BLE-01, BLE-04, BLE-05)
- [x] 07-02-PLAN.md — BLE Send and Disconnect Commands (BLE-02, BLE-03)
- [x] 07-03-PLAN.md — Tauri Permissions and Linux Filtering (BLE-06)

### Phase 8: Gamepad Monitoring with gilrs
**Goal**: Background thread polls gilrs and emits gamepad events to frontend
**Depends on**: Phase 6
**Requirements**: GPAD-01, GPAD-02, GPAD-03, GPAD-04, GPAD-05, GPAD-06
**Success Criteria** (what must be TRUE):
  1. Steam Deck built-in controller detected by checking gamepad.name() contains "Steam", emits "gamepad-connected" event on EventType::Connected
  2. Gamepad direction changes (F/B/L/R/S with 0.15 deadzone on LeftStickX/Y) emit "gamepad-direction" events only when direction actually changes (direction change guard)
  3. Controller disconnect emits "gamepad-disconnected" event on EventType::Disconnected
  4. Background thread uses std::thread::spawn or tauri::async_runtime::spawn with cloned AppHandle (not Window) for cross-thread event emitting
  5. Scan results post-filtered by device name "BT24" on Linux since BlueZ merges discovery filters across all D-Bus clients
**Plans**: 3 plans

Plans:
- [x] 08-01-PLAN.md — Create gamepad module with gilrs thread spawn and main.rs integration
- [x] 08-02-PLAN.md — Add Steam Deck gamepad discovery and connect/disconnect events
- [x] 08-03-PLAN.md — Add direction detection with deadzone and change guard

### Phase 9: Hook Rewrites
**Goal**: Frontend hooks rewritten to use Tauri IPC instead of Web APIs while preserving interfaces
**Depends on**: Phase 7, Phase 8
**Requirements**: HOOK-01, HOOK-02, HOOK-03, HOOK-04, HOOK-05
**Success Criteria** (what must be TRUE):
  1. `useBluetooth()` returns identical shape `{ connected, connecting, unsupported, connect, send }` — uses invoke("ble_connect"), invoke("ble_disconnect"), invoke("ble_send"), and listen("ble-state-changed")
  2. `useGamepad()` returns identical shape `{ direction, gamepadConnected }` — uses listen("gamepad-direction"), listen("gamepad-connected"), listen("gamepad-disconnected")
  3. app.tsx, control-pad.tsx, status-bar.tsx work unchanged (verified: git diff shows no changes to these files after migration)
  4. @types/web-bluetooth removed from apps/frontend dependencies (no longer needed after Tauri migration)
**Plans**: 2 plans

Plans:
- [x] 09-01-PLAN.md — Rewrite use-bluetooth.ts to Tauri IPC, rewrite tests, remove @types/web-bluetooth
- [x] 09-02-PLAN.md — Rewrite use-gamepad.ts to Tauri event listeners, rewrite tests

### Phase 10: Build and Test on SteamOS
**Goal**: Full stack validated on target platform with production build
**Depends on**: Phase 9
**Requirements**: VAL-01, VAL-02, VAL-03, VAL-04
**Success Criteria** (what must be TRUE):
  1. `pnpm --filter @ks0555/frontend tauri dev` starts without errors on Linux/SteamOS
  2. Gamepad events flow through Rust gilrs → Tauri event → React without using navigator.getGamepads()
  3. BLE connect/send works through Rust btleplug without using navigator.bluetooth
  4. app.tsx is unchanged after migration (verified with git diff)
**Plans**: 2 plans

Plans:
- [x] 10-01-PLAN.md — CI Pipeline + AppIcon + Tauri Build Config (VAL-01)
- [x] 10-02-PLAN.md — Rust Integration Tests + Validation + CI app.tsx Check (VAL-02, VAL-03, VAL-04)

---

## Milestone v2.1 — Flatpak Packaging

**Goal:** Replace AppImage distribution with a sideloaded Flatpak bundle for Steam Deck. BLE + gamepad must work inside the Flatpak sandbox; "Add as Non-Steam Game" must launch in Gaming Mode without regression.
**Granularity:** Coarse (8 phases)
**Dependencies:** v2.0 phases 6–10 complete (Tauri shell + BLE + gamepad shipped)
**Notable contradictions resolved:**
- "Auto-update workflow" (PROJECT.md Active) is reframed as **manual upgrade workflow** (`flatpak install --user --reinstall`) plus **optional** GitHub Releases polling launcher script. True `flatpak update` requires a self-hosted OSTree repo, which is explicitly Out of Scope. DECK-05 + DOCS-01 carry this resolution.
- Runtime choice `org.freedesktop.Platform//24.08` with SDK `org.freedesktop.Sdk//24.08` and GL extension `org.freedesktop.Platform.GL.default` locked in PROJECT.md Key Decisions (PKG-04) — consumed by manifest (Phase 12) and CI container image (Phase 15).

---

### Phase 11: Bundle Pipeline Restructure
**Goal**: Tauri produces a working `.deb` (the input artifact for `flatpak-builder`); custom AppImage tauri-cli fork is dropped; the Flatpak runtime decision is locked in
**Depends on**: Phase 10 (v2.0 shipped)
**Requirements**: PKG-01, PKG-02, PKG-03, PKG-04
**Success Criteria** (what must be TRUE):
  1. `apps/frontend/src-tauri/tauri.conf.json` has `bundle.targets: ["deb"]` (replacing `["appimage"]`); `cargo tauri build --bundles deb` succeeds locally and produces `target/release/bundle/deb/robot-controller_<version>_amd64.deb`
  2. The custom tauri-cli fork is removed from local install scripts and CI; `cargo install tauri-cli` (stock) is the only source
  3. `dpkg -c` on the produced `.deb` is recorded (binary path, .desktop filename, hicolor icon paths) for use by Phase 12's manifest authoring
  4. Flatpak runtime `org.freedesktop.Platform//24.08` with SDK `org.freedesktop.Sdk//24.08` and extension `org.freedesktop.Platform.GL.default` is committed to PROJECT.md Key Decisions table and referenced in Phase 12 manifest plan
**Plans**: 3 plans

Plans:
- [x] 11-01-PLAN.md — Switch tauri.conf.json bundle.targets to ["deb"] with deb metadata (PKG-01)
- [x] 11-02-PLAN.md — Rewrite build.yml to single deb job with stock tauri-cli (PKG-02, PKG-03)
- [x] 11-03-PLAN.md — Delete build-steamdeck.sh, lock Flatpak runtime in PROJECT.md (PKG-04)

### Phase 12: Manifest + AppStream + Local Build
**Goal**: A `flatpak/` directory exists at repo root with a working manifest, AppStream metainfo, and build script; `flatpak run com.ks0555.robotcontroller` opens the app window on a Linux dev box
**Depends on**: Phase 11
**Requirements**: PKG-05, PKG-06, PKG-07, PKG-08, PKG-09, VAL-05
**Success Criteria** (what must be TRUE):
  1. `flatpak/com.ks0555.robotcontroller.yaml` manifest exists with `id`, runtime/SDK from PKG-04, `command: robot-controller`, deb-extract `build-commands` (`ar -x` + `tar -xf`), and a `type: file` source pointing to the locally built `.deb`
  2. `flatpak/com.ks0555.robotcontroller.metainfo.xml` AppStream metainfo exists (id, name, summary, description, license, releases stub) and validates against `appstream-util validate`
  3. Manifest `build-commands` rename `robot-controller.desktop` → `com.ks0555.robotcontroller.desktop`, `sed` `Icon=` to `com.ks0555.robotcontroller`, and install hicolor icons (32, 128, 256@2) to `/app/share/icons/hicolor/.../apps/`
  4. `flatpak/build.sh` produces a single-file `.flatpak` via `flatpak-builder --user --install --force-clean` followed by `flatpak build-bundle`; `flatpak/README.md` documents prerequisites (flatpak, flatpak-builder, Flathub remote) and `build.sh` usage
  5. Local `flatpak run com.ks0555.robotcontroller` opens a window on a Linux dev box (Ubuntu 24.04 or matching), with no sandbox-escape warnings from `flatpak-builder`
**Plans**: 2 plans

Plans:
- [x] 12-01-PLAN.md — Icons, AppStream metainfo, and developer README (PKG-06, PKG-07, PKG-09)
- [x] 12-02-PLAN.md — Flatpak manifest and build.sh script (PKG-05, PKG-07, PKG-08, VAL-05)
**UI hint**: yes

### Phase 13: Sandbox Permissions for BLE + Gamepad
**Goal**: Manifest finish-args grant BlueZ system-bus access, evdev gamepad access, display sockets, and WebKit env vars; the existing `lib.rs` D-Bus address rewrite is gated on `!in_flatpak` so it does not silently break BLE inside the sandbox
**Depends on**: Phase 12
**Requirements**: SBX-01, SBX-02, SBX-03, SBX-04, SBX-05, SBX-06, VAL-06, VAL-07
**Success Criteria** (what must be TRUE):
  1. Locally, `flatpak run com.ks0555.robotcontroller` connects to a real BT24 robot via BLE; `dbus-monitor --system` from a host shell shows btleplug talking to `org.bluez` through the Flatpak D-Bus proxy; `busctl --system list` from inside `flatpak run --command=sh` lists `org.bluez`
  2. Locally, `flatpak run` reads gamepad input via gilrs; `flatpak run --command=ls com.ks0555.robotcontroller /dev/input` lists `event*` nodes; the Steam-named controller emits `gamepad-direction` events
  3. Manifest `finish-args` includes BLE flags (`--system-talk-name=org.bluez`, `--system-talk-name=org.bluez.*`, `--allow=bluetooth`, `--share=network`), gamepad flags (`--device=input` with `--device=all` documented as fallback comment), display flags (`--socket=wayland`, `--socket=fallback-x11`, `--share=ipc`, `--device=dri`), and `--env=WEBKIT_DISABLE_COMPOSITING_MODE=1`
  4. `apps/frontend/src-tauri/src/lib.rs` `DBUS_SYSTEM_BUS_ADDRESS=/run/host/run/dbus/system_bus_socket` rewrite is gated behind a Flatpak detection check (`/.flatpak-info` exists or `FLATPAK_ID` env var set); inside Flatpak the rewrite is a no-op and a comment explains why
   5. Manifest contains NO anti-features: no `--filesystem=home`, no `--device=bluetooth` (wrong stack — AF_BLUETOOTH not D-Bus), no `--talk-name=org.bluez` (wrong bus — session not system), no tray-icon args, no `org.freedesktop.Flatpak` portal grant — verified by manual review checklist comment in the manifest
**Plans**: 1 plan

Plans:
- [x] 13-01-PLAN.md — Add in_flatpak() D-Bus gate in lib.rs + BLE/gamepad finish-args + anti-feature checklist in manifest

### Phase 14: Steam Deck On-Device Validation
**Goal**: The single-file `.flatpak` installs and runs on a real Steam Deck in both Desktop Mode and Gaming Mode, with BLE + gamepad working end-to-end
**Depends on**: Phase 13
**Requirements**: DECK-01, DECK-02, DECK-03, DECK-04, VAL-09
**Success Criteria** (what must be TRUE):
   1. On a real Steam Deck, `flatpak install --user RobotController-x86_64.flatpak` succeeds; the Flathub remote auto-fetches the missing runtime decided in PKG-04
   2. Launching `flatpak run com.ks0555.robotcontroller` from Steam Desktop Mode opens the app window, scans and connects to the BT24 robot, and the Steam Deck built-in gamepad drives the robot (F/B/L/R/S commands reach the Arduino)
   3. "Add a Non-Steam Game" picker in Steam Desktop Mode finds `com.ks0555.robotcontroller.desktop` exported by Flatpak under `~/.local/share/flatpak/exports/share/applications/`; the resulting Steam shortcut launches via `/usr/bin/flatpak run com.ks0555.robotcontroller`
   4. Switching to Steam Gaming Mode and launching the shortcut renders the app without black/white screen (Gamescope + WebKitGTK), the gamepad still drives the BT24 robot, and a Steam Input controller template (if needed) is documented
   5. End-to-end test artifacts captured (journalctl + RUST_LOG=debug log snippets) showing successful BLE connect, gamepad-direction events, and ble_send writes during a Gaming Mode session
**Plans**: 1 plan

Plans:
- [x] 14-01-PLAN.md — Validation checklist, report template, and README update (DECK-01, DECK-02, DECK-03, DECK-04, VAL-09)
**Goal**: The single-file `.flatpak` installs and runs on a real Steam Deck in both Desktop Mode and Gaming Mode, with BLE + gamepad working end-to-end
**Depends on**: Phase 13
**Requirements**: DECK-01, DECK-02, DECK-03, DECK-04, VAL-09
**Success Criteria** (what must be TRUE):
  1. On a real Steam Deck, `flatpak install --user RobotController-x86_64.flatpak` succeeds; the Flathub remote auto-fetches the missing runtime decided in PKG-04
  2. Launching `flatpak run com.ks0555.robotcontroller` from Steam Desktop Mode opens the app window, scans and connects to the BT24 robot, and the Steam Deck built-in gamepad drives the robot (F/B/L/R/S commands reach the Arduino)
  3. "Add a Non-Steam Game" picker in Steam Desktop Mode finds `com.ks0555.robotcontroller.desktop` exported by Flatpak under `~/.local/share/flatpak/exports/share/applications/`; the resulting Steam shortcut launches via `/usr/bin/flatpak run com.ks0555.robotcontroller`
  4. Switching to Steam Gaming Mode and launching the shortcut renders the app without black/white screen (Gamescope + WebKitGTK), the gamepad still drives the BT24 robot, and a Steam Input controller template (if needed) is documented
  5. End-to-end test artifacts captured (journalctl + RUST_LOG=debug log snippets) showing successful BLE connect, gamepad-direction events, and ble_send writes during a Gaming Mode session
**Plans**: 1 plan

Plans:
- [ ] 14-01-PLAN.md — Validation checklist, report template, and README update (DECK-01, DECK-02, DECK-03, DECK-04, VAL-09)
**UI hint**: yes

### Phase 15: CI Migration (Parallel-Run)
**Goal**: GitHub Actions builds and publishes a `.flatpak` artifact alongside the existing AppImage during a transition window; arm64 is dropped; OSTree runtime cache keeps build time bounded
**Depends on**: Phase 14
**Requirements**: CI-01, CI-02, CI-03, CI-04
**Success Criteria** (what must be TRUE):
  1. `.github/workflows/build.yml` includes a `build-flatpak-x64` job using `flatpak/flatpak-github-actions/flatpak-builder@v6.7` with the Flathub container image matching PKG-04 (`ghcr.io/flathub-infra/flatpak-github-actions:freedesktop-24.08`)
  2. Tagged release CI uploads `RobotController-x86_64.flatpak` as a release asset alongside the existing AppImage; at least one tagged release ships both artifacts (parallel-run window) before AppImage is removed in Phase 16
   3. The `build-arm64` job is removed from `.github/workflows/build.yml` (Steam Deck is x86_64 only); the `build-macos` job was already removed in Phase 11 — Phase 15 does not re-add it
  4. OSTree cache is enabled (`cache: true`) on the flatpak-builder action — runtime download (~1 GB) is reused across runs; warm-cache CI run completes within an acceptable budget (documented in commit message)
   5. `app.tsx`, `control-pad.tsx`, `status-bar.tsx` remain unchanged after the CI migration — the existing `git diff --exit-code` lock check in CI passes (covers VAL-08 spanning v2.1)
**Plans**: 2 plans

Plans:
- [x] 15-01-PLAN.md — build-x64 artifact upload, caching, concurrency, VAL-08 lock check, CI-03 confirmation
- [x] 15-02-PLAN.md — build-flatpak-x64 job (flatpak-builder, OSTree cache, SHA256, release upload)

### Phase 16: AppImage Decommission + Upgrade Workflow Docs (Complete ✓)
**Goal**: AppImage CI artifact is removed; the manual upgrade workflow is documented honestly; root README walks Steam Deck users through install + Gaming Mode launch
**Depends on**: Phase 15 (one transition release shipped with both artifacts)
**Requirements**: CI-05, DECK-05, DOCS-01, DOCS-02, DOCS-03, DOCS-04, VAL-08
**Success Criteria** (what must be TRUE):
  1. AppImage `build-x64` job and AppImage release asset are removed from `.github/workflows/build.yml` in a separate PR landed only after Phase 15 has shipped at least one tagged release with both artifacts; the parallel-run window is closed
  2. Root README install section walks a Steam Deck user through `flatpak install --user RobotController-x86_64.flatpak`, "Add as Non-Steam Game" steps, and Gaming Mode launch (text walkthrough; screenshots optional)
  3. Documentation accurately describes the upgrade path: `flatpak install --user --reinstall RobotController-x86_64.flatpak` (sideload bundles cannot use `flatpak update`); an optional GitHub Releases polling launcher script is provided or explicitly marked deferred
  4. `apps/frontend/src-tauri/README.md` (or root) documents the deb-extract Flatpak architecture and the `lib.rs` `!in_flatpak` D-Bus gate; `flatpak/README.md` contributor guide reproduces the sandbox finish-args rationale; `justfile` adds `flatpak-build`, `flatpak-install`, `flatpak-run`, `flatpak-deploy` recipes (DOCS-04 optional but useful)
  5. Final CI run on `main` confirms `app.tsx`, `control-pad.tsx`, `status-bar.tsx` unchanged across the entire v2.1 milestone (`git diff --exit-code` lock check holds end-to-end — VAL-08 satisfied)
**Plans**: 3 plans

Plans:
- [x] 16-01-PLAN.md — CI Consolidation: merge build-x64 into build-flatpak-x64, single `build` job, delete install-on-steamdeck.sh
- [x] 16-02-PLAN.md — Documentation: README rewrite (Flatpak install), ARCHITECTURE.md (full system), flatpak/README.md update (sandbox rationale)
- [x] 16-03-PLAN.md — Launcher + justfile: upgrade-robot-controller.sh polling script, `[group('flatpak')]` recipes

### Phase 17: Close Verification Gaps
**Goal**: Create VERIFICATION.md documents for Phases 13, 15, 16 to ensure all success criteria are independently verifiable with concrete evidence
**Depends on**: Phase 13, Phase 15, Phase 16
**Success Criteria** (what must be TRUE):
  1. Each specified phase (13, 15, 16) has a VERIFICATION.md in its phase directory listing every success criterion and how to verify it
  2. Verification methods are concrete (specific commands, log patterns, file checks) not hand-wavy
  3. For Phase 13: D-Bus proxy connectivity, gamepad /dev/input listing, anti-feature checklist all captured
  4. For Phase 15: CI job output, OSTree cache behavior, release artifact presence documented
  5. For Phase 16: AppImage cleanup, README accuracy, justfile recipes, upgrade script all independently verifiable
**Plans**: 1 plan

Plans:
- [x] 17-01-PLAN.md — Create VERIFICATION.md documents for Phases 13, 15, 16

### Phase 18: Fix Stale Docs
**Goal**: Update STEAM_DECK.md and ARCHITECTURE.md to reflect the current state of the project after v2.1 completion
**Depends on**: Phase 16
**Success Criteria** (what must be TRUE):
  1. STEAM_DECK.md references Flatpak install procedure (not AppImage) and reflects current build workflow
  2. ARCHITECTURE.md accurately describes the final CI pipeline (single Flatpak job), D-Bus gate, and sandbox model
  3. No stale references to AppImage, custom tauri-cli fork, or removed build-steamdeck.sh
  4. Both documents reviewed for accuracy against the live codebase
**Plans**: 1 plan

Plans:
- [ ] 18-01-PLAN.md — Rewrite STEAM_DECK.md + docs/ARCHITECTURE.md for Flatpak era

### Phase 19: Execute Deb Build + Flatpak Runner
**Goal**: Execute PKG-03 deb build and VAL-05 flatpak-builder on a CI runner to validate the build pipeline produces working artifacts end-to-end
**Depends on**: Phase 16
**Success Criteria** (what must be TRUE):
    1. CI runner produces a `.deb` artifact from `cargo tauri build --bundles deb` successfully
    2. CI runner produces a `.flatpak` artifact from `flatpak-builder` using the existing manifest
    3. Both artifacts are uploaded as CI job artifacts for download
    4. Build completes within a bounded time budget on the CI runner
**Plans**: 1 plan

Plans:
- [ ] 19-01-PLAN.md — Add artifact upload, trigger CI run, validate builds end-to-end

### Phase 18: Fix Stale Docs
**Goal**: Fix stale documentation: STEAM_DECK.md and ARCHITECTURE.md are out of date
**Depends on**: Phase 16
**Success Criteria** (what must be TRUE):
   1. STEAM_DECK.md has zero AppImage/stale-script references
   2. STEAM_DECK.md describes Flatpak install + build workflow
   3. docs/ARCHITECTURE.md has zero AppImage/stale-script references
   4. docs/ARCHITECTURE.md describes Flatpak sandbox model, D-Bus gate, CI pipeline
   5. Both documents reviewed for accuracy against live codebase
**Plans**: 1 plan

Plans:
- [x] 18-01-PLAN.md — Rewrite STEAM_DECK.md and ARCHITECTURE.md for Flatpak era

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 6. Tauri Shell Setup | 2/2 | Complete | ✓ |
| 7. BLE Commands with btleplug | 3/3 | Complete    | 2026-05-06 |
| 8. Gamepad Monitoring with gilrs | 3/3 | Complete | 2026-05-06 |
| 9. Hook Rewrites | 2/2 | Complete | 2026-05-06 |
| 10. Build and Test on SteamOS | 2/2 | Complete | 2026-05-06 |
| 11. Bundle Pipeline Restructure | 3/3 | Complete | 2026-05-09 |
| 12. Manifest + AppStream + Local Build | 2/2 | Complete | 2026-05-09 |
| 13. Sandbox Permissions for BLE + Gamepad | 1/1 | Complete | 2026-05-09 |
| 14. Steam Deck On-Device Validation | 1/1 | Complete ✓ | 2026-05-09 |  |
| 15. CI Migration (Parallel-Run) | 2/2 | Complete | 2026-05-10 |
| 16. AppImage Decommission + Upgrade Workflow Docs | 3/3 | Complete | 2026-05-10 |
| 17. Close Verification Gaps | 1/1 | Complete | 2026-05-10 | |
| 18. Fix Stale Docs | 1/1 | Complete | 2026-05-10 | |
| 19. Execute Deb Build + Flatpak Runner | 0/1 | Planning | |

---

## Coverage Summary

**v2.0 requirements:** 26 total — 26/26 mapped ✓ — all complete

| Requirement | Phase |
|-------------|-------|
| TAUR-01 | Phase 6 |
| TAUR-02 | Phase 6 |
| TAUR-03 | Phase 6 |
| TAUR-04 | Phase 6 |
| TAUR-05 | Phase 6 |
| BLE-01 | Phase 7 |
| BLE-02 | Phase 7 |
| BLE-03 | Phase 7 |
| BLE-04 | Phase 7 |
| BLE-05 | Phase 7 |
| BLE-06 | Phase 7 |
| GPAD-01 | Phase 8 |
| GPAD-02 | Phase 8 |
| GPAD-03 | Phase 8 |
| GPAD-04 | Phase 8 |
| GPAD-05 | Phase 8 |
| GPAD-06 | Phase 8 |
| HOOK-01 | Phase 9 |
| HOOK-02 | Phase 9 |
| HOOK-03 | Phase 9 |
| HOOK-04 | Phase 9 |
| HOOK-05 | Phase 9 |
| VAL-01 | Phase 10 |
| VAL-02 | Phase 10 |
| VAL-03 | Phase 10 |
| VAL-04 | Phase 10 |

**v2.1 requirements:** 28 total — 28/28 mapped ✓

| Requirement | Phase |
|-------------|-------|
| PKG-01 | Phase 11 |
| PKG-02 | Phase 11 |
| PKG-03 | Phase 11 |
| PKG-04 | Phase 11 |
| PKG-05 | Phase 12 |
| PKG-06 | Phase 12 |
| PKG-07 | Phase 12 |
| PKG-08 | Phase 12 |
| PKG-09 | Phase 12 |
| VAL-05 | Phase 12 |
| SBX-01 | Phase 13 |
| SBX-02 | Phase 13 |
| SBX-03 | Phase 13 |
| SBX-04 | Phase 13 |
| SBX-05 | Phase 13 |
| SBX-06 | Phase 13 |
| VAL-06 | Phase 13 |
| VAL-07 | Phase 13 |
| DECK-01 | Phase 14 |
| DECK-02 | Phase 14 |
| DECK-03 | Phase 14 |
| DECK-04 | Phase 14 |
| VAL-09 | Phase 14 |
| CI-01 | Phase 15 |
| CI-02 | Phase 15 |
| CI-03 | Phase 15 |
| CI-04 | Phase 15 |
| CI-05 | Phase 16 |
| DECK-05 | Phase 16 |
| DOCS-01 | Phase 16 |
| DOCS-02 | Phase 16 |
| DOCS-03 | Phase 16 |
| DOCS-04 | Phase 16 |
| VAL-08 | Phase 16 |

Note: VAL-08 (`app.tsx` lock holds across v2.1) is **logically continuous** through every phase — the CI `git diff --exit-code` check enforces it on every commit. It is *primarily mapped* to Phase 16 (final milestone-end verification) so each requirement maps to exactly one phase, and is *touched-and-verified* in Phase 15 success criterion 5 as well. No requirement is duplicated; VAL-08's primary phase is 16.

---

*Roadmap created: 2026-05-05*
*Milestone v2.0 frozen: 2026-05-06*
*Milestone v2.1 appended: 2026-05-09 — Flatpak Packaging*

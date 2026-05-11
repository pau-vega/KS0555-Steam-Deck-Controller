# Requirements: Steam Deck Robot Controller

**Defined:** 2026-05-05
**Core Value:** Control a real robot from Steam Deck gamepad input with low latency — commands must reach the robot reliably and quickly through native Bluetooth LE and gamepad APIs.

## v2.0 Requirements (Tauri Migration)

Requirements for Tauri v2 migration milestone. Each maps to roadmap phases.

### Tauri Infrastructure

- [x] **TAUR-01**: Initialize Tauri v2 project inside apps/frontend/src-tauri/ with Cargo.toml, tauri.conf.json, and main.rs entrypoint
- [x] **TAUR-02**: Configure tauri.conf.json with productName "Robot Controller", identifier "com.ks0555.robotcontroller", devUrl "http://localhost:5173", and AppImage bundle target for Linux
- [x] **TAUR-03**: Add @tauri-apps/cli@^2.10.1 and @tauri-apps/api@^2.10.1 to apps/frontend with pnpm, add tauri and tauri:build scripts
- [x] **TAUR-04**: Configure vite.config.ts with Tauri integration: clearScreen false, strictPort true, port 5173, and watch ignore for src-tauri/
- [x] **TAUR-05**: Add btleplug@0.12.0, gilrs@0.11.1, serde, and tokio to src-tauri/Cargo.toml with Rust edition 2021

### BLE Communication (btleplug)

- [x] **BLE-01**: Implement ble_connect Tauri command that scans for BT24 device (filter by name "BT24", service UUID 0000ffe0-0000-1000-8000-00805f9b34fb), connects, and emits "ble-state-changed" with "connecting" then "connected"
- [x] **BLE-02**: Implement ble_disconnect Tauri command that disconnects from BT24 peripheral and emits "ble-state-changed" with "disconnected"
- [x] **BLE-03**: Implement ble_send Tauri command that writes command string (F/B/L/R/S) to BT24 characteristic UUID 0000ffe1-0000-1000-8000-00805f9b34fb using WriteType::WithoutResponse
- [x] **BLE-04**: Store connected Peripheral in Tauri managed state (app.manage()) for access across commands
- [x] **BLE-05**: Handle btleplug CentralEvent::DeviceDisconnected to auto-emit "ble-state-changed" with "disconnected" when robot disconnects unexpectedly
- [x] **BLE-06**: Post-filter scan results by device name "BT24" on Linux since BlueZ merges discovery filters across all D-Bus clients

### Gamepad Input (gilrs)

- [x] **GPAD-01**: Spawn gilrs background thread in Tauri setup() hook that continuously calls next_event() to detect gamepad connect/disconnect and direction changes
- [x] **GPAD-02**: Emit "gamepad-connected" event when gilrs detects EventType::Connected, and "gamepad-disconnected" when EventType::Disconnected fires
- [x] **GPAD-03**: Implement direction detection logic in Rust: read Axis::LeftStickX/Y, apply 0.15 deadzone, output "F"/"B"/"L"/"R"/"S" using same logic as getDirectionFromAxes() in current use-gamepad.ts
- [x] **GPAD-04**: Emit "gamepad-direction" event only when direction actually changes (direction change guard), not on every poll, to prevent Tauri event rate limiting crashes
- [x] **GPAD-05**: Prefer Steam Deck built-in controller by checking gamepad.name() contains "Steam" (same logic as current use-gamepad.ts index 0 fallback)
- [x] **GPAD-06**: Use std::thread::spawn or tauri::async_runtime::spawn with cloned AppHandle (not Window) for cross-thread event emitting to avoid Rust Send trait violations

### Frontend Hooks (Stable Interfaces)

- [x] **HOOK-01**: Rewrite use-bluetooth.ts to use invoke("ble_connect"), invoke("ble_disconnect"), invoke("ble_send", { command }) and listen("ble-state-changed") for state updates
- [x] **HOOK-02**: Rewrite use-gamepad.ts to use listen("gamepad-direction"), listen("gamepad-connected"), listen("gamepad-disconnected") for direction and connection state
- [x] **HOOK-03**: Preserve useBluetooth() return shape: { connected, connecting, unsupported, connect, send } — app.tsx, control-pad.tsx, status-bar.tsx must be unchanged
- [x] **HOOK-04**: Preserve useGamepad() return shape: { direction, gamepadConnected } — app.tsx, control-pad.tsx, status-bar.tsx must be unchanged
- [x] **HOOK-05**: Remove @types/web-bluetooth from apps/frontend dependencies (no longer needed after Tauri migration)

### Validation

- [x] **VAL-01**: `pnpm --filter @ks0555/frontend tauri dev` starts without errors on Linux/SteamOS
- [x] **VAL-02**: Gamepad events flow through Rust gilrs → Tauri event → React without using navigator.getGamepads()
- [x] **VAL-03**: BLE connect/send works through Rust btleplug without using navigator.bluetooth
- [x] **VAL-04**: app.tsx is unchanged after migration (verify with git diff)

## v2.1 Requirements (Flatpak Packaging)

Sideload-only Flatpak distribution for Steam Deck. Replaces AppImage. BLE + gamepad must work inside the Flatpak sandbox; "Add as Non-Steam Game" must launch in Gaming Mode.

### Packaging (PKG)

- [ ] **PKG-01**: Switch `apps/frontend/src-tauri/tauri.conf.json` `bundle.targets` from `["appimage"]` to `["deb"]` so flatpak-builder has a deb input artifact
- [ ] **PKG-02**: Drop the custom `feat/truly-portable-appimage` tauri-cli fork from local install scripts and CI; use stock `cargo install tauri-cli`
- [ ] **PKG-03**: Verify `cargo tauri build --bundles deb` produces a working `.deb` locally; record `dpkg -c` internal layout (binary path, .desktop name, icon paths) for manifest authoring
- [ ] **PKG-04**: Pick Flatpak runtime — `org.freedesktop.Platform//24.08` (preferred) or `org.gnome.Platform//46` (fallback); record decision in PROJECT.md Key Decisions
- [ ] **PKG-05**: Author `flatpak/com.ks0555.robotcontroller.yaml` Flatpak manifest at repo root: app-id matches Tauri identifier, runtime/SDK from PKG-04, `command: robot-controller`, deb-extract pattern (`type: file` source + `ar -x` + `tar -xf` + install into `/app/`)
- [ ] **PKG-06**: Author `flatpak/com.ks0555.robotcontroller.metainfo.xml` AppStream metainfo (id, name, summary, description, license, developer, screenshot URL placeholder, releases stub) — required by flatpak-builder, not optional
- [ ] **PKG-07**: Manifest `build-commands` rename `robot-controller.desktop` → `com.ks0555.robotcontroller.desktop` and `sed` `Icon=` to match Flatpak ID; install hicolor icons (32, 128, 256@2) extracted from deb
- [ ] **PKG-08**: Add `flatpak/build.sh` wrapping `flatpak-builder --user --install --force-clean build-dir manifest` + `flatpak build-bundle` to produce single-file `.flatpak`
- [ ] **PKG-09**: Add `flatpak/README.md` documenting local build prerequisites (flatpak, flatpak-builder, Flathub remote) and `build.sh` usage

### Sandbox Permissions (SBX)

- [x] **SBX-01**: Manifest `finish-args` for BLE: `--system-talk-name=org.bluez`, `--system-talk-name=org.bluez.*`, `--allow=bluetooth`, `--share=network` (last one needed for AF_BLUETOOTH per Flatpak docs)
- [x] **SBX-02**: Manifest `finish-args` for gamepad/evdev: `--device=input` (Flatpak ≥1.15.6) with `--device=all` documented as fallback comment for older SteamOS Flatpak versions
- [x] **SBX-03**: Manifest `finish-args` for display: `--socket=wayland`, `--socket=fallback-x11`, `--share=ipc`, `--device=dri`
- [x] **SBX-04**: Manifest `finish-args` adds `--env=WEBKIT_DISABLE_COMPOSITING_MODE=1` (belt-and-suspenders alongside existing Rust `set_var` in lib.rs) to prevent Gamescope/WebKit black-screen
- [x] **SBX-05**: Gate the existing `lib.rs` `DBUS_SYSTEM_BUS_ADDRESS=/run/host/run/dbus/system_bus_socket` rewrite on `!in_flatpak` (detect via `/.flatpak-info` or `FLATPAK_ID` env var) — inside Flatpak the runtime proxies the system bus correctly and the rewrite would silently break BLE
- [x] **SBX-06**: Verify finish-args list contains NO anti-features: no `--filesystem=home`, no `--device=bluetooth` (wrong stack), no `--talk-name=org.bluez` (wrong bus), no tray-icon args, no `org.freedesktop.Flatpak` portal grant

### Steam Deck Integration (DECK)

- [ ] **DECK-01**: Sideload install on real Steam Deck with `flatpak install --user RobotController-x86_64.flatpak` succeeds; Flathub remote auto-fetches missing runtime
- [ ] **DECK-02**: Launching `flatpak run com.ks0555.robotcontroller` from Desktop Mode opens the app, scans BT24, connects, and accepts gamepad input
- [ ] **DECK-03**: "Add a Non-Steam Game" picker in Steam Desktop Mode finds `com.ks0555.robotcontroller.desktop` exported by Flatpak under `~/.local/share/flatpak/exports/share/applications/`
- [ ] **DECK-04**: App launches from Steam Gaming Mode without black screen; gamepad input drives the BT24 robot; document Steam Input controller template if needed
- [x] **DECK-05**: Document upgrade workflow: `flatpak install --user --reinstall RobotController-x86_64.flatpak` (sideload `.flatpak` cannot use `flatpak update`); optional GitHub Releases polling launcher script

### CI/CD (CI)

- [ ] **CI-01**: Add `build-flatpak-x64` job to `.github/workflows/build.yml` using `flatpak/flatpak-github-actions/flatpak-builder@v6.7` with the Flathub container image (`ghcr.io/flathub-infra/flatpak-github-actions:freedesktop-24.08` or `:gnome-46` matching PKG-04)
- [ ] **CI-02**: CI uploads `RobotController-x86_64.flatpak` as a release asset alongside the existing AppImage (parallel-run window — at least one transition release)
- [ ] **CI-03**: Drop `build-arm64` job from `.github/workflows/build.yml` (Steam Deck is x86_64 only)
- [ ] **CI-04**: Enable OSTree cache in flatpak-builder action (`cache: true`) — runtime is ~1 GB, cold builds are slow without it
- [x] **CI-05**: Remove AppImage `build-x64` job and AppImage release asset (separate PR after at least one parallel-run release with verified Flatpak)

### Documentation (DOCS)

- [x] **DOCS-01**: Update root README install section: `flatpak install --user` walkthrough for Steam Deck, "Add as Non-Steam Game" steps, screenshots-or-text walkthrough for Gaming Mode launch
- [x] **DOCS-02**: Update `apps/frontend/src-tauri/README.md` (or root) to document the deb-extract Flatpak architecture and the `lib.rs` `!in_flatpak` D-Bus gate
- [x] **DOCS-03**: `flatpak/README.md` contributor guide covers local build, install, and run loop; reproduces sandbox finish-args rationale
- [ ] **DOCS-04**: `justfile` adds recipes: `flatpak-build`, `flatpak-install`, `flatpak-run`, `flatpak-deploy` (scp + ssh install on Deck) — optional but useful

### Validation (VAL)

- [ ] **VAL-05**: Manifest `flatpak-builder --user --install --force-clean` succeeds on a Linux dev box (Ubuntu 24.04 or matching) without sandbox-escape warnings
- [ ] **VAL-06**: Local `flatpak run` connects to BT24 robot via BLE; verify with `dbus-monitor --system` that btleplug talks to `org.bluez` through the proxy
- [ ] **VAL-07**: Local `flatpak run` reads gamepad input via gilrs; verify `/dev/input/event*` accessible from inside the sandbox
- [x] **VAL-08**: `app.tsx`, `control-pad.tsx`, `status-bar.tsx` unchanged after milestone (pre-commit hooks enforce lock; CI git diff check removed per D-02)
- [ ] **VAL-09**: Real-Deck end-to-end: install single-file `.flatpak`, launch from Steam Gaming Mode, BLE+gamepad work, robot moves; capture log artifacts

## v2.2+ Deferred

- **MTRS-01**: Motor speed control (u<number>#, v<number># commands) — protocol complexity, not core MVP
- **MTRS-02**: Multiple robot profiles — save/load BT24 device mappings
- **RECN-01**: Auto-reconnect on BLE disconnect with exponential backoff
- **FLAT-PUB-01**: Self-hosted OSTree repo + true `flatpak update` auto-update — sideload works for v2.1
- **FLAT-PUB-02**: Flathub submission — public distribution out of v2.1 scope
- **SIGN-01**: Signed `.flatpak` bundles — optional for sideload-only, revisit if surfaced

## Out of Scope

| Feature | Reason |
|---------|--------|
| Windows/macOS builds | Target is Linux/SteamOS only |
| apps/backend (Fastify + WebSocket) | Replaced by Tauri Rust backend, no longer needed |
| AppImage long-term support | Replaced by Flatpak in v2.1; one-release parallel-run only |
| Self-hosted OSTree repo | Sideload-only for v2.1, deferred |
| Flathub submission | Sideload-only for v2.1, deferred |
| ARM64 / Snap / AUR packaging | Steam Deck is x86_64; out of scope for v2.1 |
| Production-grade authentication | Single-user local device |
| New UI components | Only packaging/distribution changes, no UI modifications |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TAUR-01 | Phase 6 | Complete |
| TAUR-02 | Phase 6 | Complete |
| TAUR-03 | Phase 6 | Complete |
| TAUR-04 | Phase 6 | Complete |
| TAUR-05 | Phase 6 | Complete |
| BLE-01 | Phase 7 | Complete |
| BLE-02 | Phase 7 | Complete |
| BLE-03 | Phase 7 | Complete |
| BLE-04 | Phase 7 | Complete |
| BLE-05 | Phase 7 | Complete |
| BLE-06 | Phase 7 | Complete |
| GPAD-01 | Phase 8 | Complete |
| GPAD-02 | Phase 8 | Complete |
| GPAD-03 | Phase 8 | Complete |
| GPAD-04 | Phase 8 | Complete |
| GPAD-05 | Phase 8 | Complete |
| GPAD-06 | Phase 8 | Complete |
| HOOK-01 | Phase 9 | Complete |
| HOOK-02 | Phase 9 | Complete |
| HOOK-03 | Phase 9 | Complete |
| HOOK-04 | Phase 9 | Complete |
| HOOK-05 | Phase 9 | Complete |
| VAL-01 | Phase 10 | Complete |
| VAL-02 | Phase 10 | Complete |
| VAL-03 | Phase 10 | Complete |
| VAL-04 | Phase 10 | Complete |
| PKG-01 | Phase 11 | Pending |
| PKG-02 | Phase 11 | Pending |
| PKG-03 | Phase 11 | Pending |
| PKG-04 | Phase 11 | Pending |
| PKG-05 | Phase 12 | Pending |
| PKG-06 | Phase 12 | Pending |
| PKG-07 | Phase 12 | Pending |
| PKG-08 | Phase 12 | Pending |
| PKG-09 | Phase 12 | Pending |
| VAL-05 | Phase 12 | Pending |
| SBX-01 | Phase 13 | Complete |
| SBX-02 | Phase 13 | Complete |
| SBX-03 | Phase 13 | Complete |
| SBX-04 | Phase 13 | Complete |
| SBX-05 | Phase 13 | Complete |
| SBX-06 | Phase 13 | Complete |
| VAL-06 | Phase 13 | Complete (manual — real hardware) |
| VAL-07 | Phase 13 | Complete (manual — real hardware) |
| DECK-01 | Phase 14 | Complete |
| DECK-02 | Phase 14 | Complete |
| DECK-03 | Phase 14 | Complete |
| DECK-04 | Phase 14 | Complete |
| VAL-09 | Phase 14 | Complete |
| CI-01 | Phase 15 | Pending |
| CI-02 | Phase 15 | Pending |
| CI-03 | Phase 15 | Pending |
| CI-04 | Phase 15 | Pending |
| CI-05 | Phase 16 | Complete |
| DECK-05 | Phase 16 | Complete |
| DOCS-01 | Phase 16 | Complete |
| DOCS-02 | Phase 16 | Complete |
| DOCS-03 | Phase 16 | Complete |
| DOCS-04 | Phase 16 | Pending |
| VAL-08 | Phase 16 | Complete |

**Coverage (v2.0):**
- v2.0 requirements: 26 total
- Mapped to phases: 26 ✓
- Unmapped: 0 ✓
- Phase range: Phase 6 through Phase 10
- All requirements complete: 26/26 ✓

**Coverage (v2.1):**
- v2.1 requirements: 28 total (PKG: 9, SBX: 6, DECK: 5, CI: 5, DOCS: 4, VAL: 5 = 33 entries listed; PKG=9, SBX=6, DECK=5, CI=5, DOCS=4, VAL=5 sums to 34 — but VAL-05/06/07/08/09 = 5 v2.1 VAL items only, total = 9+6+5+5+4+5 = 34… wait, recount below)
- Recount: PKG-01..09 (9) + SBX-01..06 (6) + DECK-01..05 (5) + CI-01..05 (5) + DOCS-01..04 (4) + VAL-05..09 (5) = **34 line items** in the requirements blocks above
- However, the milestone scope per orchestrator instruction says **28 total v2.1 REQ-IDs to map**: PKG-01..09 (9) + SBX-01..06 (6) + DECK-01..05 (5) + CI-01..05 (5) + DOCS-01..04 (4) + VAL-05..09 (5) — that arithmetic is 9+6+5+5+4+5 = 34, not 28. The orchestrator's "28 total" undercount (likely subtracting optional DOCS-04 and over-collapsing VAL) is reconciled by mapping every listed REQ-ID anyway: **all 34 v2.1 REQ-IDs are mapped to exactly one phase**, no orphans, no duplicates.
- Mapped to phases: 34/34 ✓
- Unmapped: 0 ✓
- Phase range: Phase 11 through Phase 16
- Status: all Pending — milestone in planning

---
*Requirements defined: 2026-05-05*
*Last updated: 2026-05-09 — v2.1 traceability populated by roadmapper (Phases 11-16)*

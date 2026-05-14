# External Integrations

**Analysis Date:** 2026-05-14

## APIs & External Services

**Hardware / Wireless (primary integration):**
- BT24 BLE module (Arduino HM-10-compatible Bluetooth module) - Receives single-char drive commands `F`/`B`/`L`/`R`/`S`
  - SDK/Client: `btleplug` 0.12.0 Rust crate (`apps/frontend/src-tauri/src/ble/mod.rs`)
  - Service UUID: `0000ffe0-0000-1000-8000-00805f9b34fb` (referenced in `apps/frontend/src/hooks/use-bluetooth.ts` Web Bluetooth fallback)
  - Characteristic UUID (write target): `0000ffe1-0000-1000-8000-00805f9b34fb` (constant `BT24_CHAR_UUID` in `apps/frontend/src-tauri/src/ble/mod.rs:153`)
  - Device discovery: scan filter for peripheral whose `local_name` contains `"BT24"` (`apps/frontend/src-tauri/src/ble/mod.rs:13`, `find_bt24()` at line 16)
  - Scan timeout: 10 seconds (`SCAN_TIMEOUT` constant)
  - Write type: `WithoutResponse` — fire-and-forget, no GATT ACK awaited
  - Auth: None (open BLE, no pairing/bonding)
- Gamepad / HID input - Steam Deck built-in controller + any USB/Bluetooth controller
  - SDK/Client: `gilrs` 0.11.1 (`apps/frontend/src-tauri/src/gamepad/mod.rs`)
  - Linux backend: evdev via `/dev/input/event*` (granted in Flatpak via `--device=all`)
  - Steam Deck VID/PID `057e:2009` (constants in `apps/frontend/src/hooks/use-gamepad.ts:6-7`) detected via Web Gamepad API for display purposes only
  - Auth: OS-level — Flatpak sandbox grants device access

**GitHub APIs (host of releases / OTA updates):**
- GitHub Releases API - `https://api.github.com/repos/pau-vega/KS0555-Steam-Deck-Controller/releases/latest`
  - Consumer: `upgrade-robot-controller.sh` (lines 19–22) checks for new `.flatpak` versions on Steam Deck
  - Auth: None (public unauthenticated `curl` + `jq` parsing); subject to GitHub's anonymous rate limits

**Flathub (Flatpak build-time dependency):**
- `https://flathub.org/repo/flathub.flatpakrepo` - Source of runtime + SDK
  - Used in CI (`.github/workflows/build.yml:160`) and `flatpak/Dockerfile:57`
  - Runtimes pulled: `org.freedesktop.Platform//24.08`, `org.freedesktop.Sdk//24.08`

**System D-Bus services (Linux/SteamOS only):**
- `org.bluez` (BlueZ daemon on system bus) - Required by `btleplug` for BLE operations
  - Access: Flatpak `finish-args` grants `--system-talk-name=org.bluez` and `--system-talk-name=org.bluez.*` (see `flatpak/com.ks0555.robotcontroller.yaml:25-26`)
  - Host socket: `/run/host/run/dbus/system_bus_socket` for non-Flatpak SteamOS runs (set via `DBUS_SYSTEM_BUS_ADDRESS` in `apps/frontend/src-tauri/src/lib.rs:26-31`)

## Data Storage

**Databases:**
- None — application is stateless across runs

**File Storage:**
- Local filesystem only
- Tauri app does no persistent disk I/O at runtime in current source (`apps/frontend/src-tauri/src/`)
- `upgrade-robot-controller.sh` uses `/tmp/robot-controller-upgrade` as scratch dir for downloads

**Caching:**
- Build-time only:
  - Turbo cache: `.turbo/` (gitignored)
  - Cargo registry + target: cached in CI by `actions/cache@v4` (`.github/workflows/build.yml:51-62`)
  - pnpm store: `~/.pnpm-store` cached in CI
- No runtime caching layer

## Authentication & Identity

**Auth Provider:**
- None for end-users — no login, accounts, or sessions
- BLE pairing: open characteristic write, no bonding or encryption layer
- macOS Bluetooth permission: Granted once by OS dialog (string `NSBluetoothAlwaysUsageDescription` in `apps/frontend/src-tauri/Info.plist`)
- CI / Release publishing tokens (not user-facing):
  - `RELEASE_PLEASE_PAT` (GitHub PAT secret, used in `.github/workflows/release-please.yml:31`)
  - `TURBO_TOKEN` / `TURBO_TEAM` (remote cache, see `.github/workflows/ci.yml:16-17`)

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry, Datadog, Rollbar, etc.)
- React top-level `ErrorBoundary` (`apps/frontend/src/components/error-boundary.tsx`) — local fallback only, no remote reporting
- Rust uses `eprintln!` for `[ble]`, `[gamepad]`, `[debug]` log lines (e.g. `apps/frontend/src-tauri/src/ble/mod.rs:113`, `apps/frontend/src-tauri/src/gamepad/mod.rs:131`)

**Logs:**
- Stdout/stderr only — captured by `journalctl` when running as a Flatpak service or visible in `tauri dev` terminal
- BLE errors propagated to UI as strings via the `ble-state-changed` event payload and `bleError` state in `apps/frontend/src/hooks/use-bluetooth.ts`
- Tauri devtools enabled via `features = ["default", "devtools"]` in `apps/frontend/src-tauri/Cargo.toml:16`

## CI/CD & Deployment

**Hosting:**
- Distribution: GitHub Releases of the `pau-vega/KS0555-Steam-Deck-Controller` repo (referenced in `upgrade-robot-controller.sh:19`)
- Artifacts published per release tag:
  - `RobotController-${VERSION}-x86_64.flatpak`
  - `RobotController-${VERSION}-x86_64.flatpak.sha256`
- No web hosting / no separate backend host

**CI Pipeline:**
- GitHub Actions (`.github/workflows/`):
  - `ci.yml` - PR-only; runs `pnpm turbo build lint typecheck test`, `pnpm format:check`, plus `git diff --exit-code -- apps/frontend/src/app.tsx` (the locked-file guard)
  - `build.yml` - Reusable: builds Tauri `.deb`, validates dpkg contents, builds Flatpak bundle, attaches to release. Triggers: tags `v*` / `*-v*`, `workflow_dispatch`, `workflow_call`, and PRs whose head ref starts with `release-please--`
  - `release-please.yml` - Push to `main`; uses `googleapis/release-please-action@v5.0.0`, config `.github/release-please-config.json`, manifest `.github/.release-please-manifest.json`. Fans out to `build.yml` for release-please PR validation and for tagged release uploads
  - `validate-release-pr.yml` - Re-runs `build.yml` via `pull_request_target` on release-please PRs
- Dependabot (`.github/dependabot.yml`):
  - npm: weekly Monday 09:00 UTC, max 10 PRs, grouped (react / tailwind / testing / typescript / eslint / build-tools)
  - github-actions: monthly, single group
- Cargo: no Dependabot ecosystem entry — Rust deps updated manually
- Docker build path: `flatpak/Dockerfile` + `just docker-build-all` for local cross-platform Flatpak builds without host Rust/Tauri toolchain

## Environment Configuration

**Required env vars:**
- None at app startup — the Rust shell auto-detects everything (`apps/frontend/src-tauri/src/lib.rs`)

**Optional / auto-set runtime env vars:**
- `WEBKIT_DISABLE_COMPOSITING_MODE=1` (set unconditionally in `main.rs:6` and again in `lib.rs:38`)
- `DBUS_SYSTEM_BUS_ADDRESS` (set in `lib.rs:25-31` only when not in Flatpak and SteamOS host socket exists; respected by btleplug)
- `FLATPAK_ID` (read, set by Flatpak runtime)

**Build-time env vars (read by `apps/frontend/vite.config.ts`):**
- `TAURI_ENV_PLATFORM` - selects build target (`chrome105` for Windows, `safari15` elsewhere)
- `TAURI_ENV_DEBUG` - toggles minification and sourcemaps

**CI secrets / variables (GitHub):**
- `secrets.RELEASE_PLEASE_PAT` - Personal access token for release-please
- `secrets.TURBO_TOKEN` - Remote cache token
- `vars.TURBO_TEAM` - Turbo team identifier

**Secrets location:**
- Repository GitHub Actions secrets/variables (managed in GitHub UI)
- No `.env` files committed; `.gitignore` excludes `.env*` (allows `.env.example`)

## Webhooks & Callbacks

**Incoming:**
- None — application has no HTTP server; Tauri webview hosts only static frontend assets

**Outgoing:**
- `upgrade-robot-controller.sh` performs unauthenticated GETs to `api.github.com` (release metadata) and to `github.com/.../releases/download/...` (`.flatpak` + `.sha256`)
- BLE writes to BT24 peripheral characteristic via `peripheral.write(..., WriteType::WithoutResponse)` in `apps/frontend/src-tauri/src/ble/mod.rs:208-215`
- No outbound HTTP from the running desktop app itself

## Tauri IPC Surface (internal but contract-shaped)

Although strictly internal, the Rust ↔ JS contract is the project's primary "API":

**Commands (Rust → JS-callable via `invoke()`):** registered in `apps/frontend/src-tauri/src/lib.rs:54-58`
- `ble_connect()` - Scans for BT24, connects, returns `Result<(), String>` (`apps/frontend/src-tauri/src/ble/mod.rs:31`)
- `ble_disconnect()` - Disconnects current peripheral (`apps/frontend/src-tauri/src/ble/mod.rs:155`)
- `ble_send({ command: String })` - Writes single-char command; rejects if `command.len() != 1` (`apps/frontend/src-tauri/src/ble/mod.rs:175`)

**Events (Rust → JS via `listen()`):**
- `ble-state-changed` with string payload `"connecting"` | `"connected"` | `"disconnected"` — consumed by `useBluetooth` in `apps/frontend/src/hooks/use-bluetooth.ts:48`
- `gamepad-connected` with `{ name: string }` — consumed by `useGamepad` in `apps/frontend/src/hooks/use-gamepad.ts:36`
- `gamepad-disconnected` with `{ name: string }`
- `gamepad-direction` with `{ direction: "F" | "B" | "L" | "R" | "S" }` — consumed in `apps/frontend/src/hooks/use-gamepad.ts:30`

**Web Bluetooth fallback (browser-only path):**
- `apps/frontend/src/hooks/use-bluetooth.ts:87-121` uses `navigator.bluetooth.requestDevice({ filters: [{ name: "BT24" }], optionalServices: [SERVICE_UUID] })` when not running under Tauri (`window.__TAURI_INTERNALS__` absent). Unsupported on WebKitGTK/SteamOS — flagged via `"unsupported"` state.

---

*Integration audit: 2026-05-14*

# Technology Stack

**Analysis Date:** 2026-05-14

## Languages

**Primary:**
- TypeScript ~5.9.3 - Frontend React UI in `apps/frontend/src/` and ESLint config in `packages/eslint-config/src/`
- Rust (edition 2021) - Native Tauri shell in `apps/frontend/src-tauri/src/` (BLE + gamepad + IPC)

**Secondary:**
- Bash - Build / deploy scripts: `flatpak/build.sh`, `flatpak/docker-build.sh`, `upgrade-robot-controller.sh`
- YAML - Flatpak manifest `flatpak/com.ks0555.robotcontroller.yaml`, CI workflows under `.github/workflows/`
- TOML - Rust manifest `apps/frontend/src-tauri/Cargo.toml`, Tauri permissions in `apps/frontend/src-tauri/permissions/*.toml`
- JSON - `apps/frontend/src-tauri/tauri.conf.json`, `turbo.json`, capability manifests
- CSS (Tailwind v4) - `apps/frontend/src/index.css` (theme via `@theme` block; no `tailwind.config.*` file)

## Runtime

**Environment:**
- Node.js v24 - Pinned by `.nvmrc` (engines field requires `>=18.0.0` in `package.json`)
- Rust stable toolchain - Build uses `dtolnay/rust-toolchain@stable` in `.github/workflows/build.yml`
- Tauri v2 runtime hosts WebKitGTK 4.1 (Linux/SteamOS) or platform-native webview

**Package Manager:**
- pnpm 10.29.3 (pinned via `"packageManager"` field in `/Users/pauvelascogarrofe/Documents/KS0555-Steam-Deck-Controller-2/package.json`)
- Lockfile: present at `/Users/pauvelascogarrofe/Documents/KS0555-Steam-Deck-Controller-2/pnpm-lock.yaml` (178KB)
- Workspaces defined in `/Users/pauvelascogarrofe/Documents/KS0555-Steam-Deck-Controller-2/pnpm-workspace.yaml` (`apps/*`, `packages/*`)
- Cargo lockfile: `/Users/pauvelascogarrofe/Documents/KS0555-Steam-Deck-Controller-2/apps/frontend/src-tauri/Cargo.lock`

## Frameworks

**Core:**
- Tauri 2.11.0 (Rust crate) / @tauri-apps/api 2.11.0 (JS) / @tauri-apps/cli 2.11.1 - Desktop app shell, IPC bridge, capability/permission system
  - Crate config: `apps/frontend/src-tauri/Cargo.toml`
  - Entry: `apps/frontend/src-tauri/src/main.rs` → `apps/frontend/src-tauri/src/lib.rs`
- React 19.2.6 + react-dom 19.2.6 - UI library, entry `apps/frontend/src/main.tsx` → `apps/frontend/src/app.tsx`
- Vite 8.0.11 - Dev server / bundler, config `apps/frontend/vite.config.ts` (fixed port 5173)
- Tailwind CSS 4.2.4 with `@tailwindcss/vite` 4.2.4 plugin - Styling, theme defined inline in `apps/frontend/src/index.css`
- Turborepo 2.9.10 - Monorepo task orchestration, config `turbo.json`

**Testing:**
- Vitest 4.1.5 (frontend) - Runner config `apps/frontend/vitest.config.ts` (jsdom environment)
- @testing-library/react 16.3.2 + @testing-library/jest-dom 6.9.1 - React component tests
- jsdom 29.1.1 - Browser-like DOM for unit tests
- Cargo `#[cfg(test)]` blocks + integration tests in `apps/frontend/src-tauri/tests/*.rs` (9 files)

**Build/Dev:**
- tsup 8.5.1 - Bundles `packages/eslint-config` (config: `packages/eslint-config/tsup.config.ts`)
- @vitejs/plugin-react 6.0.1 - React + Fast Refresh for Vite
- ESLint 10.3.0 (flat config) - Root config `eslint.config.ts`; React-specific config `packages/eslint-config/src/react.ts`
  - Plugins: `@typescript-eslint/eslint-plugin` 8.59.2, `@eslint/json` 1.2.0, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-perfectionist` (sort-imports)
- Prettier 3.8.3 - Config `.prettierrc` (`{ "semi": false, "printWidth": 120 }`)
- `just` (justfile) - Recipe runner; `just check` = lint → typecheck → test
- lefthook 2.1.6 - Git hooks; config `lefthook.yml` (runs format, lint, typecheck pre-commit; commitlint commit-msg)
- @husky shims at `.husky/commit-msg` and `.husky/pre-commit` delegate to lefthook
- commitlint 21 - `commitlint.config.ts` extends `@commitlint/config-conventional`

## Key Dependencies

**Critical (Rust):**
- btleplug 0.12.0 - Cross-platform Bluetooth Low Energy client (`apps/frontend/src-tauri/src/ble/mod.rs`). On Linux talks BlueZ over D-Bus; on macOS uses CoreBluetooth.
- gilrs 0.11.1 (features = ["serde"]) - Gamepad input (`apps/frontend/src-tauri/src/gamepad/mod.rs`); on Linux uses evdev/udev; on Steam Deck reads `/dev/input/event*`. Linux target also pins `gilrs` explicitly with `serde` feature.
- tokio 1.0 (features = ["macros", "rt-multi-thread"]) - Async runtime for BLE scan/connect/write
- futures 0.3 - Stream combinators (`StreamExt`) used in BLE event handling
- serde 1.0 + serde_json 1.0 - IPC payload serialization between Rust and JS
- thiserror 2.0 - Declared but not yet used in `src/`
- uuid 1.0 - Parses BLE characteristic UUID `0000ffe1-0000-1000-8000-00805f9b34fb`
- tauri-build 2.6.0 - Build-time codegen (`apps/frontend/src-tauri/build.rs`)
- (resolved transitively in Cargo.lock: `wry` 0.55.1 webview wrapper, `tauri-runtime` 2.11.1)

**Critical (JS):**
- @tauri-apps/api 2.11.0 - `invoke()` and `listen()` used in `apps/frontend/src/hooks/use-bluetooth.ts` and `apps/frontend/src/hooks/use-gamepad.ts`
- @types/web-bluetooth 0.0.21 - Type definitions for Web Bluetooth fallback path in `useBluetooth`

**Infrastructure:**
- @ks0555/tsconfig (workspace:*) - Shared TypeScript configs (`packages/tsconfig/{tsconfig,tsconfig.react,tsconfig.node}.json`)
- @ks0555/eslint-config (workspace:*) - Shared ESLint config consumed via `apps/frontend/package.json` lint script (`--config ../../packages/eslint-config/src/react.ts`)

## Configuration

**Environment:**
- No `.env`/`.env.example` files are committed (none present at repo root)
- `.gitignore` blocks `.env*` (allows `.env.example`)
- Runtime environment variables (set in Rust at startup in `apps/frontend/src-tauri/src/lib.rs`):
  - `WEBKIT_DISABLE_COMPOSITING_MODE=1` — forced on for Gamescope/WebKitGTK compat (also set early in `main.rs`)
  - `DBUS_SYSTEM_BUS_ADDRESS=unix:path=/run/host/run/dbus/system_bus_socket` — only set when NOT in Flatpak AND when the SteamOS socket exists, used by btleplug → BlueZ
  - `FLATPAK_ID` / `/.flatpak-info` — read (not written) to detect Flatpak container
  - `TAURI_ENV_PLATFORM` / `TAURI_ENV_DEBUG` — read in `vite.config.ts` for build target/minify selection

**Build:**
- `apps/frontend/vite.config.ts` - Vite dev server (port 5173, `strictPort`, ignores `src-tauri/**` in watcher); build target `chrome105` on Windows, `safari15` elsewhere (WebKitGTK compatibility)
- `apps/frontend/vitest.config.ts` - Vitest with jsdom + `setupTests.ts`
- `apps/frontend/tsconfig.json` - Extends `@ks0555/tsconfig/tsconfig.react.json`; `paths: { "@/*": ["./src/*"] }`
- `packages/tsconfig/tsconfig.json` - Base: `target: ES2022`, `strict: true`, `noUncheckedIndexedAccess: true`, `moduleResolution: bundler`
- `apps/frontend/src-tauri/tauri.conf.json` - Bundle target: `deb` only; window 1280×800, decorations off; CSP `default-src 'self'; connect-src 'self' http://localhost:5173 ws://localhost:5173; ...`
- `apps/frontend/src-tauri/capabilities/main.json` - Capability `main-capability` grants `core:default`, `ble-connect`, `ble-disconnect`, `ble-send`, `ble-state-changed` to `main` window
- `apps/frontend/src-tauri/permissions/ble.toml` - Per-command Tauri v2 permissions for `ble_connect`, `ble_disconnect`, `ble_send`, and `ble-state-changed` event
- `apps/frontend/src-tauri/Info.plist` - `NSBluetoothAlwaysUsageDescription` for macOS dev runs
- `turbo.json` - Tasks `dev` (cache: false, persistent), `build` (outputs `dist/**`), `typecheck`, `lint`, `test`
- `eslint.config.ts` - Root flat config: global ignores + JSON linting via `@eslint/json`
- `packages/eslint-config/src/react.ts` - TS/TSX-targeted; loads React, react-hooks, perfectionist plugins; enforces `perfectionist/sort-imports`

## Platform Requirements

**Development:**
- macOS: Triggers CoreBluetooth permission prompt on first BLE scan (via `Info.plist`); structural-only Flatpak validation in `flatpak/build.sh`
- Linux (development host or CI): `libwebkit2gtk-4.1-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`, `libudev-dev`, `patchelf`, `flatpak`, `flatpak-builder` (installed in `.github/workflows/build.yml`)
- Rust stable + `tauri-cli` v2 (`cargo install tauri-cli --version "^2"`)
- pnpm 10.29.3 (enforced via `packageManager` field)
- Node 24 (`.nvmrc`)

**Production:**
- Target device: Steam Deck running SteamOS / Gamescope
- Distribution: Single-file Flatpak bundle (`RobotController-x86_64.flatpak`)
- Flatpak runtime: `org.freedesktop.Platform//24.08`, SDK `org.freedesktop.Sdk//24.08`, GL extension `org.freedesktop.Platform.GL.default` (see `flatpak/com.ks0555.robotcontroller.yaml`)
- Sandbox `finish-args`: Wayland + fallback X11 sockets, `--share=ipc`, `--device=dri`, `--share=network`, `--system-talk-name=org.bluez(.*)`, `--device=all` for gamepad evdev
- Target hardware: BT24 BLE module (characteristic UUID `0000ffe1-0000-1000-8000-00805f9b34fb`, service UUID `0000ffe0-0000-1000-8000-00805f9b34fb`) on Arduino-controlled robot

---

*Stack analysis: 2026-05-14*

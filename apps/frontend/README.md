<!-- generated-by: gsd-doc-writer -->

# @ks0555/frontend

Vite + React UI **and** Tauri shell for the Steam Deck Robot Controller. This package bundles both the TypeScript/React frontend (Vite dev server) and the Rust backend (Tauri v2 IPC shell). A single binary wraps everything — BLE via `btleplug`, gamepad input via `gilrs`, React UI in the WebView.

> **Part of the [KS0555 Steam Deck Robot Controller](../README.md) monorepo**

## Package Contents

| Directory                   | Purpose                                                               |
| --------------------------- | --------------------------------------------------------------------- |
| `src/`                      | React components, hooks, types, and Vite entry point (`main.tsx`)     |
| `src-tauri/`                | Rust shell: Tauri commands, BLE module, gamepad module, bundle config |
| `src-tauri/src/ble/`        | Bluetooth communication via `btleplug`                                |
| `src-tauri/src/gamepad/`    | Steam Deck gamepad input via `gilrs`                                  |
| `src-tauri/src/main.rs`     | Tauri command registration and state setup                            |
| `src-tauri/tauri.conf.json` | Window dimensions (1280×800), bundle targets, app metadata            |
| `src-tauri/Info.plist`      | macOS Bluetooth permission declaration                                |

## Running Locally

### From Monorepo Root

```bash
pnpm install
pnpm --filter @ks0555/frontend tauri:dev
```

This starts the Tauri dev shell with Vite hot-reload. The Rust code recompiles on save; the React UI reloads in the WebView.

### From Package Directory (rarely needed)

```bash
cd apps/frontend
pnpm tauri:dev
```

## Build Scripts

| Command            | Purpose                                                                       |
| ------------------ | ----------------------------------------------------------------------------- |
| `pnpm dev`         | Vite dev server (React only; used by `tauri:dev` as the frontend dev command) |
| `pnpm build`       | TypeScript check (`tsc -b`) + Vite production build → `dist/`                 |
| `pnpm tauri:dev`   | Launch Tauri dev shell with hot-reload (run from monorepo root)               |
| `pnpm tauri:build` | Build release binary + AppImage/DMG (macOS / Linux)                           |
| `pnpm typecheck`   | Run `tsc --noEmit` without emitting artifacts                                 |
| `pnpm lint`        | ESLint check using `@ks0555/eslint-config`                                    |
| `pnpm test`        | Run Vitest unit tests (`vitest run`)                                          |
| `pnpm preview`     | Preview built Vite output (production bundle)                                 |

## Frontend Layer

### Entry Point

`src/main.tsx` mounts the React app into a DOM element. `src/app.tsx` is the root component.

### Key Components

- **`ControlPad`** (`src/components/control-pad.tsx`) — Direction buttons and status display
- **`StatusBar`** (`src/components/status-bar.tsx`) — Connection state, gamepad input feedback
- **`ErrorBoundary`** (`src/components/error-boundary.tsx`) — Graceful error UI

### Hooks

- **`useBlueooth()`** (`src/hooks/use-bluetooth.ts`) — Wraps Tauri IPC calls for BLE scan, connect, write; subscribes to `ble-state-changed` events
- **`useGamepad()`** (`src/hooks/use-gamepad.ts`) — Subscribes to `gamepad-direction` events from Rust; manages local direction state

## Tauri Shell (Rust)

### Commands

The React UI invokes these Tauri commands via `invoke()`:

| Command          | Payload               | Returns                                 |
| ---------------- | --------------------- | --------------------------------------- |
| `ble_scan`       | `{}`                  | `{ devices: [{ address, name }, ...] }` |
| `ble_connect`    | `{ address: string }` | `{}` (on success) or error              |
| `ble_write`      | `{ data: string }`    | `{}`                                    |
| `ble_disconnect` | `{}`                  | `{}`                                    |

### Events

The Rust side emits these events via `listen()`:

| Event               | Payload                                                                                      | When                                |
| ------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------- |
| `ble-state-changed` | `{ status: "idle" \| "scanning" \| "connecting" \| "connected" \| "error", error?: string }` | Whenever BLE state changes          |
| `gamepad-direction` | `{ direction: "up" \| "down" \| "left" \| "right" \| "neutral" }`                            | When left stick moves past deadzone |

### BLE Module (`src-tauri/src/ble/mod.rs`)

- Scans for BLE devices (filters for devices with "BT24" or "Arduino" in name)
- Connects to a peripheral and finds the notify/write characteristic
- Writes single-character commands: `F` (forward), `B` (backward), `L` (left), `R` (right), `S` (stop)
- Emits `ble-state-changed` events on status transitions

### Gamepad Module (`src-tauri/src/gamepad/mod.rs`)

- Listens to gamepad input via `gilrs` (native evdev on Linux/SteamOS, IOKit on macOS)
- Left stick deadzone: `0.15`
- On direction change, emits `gamepad-direction` event
- Maps directions to single characters for BLE write

## Architecture

```
src/main.tsx (React entry)
        ↓
src/app.tsx (root component)
        ├── ControlPad (UI for direction + status)
        ├── StatusBar (connection state)
        └── useBlueooth() + useGamepad() (Tauri IPC subscriptions)
                ↓
Tauri IPC Bridge (invoke + listen)
                ↓
src-tauri/src/main.rs (command registry)
        ├── ble/mod.rs (btleplug, scan/connect/write)
        └── gamepad/mod.rs (gilrs, direction emission)
```

## Key Configuration

| File                   | Setting                                             | Why                                                                   |
| ---------------------- | --------------------------------------------------- | --------------------------------------------------------------------- |
| `vite.config.ts`       | `port: 5173`                                        | Tauri dev server connects here; must match `tauri.conf.json` `devUrl` |
| `vite.config.ts`       | `watch.ignored: ['**/src-tauri/**']`                | Rust changes don't reload the Vite dev server                         |
| `tauri.conf.json`      | `window.width: 1280, height: 800`                   | Steam Deck portrait layout (rotated landscape)                        |
| `tauri.conf.json`      | `bundle.linux.appimage.bundleMediaFramework: false` | Keeps AppImage under 100 MB (no GStreamer)                            |
| `tauri.conf.json`      | `bundle.macOS.minimumSystemVersion: "11.0"`         | Supports older Intel Macs for dev                                     |
| `src-tauri/Info.plist` | `NSBluetoothAlwaysUsageDescription`                 | macOS Bluetooth permission text                                       |

## Testing

```bash
pnpm test
```

Runs Vitest on `*.test.ts` and `*.test.tsx` files:

- `src/App.test.tsx` — React component rendering
- `src/components/*.test.tsx` — Component unit tests
- `src/hooks/*.test.ts` — Hook logic tests
- `src/tauri-frontend.test.ts` — Tauri IPC integration tests

## Dependencies

| Package                | Role                                     |
| ---------------------- | ---------------------------------------- |
| `@tauri-apps/api`      | Frontend → Rust IPC (`invoke`, `listen`) |
| `react`, `react-dom`   | UI framework                             |
| `@vitejs/plugin-react` | JSX transformation                       |
| `@tailwindcss/vite`    | Tailwind CSS integration                 |
| `typescript`           | Type checking                            |
| `vitest`               | Unit test runner                         |

**Rust dependencies** are in `src-tauri/Cargo.toml`:

- `tauri` v2.11.0 — IPC + window shell
- `btleplug` v0.12.0 — Cross-platform BLE
- `gilrs` v0.11.1 — Gamepad input
- `tokio` v1 — Async runtime for BLE/gamepad event loops

## See Also

- **[../README.md](../README.md)** — Monorepo overview, install on Steam Deck, macOS/Linux dev setup
- **[../../docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md)** — System-level architecture, data flow, key abstractions
- **[../../docs/RUNNING.md](../../docs/RUNNING.md)** — Per-device detailed run instructions (Steam Deck Desktop/Gaming Mode, macOS, Linux)
- **[../../DEVELOPMENT.md](../../DEVELOPMENT.md)** — Development setup, branch conventions, PR process
- **[../../TESTING.md](../../TESTING.md)** — Test framework setup, coverage, CI integration

<!-- generated-by: gsd-doc-writer -->

# Configuration

This document describes how to configure the Robot Controller application for development, testing, and deployment across different platforms.

## Environment Variables

The application uses environment variables for platform-specific Bluetooth daemon discovery and WebKit rendering. Most defaults are automatically set by the Rust shell (`src-tauri/src/main.rs`), but you can override them if needed.

| Variable                          | Required | Default                  | Platform          | Description                                                                                                                                                                                       |
| --------------------------------- | -------- | ------------------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DBUS_SYSTEM_BUS_ADDRESS`         | No       | Auto-detected on SteamOS | Linux (SteamOS)   | D-Bus system socket address. On SteamOS, automatically set to `unix:path=/run/host/run/dbus/system_bus_socket` if unset. **btleplug** uses this to communicate with BlueZ (the Bluetooth daemon). |
| `WEBKIT_DISABLE_COMPOSITING_MODE` | No       | `1` (auto-set)           | Linux (Gamescope) | Disables WebKitGTK GPU compositing under SteamOS Gamescope, preventing crashes in Gaming Mode. Automatically set to `1` by the launcher if unset.                                                 |
| `VITE_WS_URL`                     | No       | `ws://localhost:3001/ws` | All               | Frontend development WebSocket URL (legacy; retained for compatibility). Not used in Tauri v2 IPC-based architecture.                                                                             |

### Required vs Optional

- **DBUS_SYSTEM_BUS_ADDRESS**: Not required — automatically detected and set by the Rust shell on SteamOS.
- **WEBKIT_DISABLE_COMPOSITING_MODE**: Not required — automatically set by the Rust shell on Linux when running under Gamescope.
- **VITE_WS_URL**: Not required — legacy variable, not active in current Tauri architecture.

No environment variables cause application startup failure if absent. All critical defaults are handled in code.

## Workspace Configuration

The project uses **pnpm workspaces** for monorepo structure. Configuration is defined in `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### Workspace Packages

| Path                     | Type        | Purpose                                                          |
| ------------------------ | ----------- | ---------------------------------------------------------------- |
| `apps/frontend`          | Application | React + Tauri v2 desktop shell for BLE control and gamepad input |
| `packages/eslint-config` | Config      | ESLint flat config shared across workspaces                      |
| `packages/tsconfig`      | Config      | TypeScript base configs (base, React, Node.js)                   |
| `packages/ui`            | Library     | Placeholder for future shared component library                  |

### Build Orchestration

Build tasks are orchestrated by **Turbo** (`turbo.json`). Key tasks:

| Task        | Description                                                       | Outputs   |
| ----------- | ----------------------------------------------------------------- | --------- |
| `dev`       | Start Tauri dev server (hot reload); non-cached, persistent       | —         |
| `build`     | Compile TypeScript and bundle frontend; caches outputs to `dist/` | `dist/**` |
| `typecheck` | Run TypeScript type checking                                      | —         |
| `lint`      | Run ESLint on workspace                                           | —         |
| `test`      | Run test suite                                                    | —         |

**pnpm Lockfile**: The project enforces `preferFrozenLockfile: true`, meaning `pnpm install` will fail if `pnpm-lock.yaml` is out of date. Always run `pnpm install` (not `npm install`) to respect the lockfile.

## TypeScript Configuration

TypeScript is configured in `tsconfig.json` (base) and extended by workspace packages:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### Key Settings

- **`strict: true`**: Enables all strict type-checking options. No implicit `any` types allowed.
- **`noUncheckedIndexedAccess: true`**: Indexing into arrays/records without bounds checking returns `T | undefined` instead of `T`. Callers must handle the undefined case.
- **`target: ES2022`**: Compile to ES2022 (modern JavaScript).
- **`moduleResolution: bundler`**: Use bundler-friendly module resolution for Vite.

### Path Aliases

The frontend app (`apps/frontend/tsconfig.json`) defines:

```json
{
  "paths": {
    "@/*": ["./src/*"]
  }
}
```

This allows imports like `import { Button } from '@/components/button'` instead of relative paths.

## Tauri Bundle Configuration

The Tauri application is configured in `apps/frontend/src-tauri/tauri.conf.json`. Key settings:

```json
{
  "productName": "Robot Controller",
  "version": "0.1.0",
  "identifier": "com.ks0555.robotcontroller",
  "app": {
    "windows": [
      {
        "title": "Robot Controller",
        "width": 1280,
        "height": 800,
        "resizable": true,
        "decorations": false,
        "center": true
      }
    ],
    "security": {
      "csp": "default-src 'self'; connect-src 'self' http://localhost:5173; script-src 'self' 'unsafe-inline'"
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": ["icons/icon.png"],
    "linux": {
      "appimage": {
        "bundleMediaFramework": false
      }
    },
    "macOS": {
      "minimumSystemVersion": "11.0"
    }
  }
}
```

### Bundle Details

- **Window Size**: 1280×800 pixels (fixed, resizable after initial render).
- **Decorations**: Disabled (`"decorations": false`) — custom title bar handled by React.
- **Linux AppImage**: `bundleMediaFramework: false` keeps the binary small (~100 MB) by excluding GStreamer. Suitable for Steam Deck's storage constraints.
- **macOS Target**: Minimum system version 11.0 (Big Sur). Builds universal binaries (Intel + Apple Silicon).
- **CSP**: Allows local resources, WebSocket at dev server, and inline scripts for React.

## Rust Dependencies

The Rust shell (`apps/frontend/src-tauri/Cargo.toml`) pins specific crate versions:

| Crate         | Version | Features                    | Purpose                                                                                               |
| ------------- | ------- | --------------------------- | ----------------------------------------------------------------------------------------------------- |
| `tauri`       | 2.11.0  | `default`, `devtools`       | Desktop app shell and IPC                                                                             |
| `tauri-build` | 2.6.0   | —                           | Build-time Tauri integration                                                                          |
| `btleplug`    | 0.12.0  | —                           | Cross-platform Bluetooth Low Energy client (BlueZ on Linux, CoreBluetooth on macOS, WinRT on Windows) |
| `gilrs`       | 0.11.1  | `serde`                     | Gamepad input (evdev/udev on Linux, IOKit on macOS)                                                   |
| `tokio`       | 1.0     | `macros`, `rt-multi-thread` | Async runtime for BLE and gamepad event loops                                                         |
| `futures`     | 0.3     | —                           | Future combinators for async patterns                                                                 |
| `serde`       | 1.0     | `derive`                    | Serialization/deserialization for Rust ↔ Frontend data                                                |
| `serde_json`  | 1.0     | —                           | JSON codec for Tauri IPC                                                                              |
| `uuid`        | 1.0     | —                           | UUID generation for BLE device tracking                                                               |

### Platform-Specific Dependencies

Linux builds enable explicit `gilrs` with `serde` support for robust gamepad input via evdev.

## Node.js and pnpm Configuration

### Node.js Version

The project requires **Node.js >= 18.0.0** and pins an exact version via `.nvmrc`:

```
v24
```

Use `nvm use` (or `fnm use` / `asdf local`) to activate the pinned version before running any pnpm commands.

### pnpm Version

The project enforces **pnpm 10.29.3** via the `packageManager` field in `package.json`:

```json
{
  "packageManager": "pnpm@10.29.3"
}
```

pnpm will reject installations with a different version. If you have an older or newer pnpm installed globally, use `npm install -g pnpm@10.29.3` to update.

## Vite Configuration

The frontend dev server is configured in `apps/frontend/vite.config.ts`:

```typescript
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  clearScreen: false, // Preserve Rust errors in terminal
  server: {
    strictPort: true, // Tauri expects fixed port 5173
    port: 5173, // Must match devUrl in tauri.conf.json
    watch: {
      ignored: ["**/src-tauri/**"], // Don't reload on Rust changes
    },
  },
})
```

### Key Settings

- **Port 5173**: Hard-coded by Tauri's dev config. If this port is in use, `tauri:dev` will fail.
- **strictPort**: Vite will not fall back to another port if 5173 is unavailable.
- **watch.ignored**: Rust changes don't trigger a browser reload (Rust is hot-reloaded separately by Tauri).

## macOS Permissions

On macOS, the application requests Bluetooth permission via `Info.plist`:

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>Robot Controller uses Bluetooth Low Energy to send drive commands to the BT24 module on your Arduino robot.</string>
```

The first time the app launches, users see a system dialog asking for Bluetooth access. Without this permission, **btleplug** cannot scan or connect to BLE devices.

## Platform-Specific Behavior

### Steam Deck (SteamOS)

The Rust shell automatically sets:

```rust
DBUS_SYSTEM_BUS_ADDRESS=unix:path=/run/host/run/dbus/system_bus_socket
WEBKIT_DISABLE_COMPOSITING_MODE=1
```

This works around two SteamOS quirks:

1. BlueZ's D-Bus socket is mounted in a container namespace.
2. WebKitGTK crashes when compositing is enabled under Gamescope.

AppImage builds omit GStreamer (`bundleMediaFramework: false`) to keep artifact size under 100 MB.

### macOS

The app is distributed as a universal DMG containing both Intel (x86_64) and Apple Silicon (aarch64) binaries. **CoreBluetooth** is used automatically by **btleplug** instead of BlueZ.

### Linux Desktop

On standard Linux (not SteamOS), the app uses **BlueZ** via D-Bus. The app requires `libwebkit2gtk-4.1` and `libudev` at runtime.

## CI/CD Environment Variables

The build workflow (`.github/workflows/build.yml`) sets platform-specific variables:

- **Linux (x86_64 + aarch64)**: `APPIMAGE_EXTRACT_AND_RUN=1` (extracts AppImage content for bundling in CI)
- **macOS**: None required (universal binary built with `--target universal-apple-darwin`)

## Summary Table

| Component           | Config File                               | Key Setting                                          |
| ------------------- | ----------------------------------------- | ---------------------------------------------------- |
| Node.js             | `.nvmrc`                                  | `v24`                                                |
| pnpm                | `package.json`                            | `"packageManager": "pnpm@10.29.3"`                   |
| TypeScript          | `packages/tsconfig/tsconfig.json`         | `strict: true`, `noUncheckedIndexedAccess: true`     |
| Vite                | `apps/frontend/vite.config.ts`            | Port `5173`, disabled watch on Rust files            |
| Tauri               | `apps/frontend/src-tauri/tauri.conf.json` | Window 1280×800, no media framework (Linux)          |
| Build Orchestration | `turbo.json`                              | Task caching and dependency graph                    |
| Workspaces          | `pnpm-workspace.yaml`                     | `apps/*`, `packages/*`                               |
| Rust                | `apps/frontend/src-tauri/Cargo.toml`      | btleplug 0.12.0, gilrs 0.11.1, tokio 1, tauri 2.11.0 |

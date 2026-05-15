# Robot Controller — System Architecture

## Overview

Single Tauri v2 desktop application. Rust backend owns BLE (`btleplug`) and gamepad (`gilrs`). React frontend communicates via Tauri IPC (`invoke` / `listen`). Packaged as a Flatpak for Steam Deck distribution. No separate backend process, no `rfcomm`, no Chrome flags.

## Build Chain

1. **Rust + Tauri → .deb**: `cargo tauri build --bundles deb` compiles the Rust binary, bundles the Vite-built React frontend, and packages everything into a Debian package.
   - Binary: `apps/frontend/src-tauri/target/release/bundle/deb/robot-controller_*.deb`
   - Tauri CLI v2 (stock from crates.io, no fork)
   - Frontend built via `pnpm build` (Vite + React + TypeScript)

2. **.deb → Flatpak**: The Flatpak manifest (`flatpak/com.ks0555.robotcontroller.yaml`) uses a `type: file` source to ingest the `.deb`, then extracts it with `ar -x` + `tar -xf`. Build-commands install the binary, desktop file, icons, and metainfo to Flatpak-standard paths under `/app/`.

## Flatpak Packaging

### Manifest

- **Location:** `flatpak/com.ks0555.robotcontroller.yaml`
- **Runtime:** `org.gnome.Platform//48`
- **SDK:** `org.gnome.Sdk//48`
- **Extension:** `org.freedesktop.Platform.GL.default`
- **Command:** `robot-controller` (the binary name inside the sandbox)

### Deb-Extract Pattern

The **deb-extract** pattern is how the Flatpak consumes the `.deb` produced by `cargo tauri build --bundles deb`. The manifest uses Flatpak's `buildsystem: simple` with inline shell commands:

- `ar -x robot-controller.deb` — extract the Debian archive
- `tar -xf data.tar.*` — unpack the filesystem tree
- `install -Dm755` / `install -Dm644` — place files in Flatpak paths
- Desktop file is renamed to `com.ks0555.robotcontroller.desktop` and its `Icon=` line is updated

### AppStream Metainfo

- **Location:** `flatpak/com.ks0555.robotcontroller.metainfo.xml`
- Provides application metadata (name, summary, description, screenshots, categories) for software centers and the desktop shell.

## Sandbox Model

Flatpak runs the application in a container with strictly controlled access to host resources. Every permission is explicitly requested via `finish-args` in the manifest.

### Display

| finish-arg                                | Purpose                                                                            |
| ----------------------------------------- | ---------------------------------------------------------------------------------- |
| `--socket=wayland`                        | Native Wayland rendering on Steam Deck (Gamescope)                                 |
| `--socket=fallback-x11`                   | X11 fallback for non-Wayland desktops                                              |
| `--share=ipc`                             | Shared memory for X11/Wayland performance                                          |
| `--device=dri`                            | Direct Rendering Infrastructure for GPU access                                     |
| `--env=WEBKIT_DISABLE_COMPOSITING_MODE=1` | Disable WebKit compositing bypass (belt-and-suspenders: also set in lib.rs and CI) |

### BLE (Bluetooth Low Energy)

| finish-arg                       | Purpose                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| `--system-talk-name=org.bluez`   | Allow D-Bus calls to BlueZ on the system bus (btleplug uses D-Bus, not AF_BLUETOOTH)  |
| `--system-talk-name=org.bluez.*` | Wildcard for BlueZ sub-interfaces (adapter, device, GATT)                             |
| `--allow=bluetooth`              | AF_BLUETOOTH socket permission (supplementary; btleplug may use it on some platforms) |
| `--share=network`                | Network access (BlueZ D-Bus sometimes requires it for discovery)                      |

### Gamepad

| finish-arg       | Purpose                                                              |
| ---------------- | -------------------------------------------------------------------- |
| `--device=input` | Read access to `/dev/input/event*` for gilrs evdev gamepad detection |

**Requirement:** Flatpak ≥ 1.15.6 for `--device=input`. SteamOS 3.6+ ships Flatpak 1.15.8+.

### Anti-Feature Checklist

The manifest includes a comment block at the top listing permissions that are deliberately NOT requested:

- `--filesystem=home` — Unnecessary sandbox escape
- `--device=bluetooth` — Wrong stack (AF_BLUETOOTH not D-Bus)
- `--talk-name=org.bluez` — Wrong bus (session, not system)
- `--socket=session-bus` — Not needed for this app
- `--socket=system-bus` — Over-broad; `--system-talk-name` is more targeted (principle of least privilege)

## D-Bus Gate (`in_flatpak()`)

When running inside a Flatpak sandbox, the application must NOT attempt to rewrite the D-Bus system bus socket or set `DBUS_SYSTEM_BUS_ADDRESS` — Flatpak provides its own D-Bus proxy.

### Detection (belt-and-suspenders)

```rust
// apps/frontend/src-tauri/src/lib.rs
fn in_flatpak() -> bool {
    std::env::var("FLATPAK_ID").is_ok() || std::path::Path::new("/.flatpak-info").exists()
}
```

Two independent checks:

1. `FLATPAK_ID` environment variable — set by Flatpak to the app ID (`com.ks0555.robotcontroller`)
2. `/.flatpak-info` file — always present inside a Flatpak sandbox

### Gate Logic

The entire D-Bus rewrite block (SteamOS detection, Gamescope socket path, `DBUS_SYSTEM_BUS_ADDRESS` override) is gated behind `!in_flatpak()`. When running as a Flatpak:

- Flatpak's D-Bus proxy handles all `org.bluez` communication transparently
- Setting `DBUS_SYSTEM_BUS_ADDRESS` would break the proxy and cause BLE to fail silently

### Non-Flatpak Behavior

When NOT in Flatpak (native Linux, macOS):

- SteamOS detection: checks for `WEBKIT_DISABLE_COMPOSITING_MODE=1` env var
- Sets `DBUS_SYSTEM_BUS_ADDRESS` to Gamescope's system bus socket (`/run/host/run/dbus/system_bus_socket`)
- On macOS: `btleplug` uses CoreBluetooth (no D-Bus), `gilrs` uses IOKit (no evdev)

## Event Pipeline

### BLE Communication

```
React (use-bluetooth.ts)
  │ invoke("ble_connect") / invoke("ble_send", { command })
  ▼
Tauri IPC
  │ #[tauri::command]
  ▼
ble::connect() / ble::send()
  │ btleplug (BlueZ D-Bus on Linux, CoreBluetooth on macOS)
  ▼
BT24 Module ──UART──▶ Arduino
```

Events flow back through `emit("ble-state-changed", ...)`:

```
btleplug CentralEvent
  │ DeviceConnected / DeviceDisconnected
  ▼
ble::event_loop()
  │ app_handle.emit("ble-state-changed", payload)
  ▼
Tauri IPC
  │ listen("ble-state-changed", ...)
  ▼
React (use-bluetooth.ts)
```

### Gamepad Input

```
gilrs event loop (background thread)
  │ gilrs::next_event()
  ▼
Direction detection: Axis::LeftStickX/Y → deadzone (0.15) → F/B/L/R/S
  │ direction change guard (only emit on change)
  ▼
app_handle.emit("gamepad-direction", direction)
  │
  ▼
Tauri IPC
  │ listen("gamepad-direction", ...)
  ▼
React (use-gamepad.ts)
```

Connect/disconnect events:

```
gilrs::EventType::Connected → emit("gamepad-connected")
gilrs::EventType::Disconnected → emit("gamepad-disconnected")
```

Steam Deck detection: `gamepad.name().contains("Steam")` — prefers the built-in controller over external gamepads.

## Frontend Integration

### React Hooks

- **`use-bluetooth.ts`**: Calls `invoke("ble_connect")`, `invoke("ble_send", { command })`. Listens to `listen("ble-state-changed")` for state updates. Return shape: `{ connected, connecting, unsupported, connect, send }`.
- **`use-gamepad.ts`**: Listens to `listen("gamepad-direction")`, `listen("gamepad-connected")`, `listen("gamepad-disconnected")`. Return shape: `{ direction, gamepadConnected }`.

### Tauri Commands

| Command         | Signature                                 | Purpose                                |
| --------------- | ----------------------------------------- | -------------------------------------- |
| `ble_connect`   | `() -> Result<(), String>`                | Scan for BT24, connect, emit state     |
| `ble_send`      | `(command: String) -> Result<(), String>` | Write F/B/L/R/S to BT24 characteristic |
| `get_ble_state` | `() -> String`                            | Get current BLE connection state       |

### Vite Integration

- Dev server on fixed port 5173 (matches `devUrl` in `tauri.conf.json`)
- `vite.config.ts`: `clearScreen: false`, `strictPort: true`, watch ignores `src-tauri/`

## Monorepo Layout

```
apps/frontend/                     # Tauri app
├── src/
│   ├── app.tsx                    # App entry (VAL-08: locked, no edits)
│   ├── main.tsx                   # React mount
│   ├── components/
│   │   ├── control-pad.tsx        # Direction pad (VAL-08: locked)
│   │   └── status-bar.tsx         # Connection status (VAL-08: locked)
│   └── hooks/
│       ├── use-bluetooth.ts       # BLE state hook
│       └── use-gamepad.ts         # Gamepad direction hook
├── src-tauri/
│   ├── Cargo.toml                 # Rust dependencies + version
│   ├── tauri.conf.json            # Tauri window/bundle config
│   ├── icons/                     # App icons (all platforms)
│   ├── src/
│   │   ├── main.rs                # Tauri entrypoint
│   │   ├── lib.rs                 # Setup hook, in_flatpak(), D-Bus gate
│   │   ├── ble/mod.rs             # BLE scan/connect/send via btleplug
│   │   └── gamepad/mod.rs         # Gamepad polling via gilrs
│   ├── Info.plist                 # macOS Bluetooth permission description
│   └── ARCHITECTURE.md            # This file
├── index.html                     # Vite HTML entry
├── vite.config.ts                 # Vite + Tauri integration
└── package.json                   # Frontend deps + scripts
flatpak/
├── com.ks0555.robotcontroller.yaml    # Flatpak manifest
├── com.ks0555.robotcontroller.metainfo.xml  # AppStream metadata
├── build.sh                       # Local Flatpak build script
├── README.md                      # Flatpak contributor guide
├── VALIDATION-CHECKLIST.md        # On-device validation checklist
├── validation-reports/            # Dated validation reports (git-ignored)
├── validation-logs/               # Captured log files (git-ignored)
└── icons/                         # Flatpak icon files (32/128/256@2)
packages/
├── eslint-config/                 # Shared ESLint flat config
└── tsconfig/                      # Shared TypeScript config
.planning/                         # GSD planning artifacts (git-ignored in PR)
```

## Platform Support

| Platform             | BLE                             | Gamepad                            | Distribution      |
| -------------------- | ------------------------------- | ---------------------------------- | ----------------- |
| Steam Deck (SteamOS) | BlueZ D-Bus (via Flatpak proxy) | gilrs evdev (via `--device=input`) | `.flatpak` bundle |
| Linux (native)       | BlueZ D-Bus (direct)            | gilrs evdev (via udev)             | `.deb` or source  |
| macOS                | CoreBluetooth                   | gilrs IOKit                        | `.dmg`            |
| Windows              | Not supported                   | —                                  | —                 |

## Key Decisions

- **Flatpak runtime locked:** `org.gnome.Platform//48` (chosen in Phase 11, validated in Phase 14)
- **Sideload-only distribution:** `.flatpak` bundles from GitHub Releases — no Flathub publication, no OSTree remote. `flatpak install --user --reinstall` for upgrades.
- **Belt-and-suspenders Flatpak detection:** Both `FLATPAK_ID` env var AND `/.flatpak-info` file checked before D-Bus rewrite.
- **Single-binary:** One Tauri process, no separate backend. BLE and gamepad run in the same Rust binary.
- **app.tsx locked:** CI and pre-commit hooks enforce `git diff --exit-code` on `app.tsx`, `control-pad.tsx`, `status-bar.tsx`.

## References

- [flatpak/README.md](../../flatpak/README.md) — Flatpak build, install, and run guide
- [flatpak/com.ks0555.robotcontroller.yaml](../../flatpak/com.ks0555.robotcontroller.yaml) — Flatpak manifest
- [lib.rs](src/lib.rs) — `in_flatpak()` detection and D-Bus gate
- [ble/mod.rs](src/ble/mod.rs) — BLE implementation
- [gamepad/mod.rs](src/gamepad/mod.rs) — Gamepad implementation
- [Tauri v2 Documentation](https://v2.tauri.app/)
- [btleplug](https://github.com/deviceplug/btleplug)
- [gilrs](https://docs.rs/gilrs/)
- [Flatpak Documentation](https://docs.flatpak.org/)

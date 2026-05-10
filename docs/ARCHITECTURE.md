# Architecture

## System Overview

The Steam Deck Robot Controller is a single-process Tauri v2 desktop application that drives a Bluetooth robot from a gamepad. The Rust backend handles hardware I/O — BLE connectivity via `btleplug` and gamepad input via `gilrs` — while a React frontend in the Tauri WebView provides the user interface. Communication flows through Tauri's IPC layer using `invoke()` for commands and `listen()` for events. There is no separate backend server, no HTTP, no WebSocket; all state lives in the Rust shell for low-latency control. The app is distributed as a Flatpak bundle with sandbox permissions for BLE and gamepad access.

## Process Model

```
┌──────────────────────────────────────────────────────────────────┐
│  Flatpak Sandbox                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Single Tauri v2 Process (apps/frontend/src-tauri/src)      │  │
│  │                                                              │  │
│  │  ┌────────────────────────┐    ┌────────────────────────┐  │  │
│  │  │   Rust (Tokio)         │    │   React (Vite)         │  │  │
│  │  │  - BLE (btleplug)      │◄──►│   - UI Components      │  │  │
│  │  │  - Gamepad (gilrs)     │ IPC│   - Status Display     │  │  │
│  │  │  - Event loops         │    │   - Command Send       │  │  │
│  │  │  - State Management    │    │                        │  │  │
│  │  └────────────────────────┘    └────────────────────────┘  │  │
│  │        ▲            ▲                                        │  │
│  │        │            │                                        │  │
│  │    HW Input    HW Output                                     │  │
│  │        │            │                                        │  │
│  └────────┼────────────┼────────────────────────────────────────┘  │
└───────────┼────────────┼───────────────────────────────────────────┘
            │            │
            ▼            ▼
      ┌─────────────────────────────────────┐
      │  Hardware (Steam Deck / Mac / Linux)│
      │  - Gamepad input (via evdev/IOKit)  │
      │  - Bluetooth adapter (via BlueZ/    │
      │    CoreBluetooth/WinRT)             │
      └─────────────────────────────────────┘
            │                    │
            └────────┬───────────┘
                     ▼
      ┌─────────────────────────────────┐
      │  BT24 Bluetooth Module (DX-BT24)│
      │  (UART ↔ BLE bridge)            │
      └──────────────┬──────────────────┘
                     ▼
           ┌──────────────────┐
           │  Arduino Sketch  │
           │  (motor control) │
           └──────────────────┘
```

- **One process, one binary**: The Rust shell manages hardware state; React is purely presentational.
- **No separate backend**: All business logic runs inside the Tauri app process.
- **Flatpak sandbox**: The entire Tauri process is wrapped in a Flatpak sandbox that gates access to BLE D-Bus services, evdev gamepad devices, and display rendering.
- **Steam Deck special handling**: The D-Bus gate (`in_flatpak()`) ensures socket rewrites only happen outside Flatpak.

## Build Chain

1. **Rust + Tauri → .deb**: `cargo tauri build --bundles deb` compiles the Rust binary, bundles the Vite-built React frontend, and packages everything into a Debian package.
   - Binary: `apps/frontend/src-tauri/target/release/bundle/deb/robot-controller_*.deb`
   - Tauri CLI v2 (stock from crates.io, no fork)
   - Frontend built via `pnpm build` (Vite + React + TypeScript)

2. **.deb → Flatpak**: The Flatpak manifest (`flatpak/com.ks0555.robotcontroller.yaml`) uses a `type: file` source to ingest the `.deb`, then extracts it with `ar -x` + `tar -xf`. Build-commands install the binary, desktop file, icons, and metainfo to Flatpak-standard paths under `/app/`.

## Flatpak Packaging

### Manifest

- **Location:** `flatpak/com.ks0555.robotcontroller.yaml`
- **Runtime:** `org.freedesktop.Platform//24.08`
- **SDK:** `org.freedesktop.Sdk//24.08`
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
- SteamOS detection: checks for `DBUS_SYSTEM_BUS_ADDRESS` env var
- Sets `DBUS_SYSTEM_BUS_ADDRESS` to Gamescope's system bus socket (`/run/host/run/dbus/system_bus_socket`)
- On macOS: `btleplug` uses CoreBluetooth (no D-Bus), `gilrs` uses IOKit (no evdev)

## IPC Contract

The frontend and Rust shell communicate via Tauri's IPC bridge. All communication is serializable (JSON-compatible).

### Commands (Frontend → Rust)

| Command          | Invocation                                   | Signature                                | Returns                  | Purpose                                                      |
| ---------------- | -------------------------------------------- | ---------------------------------------- | ------------------------ | ------------------------------------------------------------ |
| `ble_connect`    | `await invoke('ble_connect')`                | `() → Result<(), String>`                | Success or error message | Scan for BT24 device, connect, store peripheral in state     |
| `ble_disconnect` | `await invoke('ble_disconnect')`             | `() → Result<(), String>`                | Success or error message | Disconnect from peripheral, clear state                      |
| `ble_send`       | `await invoke('ble_send', { command: 'F' })` | `(command: String) → Result<(), String>` | Success or error message | Write single-char command (F/B/L/R/S) to BT24 characteristic |

### Events (Rust → Frontend)

| Event                  | Payload                                             | Emitted By                            | Frequency                        | Purpose                            |
| ---------------------- | --------------------------------------------------- | ------------------------------------- | -------------------------------- | ---------------------------------- |
| `ble-state-changed`    | `"connecting"` \| `"connected"` \| `"disconnected"` | BLE command handlers + event listener | Per state change                 | Track BLE connection state         |
| `gamepad-direction`    | `{ direction: "F" \| "B" \| "L" \| "R" \| "S" }`    | Gamepad monitor thread                | Per direction change (coalesced) | Emit filtered left-stick direction |
| `gamepad-connected`    | `{ name: string }`                                  | Gamepad monitor thread                | Once on connect                  | Signal gamepad available           |
| `gamepad-disconnected` | `{ name: string }`                                  | Gamepad monitor thread                | Once on disconnect               | Signal gamepad unavailable         |

## BLE Data Flow

```
React Component
    │
    ▼ invoke('ble_connect')
─────────────────────────────
    │
    ▼ src/ble/mod.rs::ble_connect()
    1. Emit "connecting" event
    2. Create btleplug Manager (platform-aware)
    3. Get first Bluetooth adapter
    4. Start BLE scan (5 sec timeout)
    5. Listen for CentralEvent::DeviceDiscovered
    6. Filter peripherals by name "BT24"
    7. Call peripheral.connect()
    8. Store peripheral in Arc<Mutex<Option<Peripheral>>>
    9. Emit "connected" event
    │
    └──────────────────────────────────────────────────────────────┐
                                                                   │
                                               ┌─────────────────────┐
                                               │ BLE Peripheral      │
                                               │ (DX-BT24 device)    │
                                               └─────────────────────┘
                                                     │
                                               ▼ GATT Notify/Write
                                               UUID: 0000ffe1...
                                               (single ASCII char)
                                                     │
                                               ▼ UART → Arduino
```

### Connection Lifecycle

1. **Scan phase** (5 seconds)
   - Queries Bluetooth adapter for discoverable peripherals
   - Filters by name "BT24" (post-filter on Linux due to BlueZ quirks)
   - Stops scan on match

2. **Connect phase**
   - Calls `peripheral.connect()`
   - Stores the connected peripheral in `BleState` (Arc<Mutex>)
   - Emits "connected" event to frontend

3. **Disconnect phase**
   - Frontend calls `ble_disconnect`
   - Calls `peripheral.disconnect()`
   - Clears state
   - Emits "disconnected" event

4. **Event listener** (background task)
   - Spawned in `setup_event_listener()` during app init
   - Listens for `CentralEvent::DeviceDisconnected`
   - Auto-emits "disconnected" if BT24 device goes out of range

### Command Write

When React sends a direction (F/B/L/R/S):

```
React.send(direction)
    │
    ▼ invoke('ble_send', { command: direction })
    │
    ▼ src/ble/mod.rs::ble_send()
    1. Validate command length (single char)
    2. Retrieve peripheral from state
    3. Call peripheral.discover_services()
    4. Find characteristic UUID 0000ffe1...
    5. Convert command to ASCII bytes
    6. Write with WriteType::WithoutResponse
    └─► BT24 UART buffer ──► Arduino sketch
```

- **Single char only**: F (forward), B (backward), L (left), R (right), S (stop)
- **WriteType::WithoutResponse**: Fire-and-forget; no wait for ACK (lower latency)
- **Batching**: Coalesced direction events prevent redundant writes

## Gamepad Data Flow

```
Steam Deck / Mac / Linux gamepad hardware
    │ (evdev on Linux, IOKit on macOS)
    ▼
gilrs::Gilrs
    │
    ▼ src/gamepad/mod.rs::setup_gamepad_monitor()
    Spawned in a std::thread (not async; gilrs blocks)
    │
    ├─► Enumerate existing gamepads
    │   └─► Pick first (no name filter; Steam Deck varies)
    │
    └─► Loop: gilrs.next_event()
        │
        ├─► EventType::Connected
        │   └─► Emit "gamepad-connected" { name }
        │
        ├─► EventType::Disconnected
        │   └─► Emit "gamepad-disconnected" { name }
        │
        └─► EventType::AxisChanged(LeftStick axis)
            ├─► Read X, Y from left stick
            ├─► Apply deadzone (0.15)
            ├─► Convert to Direction (F/B/L/R/S)
            ├─► Guard: only emit if direction changed
            └─► Emit "gamepad-direction" { direction }

React Hook: useGamepad()
    │ listen('gamepad-direction')
    ▼ listen('gamepad-connected')
    │ listen('gamepad-disconnected')
    ▼
Update state, trigger command send
```

### Direction Logic

The left-stick input is mapped to five directions with a **0.15 deadzone**:

```
      F (forward, y < -0.15)
      │
  L ──┼── R   (left/right, x < -0.15 or x > 0.15)
      │
      B (backward, y > 0.15)

S (stop) when |x| < 0.15 AND |y| < 0.15
```

- **Dominance**: If both axes exceed deadzone, the stronger axis wins (e.g., (0.8, 0.1) → R).
- **Coalescing**: Direction changes are tracked in `last_direction`; only new directions emit events.
- **Threading**: Spawned in `std::thread`, not `tokio`. Each iteration sleeps 8ms to avoid busy-loop.

## Frontend Hooks

### `useBluetooth()`

Located in `apps/frontend/src/hooks/use-bluetooth.ts`.

```ts
const {
  connected: boolean,      // true if "connected"
  connecting: boolean,     // true if "connecting"
  unsupported: false,      // always false (not using Web BLE)
  connect: () => Promise,  // invoke('ble_connect')
  send: (cmd: string) => void  // invoke('ble_send', { command })
} = useBluetooth()
```

- **Event subscription**: Listens to `ble-state-changed` and updates state.
- **Error handling**: On `connect()` failure, reverts state to "disconnected".
- **Cleanup**: Unlistens on unmount.

### `useGamepad()`

Located in `apps/frontend/src/hooks/use-gamepad.ts`.

```ts
const {
  direction: "F" | "B" | "L" | "R" | "S",  // current direction
  gamepadConnected: boolean,  // true if gamepad is connected
  isDeck: boolean             // true if Steam Deck detected (vendor ID check)
} = useGamepad()
```

- **Event subscription**: Listens to `gamepad-direction`, `gamepad-connected`, `gamepad-disconnected`.
- **Steam Deck detection**: Uses `navigator.getGamepads()` to check vendor ID + product ID or device name.
- **Auto-reset**: On disconnect, resets direction to S and clears isDeck flag.

## Platform-Specific Concerns

### Steam Deck (SteamOS)

**Flatpak sandbox**: The app runs inside a Flatpak container with:
- D-Bus proxy for BlueZ BLE access (`--system-talk-name=org.bluez`)
- evdev device access for gamepad input (`--device=input`)
- Wayland display for Gamescope compatibility

**WEBKIT_DISABLE_COMPOSITING_MODE=1**: Set unconditionally in `lib.rs` to bypass WebKitGTK's broken GPU compositing path under Gamescope. Also set via `finish-args` in the Flatpak manifest (belt-and-suspenders).

**D-Bus proxy via Flatpak**: Flatpak's D-Bus proxy handles `org.bluez` communication transparently. Inside the sandbox, `DBUS_SYSTEM_BUS_ADDRESS` must NOT be rewritten (gated by `in_flatpak()` in `lib.rs`).

### macOS

**Permissions** (`apps/frontend/src-tauri/Info.plist`):

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>This app needs Bluetooth access to control the robot.</string>
```

- First BLE scan triggers the system permission prompt.
- `btleplug` uses CoreBluetooth automatically.
- `gilrs` uses IOKit for gamepad detection.
- The app can be built from source via `cargo tauri build` (no Flatpak on macOS).

### Linux Desktop

- **btleplug** uses BlueZ automatically.
- **gilrs** uses evdev via udev for gamepad access.
- Distribution via `.deb` (from source build) or Flatpak.

## Directory Structure

```
apps/frontend/
├── src/                          # React frontend
│   ├── main.tsx                  # React entry point
│   ├── app.tsx                   # Main App component (locked)
│   ├── hooks/
│   │   ├── use-bluetooth.ts      # BLE IPC hook
│   │   └── use-gamepad.ts        # Gamepad event hook
│   ├── components/               # React UI components (locked)
│   │   ├── control-pad.tsx
│   │   └── status-bar.tsx
│   └── types.ts                  # TypeScript types (Direction type)
│
└── src-tauri/
    ├── src/
    │   ├── main.rs               # Rust entry point, Tauri init
    │   ├── lib.rs                # Setup hook, in_flatpak(), D-Bus gate
    │   ├── ble/
    │   │   ├── mod.rs            # BLE commands and connect loop
    │   │   └── state.rs          # BleState wrapper (Arc<Mutex>)
    │   └── gamepad/
    │       └── mod.rs            # Gamepad monitor thread
    ├── Cargo.toml                # Rust dependencies + version
    ├── tauri.conf.json           # Tauri window/bundle config
    └── Info.plist                # macOS Bluetooth permission
flatpak/
├── com.ks0555.robotcontroller.yaml        # Flatpak manifest
├── com.ks0555.robotcontroller.metainfo.xml # AppStream metadata
├── build.sh                               # Local Flatpak build script
├── README.md                              # Flatpak contributor guide
├── VALIDATION-CHECKLIST.md                # On-device validation checklist
├── validation-reports/                    # Dated validation reports
├── validation-logs/                       # Captured log files
└── icons/                                 # Flatpak icon files
packages/
├── eslint-config/               # Shared ESLint flat config
└── tsconfig/                    # Shared TypeScript config
.planning/                       # GSD planning artifacts
```

## Key Files

| Concern          | File                                                     | Responsibility                                                             |
| ---------------- | -------------------------------------------------------- | -------------------------------------------------------------------------- |
| Rust entry       | `apps/frontend/src-tauri/src/main.rs`                    | Initialize Tauri, spawn BLE/gamepad tasks, register commands               |
| Rust setup       | `apps/frontend/src-tauri/src/lib.rs`                     | Setup hook, in_flatpak() detection, D-Bus gate, env vars                   |
| BLE logic        | `apps/frontend/src-tauri/src/ble/mod.rs`                 | ble_connect, ble_disconnect, ble_send, connection loop, device discovery   |
| BLE state        | `apps/frontend/src-tauri/src/ble/state.rs`               | Arc<Mutex<Option<Peripheral>>> wrapper                                     |
| Gamepad monitor  | `apps/frontend/src-tauri/src/gamepad/mod.rs`             | std::thread gamepad event loop, direction logic, direction coalescing      |
| Tauri config     | `apps/frontend/src-tauri/tauri.conf.json`                | Window size (1280×800), bundle settings, app metadata                      |
| macOS plist      | `apps/frontend/src-tauri/Info.plist`                     | NSBluetoothAlwaysUsageDescription for Bluetooth permission                 |
| React entry      | `apps/frontend/src/main.tsx`                             | Root React render, error boundary                                          |
| React app        | `apps/frontend/src/app.tsx`                              | Main UI component, BLE/gamepad hook usage, command dispatch (locked)       |
| BLE hook         | `apps/frontend/src/hooks/use-bluetooth.ts`               | useBluetooth() — event subscriptions, command invocation                   |
| Gamepad hook     | `apps/frontend/src/hooks/use-gamepad.ts`                 | useGamepad() — event subscriptions, Steam Deck detection                   |
| Flatpak manifest | `flatpak/com.ks0555.robotcontroller.yaml`                | Flatpak manifest with finish-args, deb-extract build commands              |
| Flatpak metainfo | `flatpak/com.ks0555.robotcontroller.metainfo.xml`        | AppStream metadata for software centers                                    |
| Flatpak build    | `flatpak/build.sh`                                       | Local Flatpak builder (structural validation on macOS, full build on Linux)|
| CI pipeline      | `.github/workflows/build.yml`                            | Single build job: deb → flatpak → release upload                           |

## Entry Points

| Entry                           | Triggered By                             | Responsibility                                                                                                                           |
| ------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `src-tauri/src/main.rs::main()` | Tauri runtime (dev or packaged binary)   | Initialize Tauri builder, spawn BLE + gamepad background tasks, register IPC commands, enter event loop                                  |
| `src/main.tsx`                  | Vite dev server or WebView bundle        | Mount React app into DOM, wrap with StrictMode and ErrorBoundary                                                                         |
| `app.tsx`                       | React root                               | Instantiate useBluetooth() and useGamepad() hooks, render UI, wire direction events to ble_send command                                  |
| `setup_gamepad_monitor()`       | Called in Tauri setup hook               | Spawn std::thread gamepad monitor, initialize gilrs, enter event loop                                                                    |
| `setup_event_listener()`        | Called in Tauri setup hook               | Spawn async task to listen for BLE device disconnect events                                                                              |
| `.github/workflows/build.yml`   | Git tag `v*` push or `workflow_dispatch` | Single `build` job: compile deb, wrap as Flatpak, upload to GitHub Release                                                               |

## Design Rationale

### Single Rust Process

A monolithic Tauri process eliminates:
- Inter-process communication overhead (vs separate backend + frontend)
- Separate deployments (one binary per platform)
- Complexity of maintaining sync between services

The tradeoff is that React is not independently testable from the Rust layer, but the frontend is thin enough that this is acceptable.

### Gamepad in std::thread

The `gilrs` library blocks on `next_event()`, so using `tokio::spawn()` would block the entire Tokio runtime. A dedicated `std::thread` isolates gamepad polling and prevents stalls in BLE processing.

### Direction Coalescing

Gamepad sticks are noisy and produce many redundant AxisChanged events. By tracking `last_direction` and only emitting when it changes, we reduce IPC and BLE traffic by ~90%.

### Arc<Mutex> for BLE Peripheral

The peripheral must be:
- Shared across multiple command handlers (connect, disconnect, send)
- Protected from concurrent access (Rust's ownership rules)
- Cloneable for IPC callback threads

`Arc<Mutex<Option<Peripheral>>>` is the idiomatic pattern for this in Rust.

### WriteType::WithoutResponse

BLE writes can use `WithResponse` (waits for peripheral ACK) or `WithoutResponse` (fire-and-forget). For real-time control, `WithoutResponse` reduces latency at the cost of no confirmation. If a write fails silently, it will be overwritten by the next direction change within 8ms (gamepad poll interval).

### Flatpak Sandboxing

Flatpak provides:
- Fine-grained sandbox permissions (finish-args for BLE, gamepad, display)
- D-Bus proxy for secure BlueZ access
- Better Steam Deck integration (Non-Steam Game, Gaming Mode)
- Runtime isolation (pinned `org.freedesktop.Platform//24.08`)

## Platform Support

| Platform             | BLE                             | Gamepad                            | Distribution      |
| -------------------- | ------------------------------- | ---------------------------------- | ----------------- |
| Steam Deck (SteamOS) | BlueZ D-Bus (via Flatpak proxy) | gilrs evdev (via `--device=input`) | `.flatpak` bundle |
| Linux (native)       | BlueZ D-Bus (direct)            | gilrs evdev (via udev)             | `.deb` or source  |
| macOS                | CoreBluetooth                   | gilrs IOKit                        | Source build      |
| Windows              | Not supported                   | —                                  | —                 |

## Key Decisions

- **Flatpak runtime locked:** `org.freedesktop.Platform//24.08` (chosen in Phase 11, validated in Phase 14)
- **Sideload-only distribution:** `.flatpak` bundles from GitHub Releases — no Flathub publication, no OSTree remote. `flatpak install --user --reinstall` for upgrades.
- **Belt-and-suspenders Flatpak detection:** Both `FLATPAK_ID` env var AND `/.flatpak-info` file checked before D-Bus rewrite.
- **Single-binary:** One Tauri process, no separate backend. BLE and gamepad run in the same Rust binary.
- **app.tsx locked:** CI and pre-commit hooks enforce `git diff --exit-code` on `app.tsx`, `control-pad.tsx`, `status-bar.tsx`.
- **Version from Cargo.toml:** `cargo metadata` + `jq`, not `github.ref_name`.

## References

- [ARCHITECTURE.md (src-tauri)](apps/frontend/src-tauri/ARCHITECTURE.md) — Detailed Tauri layer architecture
- [flatpak/README.md](flatpak/README.md) — Flatpak build, install, and run guide
- [flatpak/com.ks0555.robotcontroller.yaml](flatpak/com.ks0555.robotcontroller.yaml) — Flatpak manifest
- [lib.rs](apps/frontend/src-tauri/src/lib.rs) — `in_flatpak()` detection and D-Bus gate
- [ble/mod.rs](apps/frontend/src-tauri/src/ble/mod.rs) — BLE implementation
- [gamepad/mod.rs](apps/frontend/src-tauri/src/gamepad/mod.rs) — Gamepad implementation
- [STEAM_DECK.md](STEAM_DECK.md) — Steam Deck install and build guide
- [Tauri v2 Documentation](https://v2.tauri.app/)
- [btleplug](https://github.com/deviceplug/btleplug)
- [gilrs](https://docs.rs/gilrs/)
- [Flatpak Documentation](https://docs.flatpak.org/)

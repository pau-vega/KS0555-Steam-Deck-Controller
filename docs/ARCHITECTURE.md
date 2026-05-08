<!-- generated-by: gsd-doc-writer -->

# Architecture

## System Overview

The Steam Deck Robot Controller is a single-process Tauri v2 desktop application that drives a Bluetooth robot from a gamepad. The Rust backend handles hardware I/O—BLE connectivity via `btleplug` and gamepad input via `gilrs`—while a React frontend in the Tauri WebView provides the user interface. The two communicate through Tauri's IPC layer using `invoke()` for commands and `listen()` for event streams. There is no separate backend server, no HTTP, no WebSocket; all state lives in the Rust shell for low-latency control.

## Process Model

```
┌─────────────────────────────────────────────────────────────┐
│  Single Tauri v2 Process (apps/frontend/src-tauri/src)      │
│                                                              │
│  ┌──────────────────────┐      ┌──────────────────────┐    │
│  │   Rust (Tokio)       │      │   React (Vite)       │    │
│  │  - BLE (btleplug)    │◄────►│   - UI Components    │    │
│  │  - Gamepad (gilrs)   │ IPC  │   - Status Display   │    │
│  │  - Event loops       │      │   - Command Send     │    │
│  │  - State Management  │      │                      │    │
│  └──────────────────────┘      └──────────────────────┘    │
│        ▲            ▲                                        │
│        │            │                                        │
│    HW Input    HW Output                                     │
│        │            │                                        │
└────────┼────────────┼────────────────────────────────────────┘
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
- **Mac/Linux/Windows via btleplug**: BLE automatically uses CoreBluetooth on macOS, BlueZ on Linux, WinRT on Windows.
- **Steam Deck special handling**: Sets `DBUS_SYSTEM_BUS_ADDRESS` to reach the BlueZ socket inside the container, and disables WebKitGTK compositing to work around Gamescope GPU rendering bugs.

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
    └─────────────────────────────────────────────────────────────┐
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

**Environment setup** (src/main.rs):

```rust
// Set DBUS_SYSTEM_BUS_ADDRESS if running under SteamOS
if std::path::Path::new("/run/host/run/dbus/system_bus_socket").exists() {
    std::env::set_var("DBUS_SYSTEM_BUS_ADDRESS",
        "unix:path=/run/host/run/dbus/system_bus_socket");
}

// Disable WebKitGTK compositing under Gamescope to avoid GPU rendering crashes
if std::env::var("WEBKIT_DISABLE_COMPOSITING_MODE").is_err() {
    std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
}
```

- **btleplug** automatically detects these env vars and routes D-Bus calls through the host container socket.
- **Gamescope + WebKitGTK**: Compositing mode crashes when Gamescope is running. The flag forces CPU-only rendering.

**AppImage distribution**:

- Built with `bundleMediaFramework: false` to minimize artifact size (no GStreamer bundled).
- End-user install via `install-on-steamdeck.sh` downloads from GitHub Release, registers a `.desktop` entry, and instructs the user to add it as a Non-Steam Game in Steam.

### macOS

**Permissions** (apps/frontend/src-tauri/Info.plist):

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>This app needs Bluetooth access to control the robot.</string>
```

- First BLE scan triggers the system permission prompt.
- `btleplug` uses CoreBluetooth automatically.

**Distribution**:

- `pnpm tauri build` produces a DMG for Intel Macs.
- CI builds a universal (Intel + Apple Silicon) DMG on tagged releases and attaches it to the GitHub Release.

### Linux Desktop

- **btleplug** uses BlueZ automatically.
- No special env setup needed (except on SteamOS, handled above).
- `pnpm tauri build` produces an AppImage.

## Key Files

| Concern          | File                                         | Responsibility                                                             |
| ---------------- | -------------------------------------------- | -------------------------------------------------------------------------- |
| Rust entry point | `apps/frontend/src-tauri/src/main.rs`        | Initialize Tauri, set env vars, spawn BLE/gamepad tasks, register commands |
| BLE state        | `apps/frontend/src-tauri/src/ble/state.rs`   | Arc<Mutex<Option<Peripheral>>> wrapper                                     |
| BLE commands     | `apps/frontend/src-tauri/src/ble/mod.rs`     | ble_connect, ble_disconnect, ble_send, connection loop, device discovery   |
| Gamepad monitor  | `apps/frontend/src-tauri/src/gamepad/mod.rs` | std::thread gamepad event loop, direction logic, direction coalescing      |
| Tauri config     | `apps/frontend/src-tauri/tauri.conf.json`    | Window size (1280×800), bundle settings, app metadata                      |
| macOS plist      | `apps/frontend/src-tauri/Info.plist`         | NSBluetoothAlwaysUsageDescription for Bluetooth permission                 |
| React entry      | `apps/frontend/src/main.tsx`                 | Root React render, error boundary                                          |
| React app        | `apps/frontend/src/app.tsx`                  | Main UI component, BLE/gamepad hook usage, command dispatch                |
| BLE hook         | `apps/frontend/src/hooks/use-bluetooth.ts`   | useBluetooth() — event subscriptions, command invocation                   |
| Gamepad hook     | `apps/frontend/src/hooks/use-gamepad.ts`     | useGamepad() — event subscriptions, Steam Deck detection                   |

## Directory Structure

```
apps/frontend/
├── src/                          # React frontend
│   ├── main.tsx                  # React entry point
│   ├── app.tsx                   # Main App component
│   ├── hooks/
│   │   ├── use-bluetooth.ts      # BLE IPC hook
│   │   └── use-gamepad.ts        # Gamepad event hook
│   ├── components/               # React UI components (ControlPad, StatusBar, etc.)
│   └── types.ts                  # TypeScript types (Direction type)
│
└── src-tauri/
    ├── src/
    │   ├── main.rs               # Rust entry point, Tauri init, env setup
    │   ├── ble/
    │   │   ├── mod.rs            # BLE commands and connect loop
    │   │   └── state.rs          # BleState wrapper (Arc<Mutex>)
    │   └── gamepad/
    │       └── mod.rs            # Gamepad monitor thread
    ├── tauri.conf.json           # Tauri bundle config
    └── Info.plist                # macOS Bluetooth permission
```

## Entry Points

| Entry                           | Triggered By                             | Responsibility                                                                                                                                     |
| ------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src-tauri/src/main.rs::main()` | Tauri runtime (dev or packaged binary)   | Set env vars (SteamOS D-Bus, compositing), initialize Tauri builder, spawn BLE + gamepad background tasks, register IPC commands, enter event loop |
| `src/main.tsx`                  | Vite dev server or WebView bundle        | Mount React app into DOM, wrap with StrictMode and ErrorBoundary                                                                                   |
| `app.tsx`                       | React root                               | Instantiate useBluetooth() and useGamepad() hooks, render UI, wire direction events to ble_send command                                            |
| `setup_gamepad_monitor()`       | Called in Tauri setup hook               | Spawn std::thread gamepad monitor, initialize gilrs, enter event loop                                                                              |
| `setup_event_listener()`        | Called in Tauri setup hook               | Spawn async task to listen for BLE device disconnect events                                                                                        |
| `.github/workflows/build.yml`   | Git tag `v*` push or `workflow_dispatch` | Build x86_64 AppImage, aarch64 AppImage, universal macOS DMG; attach to Release                                                                    |
| `install-on-steamdeck.sh`       | End user in Konsole                      | Download latest AppImage, register `.desktop` entry, prompt for Non-Steam Game addition                                                            |

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

<!-- refreshed: 2026-05-14 -->
# Architecture

**Analysis Date:** 2026-05-14

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                       WebView (WebKitGTK / WKWebView)                    │
│                                                                          │
│  React 19 App (StrictMode + ErrorBoundary)                               │
│    `apps/frontend/src/main.tsx` → `apps/frontend/src/app.tsx`            │
│                                                                          │
│  ┌──────────────────────┐  ┌──────────────────────┐                      │
│  │ useGamepad           │  │ useBluetooth          │  ┌─────────────┐    │
│  │ (event subscriber)   │  │ (command + events)    │  │ ControlPad  │    │
│  │ `hooks/use-gamepad`  │  │ `hooks/use-bluetooth` │  │ StatusBar   │    │
│  └──────────┬───────────┘  └──────────┬────────────┘  └──────┬──────┘    │
│             │                          │                      │           │
└─────────────┼──────────────────────────┼──────────────────────┼──────────┘
              │ listen("gamepad-*")      │ invoke("ble_*")       │ onClick
              │                          │ listen("ble-state-*") │
              ▼                          ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Tauri v2 IPC Boundary                           │
│                  (invoke_handler + AppHandle::emit)                      │
└─────────────────────────────────────────────────────────────────────────┘
              │                          │
              │ events                   │ commands
              ▼                          ▼
┌──────────────────────────┐  ┌──────────────────────────────────────────┐
│ gamepad poll thread      │  │  Rust BLE commands                       │
│ `src-tauri/src/gamepad/  │  │  `src-tauri/src/ble/mod.rs`              │
│   mod.rs`                │  │    • ble_connect   • ble_disconnect      │
│  • std::thread::spawn    │  │    • ble_send                            │
│  • gilrs::next_event()   │  │  + setup_event_listener (DeviceDisconn.) │
│  • deadzone 0.15         │  │  + BleState (Arc<Mutex<Option<Periph>>>) │
│  • emit("gamepad-*")     │  │    `src-tauri/src/ble/state.rs`          │
└──────────┬───────────────┘  └────────────────────┬─────────────────────┘
           │ /dev/input/event*                     │ D-Bus / CoreBluetooth
           ▼                                       ▼
   ┌───────────────┐                  ┌────────────────────────────────┐
   │ evdev / IOKit │                  │ BlueZ (Linux)                  │
   │ (gilrs)       │                  │ CoreBluetooth (macOS)          │
   └───────────────┘                  │ via `btleplug` 0.12            │
                                      └──────────────┬─────────────────┘
                                                     │ GATT write
                                                     │ char 0000ffe1-…
                                                     ▼
                                       ┌──────────────────────────────┐
                                       │ BT24 module on KS0555 robot  │
                                       │ (Arduino + DX-BT24 UART)     │
                                       │  receives F/B/L/R/S          │
                                       └──────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| `main` (Rust) | Set `WEBKIT_DISABLE_COMPOSITING_MODE=1` before any WebKit init, then delegate to `app_lib::run()`. Thin shim required for mobile builds. | `apps/frontend/src-tauri/src/main.rs` |
| `app_lib::run` | Detect Flatpak, fix D-Bus socket on host SteamOS, manage `BleState`, register Tauri commands, spawn BLE/gamepad listeners. | `apps/frontend/src-tauri/src/lib.rs` |
| `ble` module | Scan for `BT24`, connect via `btleplug`, write F/B/L/R/S to characteristic `0000ffe1-…`, emit `ble-state-changed`. | `apps/frontend/src-tauri/src/ble/mod.rs` |
| `BleState` | Shared `Arc<Mutex<Option<Peripheral>>>` managed via `app.manage()`; cloned into the disconnect-event listener. | `apps/frontend/src-tauri/src/ble/state.rs` |
| `gamepad` module | Background `std::thread` polling `gilrs` events, computing direction (D-pad → L stick fallback) with 0.15 deadzone, emitting on change only. | `apps/frontend/src-tauri/src/gamepad/mod.rs` |
| `main.tsx` (React) | Mount React 19 root inside `<StrictMode>` and `<ErrorBoundary>`. Only entry point referenced by `index.html`. | `apps/frontend/src/main.tsx` |
| `App` component | Compose hooks + components, dispatch direction changes from gamepad to BLE `send`. Locked file (CI enforced). | `apps/frontend/src/app.tsx` |
| `useGamepad` | Subscribe to `gamepad-direction` / `gamepad-connected` / `gamepad-disconnected` Tauri events; expose `{ direction, gamepadConnected, isDeck }`. | `apps/frontend/src/hooks/use-gamepad.ts` |
| `useBluetooth` | Dual-mode: Tauri `invoke` + event listener, with Web Bluetooth fallback for non-Tauri runtimes. | `apps/frontend/src/hooks/use-bluetooth.ts` |
| `ControlPad` | 3×3 directional pad mapped to `Direction` literals. | `apps/frontend/src/components/control-pad.tsx` |
| `StatusBar` | Render BLE + gamepad connectivity pills. | `apps/frontend/src/components/status-bar.tsx` |
| `ErrorBoundary` | Class-component React error fence around `<App />`. | `apps/frontend/src/components/error-boundary.tsx` |

## Pattern Overview

**Overall:** Single-binary Tauri v2 desktop app with a feature-sliced Rust backend and a hooks-driven React 19 frontend. IPC follows the standard Tauri command/event split — commands (`invoke`) for imperative actions, events (`emit` → `listen`) for state changes from Rust to the WebView.

**Key Characteristics:**
- **Single process:** No separate web/API server. `apps/backend/` is empty (deprecated during Tauri migration; the legacy Fastify backend was removed).
- **Rust owns hardware:** All BLE (`btleplug`) and gamepad (`gilrs`) handles live on the Rust side; the frontend never touches device APIs in production (Web Bluetooth path exists as a non-Tauri fallback only).
- **Event-driven UI:** React hooks subscribe to Rust-emitted events and reduce them to state; commands are fire-and-forget (`void invoke(...)` for `ble_send`).
- **Feature-based Rust modules:** `ble/` and `gamepad/` are top-level modules each owning their commands + helpers + tests.
- **Single shared piece of state:** `BleState` in `app.manage()` — no global mutables on the gamepad side (last-direction guard is thread-local to the gamepad thread).

## Layers

**Rust binary entry (`main.rs`):**
- Purpose: minimum-viable entrypoint required by Tauri's mobile build flow.
- Location: `apps/frontend/src-tauri/src/main.rs`
- Contains: env var fix + call to `app_lib::run()`.
- Depends on: `app_lib`.
- Used by: `cargo tauri build` / `cargo tauri dev`.

**Rust library / app composition (`lib.rs`):**
- Purpose: side-effect setup, Tauri Builder wiring.
- Location: `apps/frontend/src-tauri/src/lib.rs`
- Contains: `in_flatpak()`, D-Bus gate, `tauri::Builder` chain, `invoke_handler!` registration, `app.manage(BleState)`, listener bootstraps.
- Depends on: `ble`, `gamepad`, `tauri`.
- Used by: `main.rs`, integration tests in `src-tauri/tests/`.

**Rust BLE feature module (`ble/`):**
- Purpose: BlueZ/CoreBluetooth scan-connect-write lifecycle for the BT24 peripheral.
- Location: `apps/frontend/src-tauri/src/ble/`
- Contains: three `#[tauri::command]`s (`ble_connect`, `ble_disconnect`, `ble_send`), `setup_event_listener` background task, `find_bt24` helper, `BleState` struct.
- Depends on: `btleplug`, `tokio`, `futures`, `uuid`, `tauri`.
- Used by: `lib.rs` (via `pub use`), React `useBluetooth` (via IPC).

**Rust gamepad feature module (`gamepad/`):**
- Purpose: input polling + direction inference.
- Location: `apps/frontend/src-tauri/src/gamepad/mod.rs`
- Contains: `setup_gamepad_monitor` (spawns OS thread), `compute_direction`, `get_direction_from_axes`, `Direction` enum, unit tests.
- Depends on: `gilrs`, `serde_json`, `tauri`.
- Used by: `lib.rs::run`.

**React app shell:**
- Purpose: mount + error boundary; non-business-logic.
- Location: `apps/frontend/src/main.tsx`, `apps/frontend/src/components/error-boundary.tsx`.
- Depends on: `react`, `react-dom`.

**React feature composition (`app.tsx`):**
- Purpose: glue hooks + UI components; map gamepad direction → BLE send.
- Location: `apps/frontend/src/app.tsx`
- Contains: top-level layout, `prevDirection` ref, `sendCommand` callback.
- Constraint: **locked by CI** (`git diff --exit-code -- apps/frontend/src/app.tsx`).
- Depends on: `useBluetooth`, `useGamepad`, `ControlPad`, `StatusBar`, `Direction` type.

**React hooks layer:**
- Purpose: Tauri IPC adapters that hide `invoke` / `listen` behind ergonomic state hooks.
- Location: `apps/frontend/src/hooks/`
- Contains: `use-bluetooth.ts`, `use-gamepad.ts`.
- Depends on: `@tauri-apps/api/core`, `@tauri-apps/api/event`, `react`.

**React component layer:**
- Purpose: presentational components; no IPC, no state ownership beyond what's passed in.
- Location: `apps/frontend/src/components/`
- Contains: `control-pad.tsx`, `status-bar.tsx`, `error-boundary.tsx`.

**Workspace tooling layer:**
- Purpose: shared TS/lint configs.
- Location: `packages/tsconfig/`, `packages/eslint-config/`.
- Used by: `apps/frontend/tsconfig.json` (extends `@ks0555/tsconfig/tsconfig.react.json`), `apps/frontend/package.json` lint script.

## Data Flow

### Primary Request Path — Gamepad → Robot

1. **Hardware event arrives at gilrs.** OS delivers an evdev event on `/dev/input/event*` (Linux) or an IOKit notification (macOS). (`apps/frontend/src-tauri/src/gamepad/mod.rs:141-211`)
2. **Gamepad thread drains events.** A dedicated `std::thread::spawn`'d loop calls `gilrs.next_event()` non-blockingly and matches on `EventType::{Connected, Disconnected, AxisChanged, ButtonChanged, ButtonPressed, ButtonReleased}`. (`apps/frontend/src-tauri/src/gamepad/mod.rs:119-214`)
3. **Direction inference.** For axis/button changes on the tracked pad, `compute_direction` reads D-pad axes + buttons first, falls back to left stick X/Y if D-pad is idle, then maps `(x, y)` through `get_direction_from_axes` with a 0.15 deadzone. (`apps/frontend/src-tauri/src/gamepad/mod.rs:28-112`)
4. **Change guard.** A thread-local `last_direction: Option<Direction>` suppresses duplicate emits — `gamepad-direction` only fires on transitions. (`apps/frontend/src-tauri/src/gamepad/mod.rs:182-190`)
5. **Tauri event emit.** `app_handle.emit("gamepad-direction", { direction: "F"|"B"|"L"|"R"|"S" })`. (`apps/frontend/src-tauri/src/gamepad/mod.rs:188`)
6. **Frontend subscriber.** `useGamepad` listens with `listen<{ direction: Direction }>("gamepad-direction", ...)` and calls `setDirection(event.payload.direction)`. (`apps/frontend/src/hooks/use-gamepad.ts:30-34`)
7. **App.tsx reacts.** `useEffect([direction])` compares against `prevDirection.current`; on change calls `sendCommand(direction)`. (`apps/frontend/src/app.tsx:24-29`)
8. **Hook invokes BLE.** `useBluetooth.send` calls `void invoke("ble_send", { command: data })` (or falls back to `characteristic.writeValue` in Web Bluetooth mode). (`apps/frontend/src/hooks/use-bluetooth.ts:124-133`)
9. **Tauri IPC routes to Rust.** Registered in `tauri::generate_handler![ble_connect, ble_disconnect, ble_send]`. (`apps/frontend/src-tauri/src/lib.rs:54-58`)
10. **Rust BLE write.** `ble_send` validates the command is one character, fetches the peripheral from `BleState`, ensures services are discovered, finds the `0000ffe1-…` characteristic, and writes the UTF-8 byte with `WriteType::WithoutResponse`. (`apps/frontend/src-tauri/src/ble/mod.rs:175-218`)
11. **BT24 module delivers UART byte to the Arduino**, which actuates motors. (Off-process; external hardware.)

### BLE Connect Flow

1. User clicks "Connect Bluetooth" → `connect()` from `useBluetooth`. (`apps/frontend/src/app.tsx:38-42`)
2. Hook calls `invoke("ble_connect")`. (`apps/frontend/src/hooks/use-bluetooth.ts:75-83`)
3. `ble_connect` emits `ble-state-changed: "connecting"`, builds `Manager::new()`, picks the first adapter, validates `CentralState::PoweredOn`, and starts a scan with a 10 s timeout. (`apps/frontend/src-tauri/src/ble/mod.rs:31-105`)
4. Loop: poll known peripherals + subscribe to `adapter.events()`; first peripheral whose `local_name` contains `"BT24"` is connected, services discovered, stored in `BleState`, and `ble-state-changed: "connected"` is emitted.
5. Hook subscriber updates React state via `listen<string>("ble-state-changed", ...)`. (`apps/frontend/src/hooks/use-bluetooth.ts:47-67`)

### Disconnect / Auto-Disconnect Flow

1. Either: user calls `ble_disconnect` (no UI surface currently — programmatic only) which disconnects, clears `BleState`, emits `"disconnected"`.
2. Or: `setup_event_listener` (spawned at app startup) receives `CentralEvent::DeviceDisconnected` from the platform adapter and emits `ble-state-changed: "disconnected"` without clearing peripheral state. (`apps/frontend/src-tauri/src/ble/mod.rs:128-151`)
3. Hook listener flips `state` to `"disconnected"`.

**State Management:**
- React state is local per hook (`useState` in `useGamepad`, `useBluetooth`). No global store, no context, no Redux.
- Rust BLE state lives in `BleState { peripheral: Arc<Mutex<Option<Peripheral>>> }`, registered with `app.manage()` and accessed in commands via `state: tauri::State<'_, BleState>`. (`apps/frontend/src-tauri/src/ble/state.rs`)
- Gamepad state is intrinsic to the polling thread — `connected_gamepad_id` and `last_direction` are local variables in the `loop`, never read by other code.

## Key Abstractions

**`Direction` (TypeScript + Rust mirror):**
- Purpose: enumerate the five robot commands.
- TS: `export type Direction = "F" | "B" | "L" | "R" | "S"` in `apps/frontend/src/types.ts`.
- Rust: private `enum Direction { F, B, L, R, S }` with `as_char` → `&'static str` in `apps/frontend/src-tauri/src/gamepad/mod.rs:7-26`.
- Pattern: stringly-typed contract across the IPC boundary, kept in sync manually.

**Tauri command surface (`#[tauri::command]`):**
- Purpose: the only sanctioned IPC entry points.
- Examples: `apps/frontend/src-tauri/src/ble/mod.rs:31` (`ble_connect`), `:155` (`ble_disconnect`), `:175` (`ble_send`).
- Pattern: each command is `async fn` returning `Result<(), String>` (string errors surfaced to JS as exceptions).

**Tauri event channel:**
- Purpose: Rust → JS push notifications.
- Channels in use: `ble-state-changed`, `gamepad-connected`, `gamepad-disconnected`, `gamepad-direction`.
- Pattern: `app_handle.emit(channel, payload)` on the Rust side; `listen<T>(channel, cb)` returning `UnlistenFn` on the JS side, with cleanup stored in a ref for unmount.

**Capability-gated permissions:**
- Purpose: explicit allow-list for IPC + events per window.
- Files: `apps/frontend/src-tauri/capabilities/main.json` (binds the `main` window to `ble-connect`, `ble-disconnect`, `ble-send`, `ble-state-changed`), `apps/frontend/src-tauri/permissions/ble.toml` (declares each permission), `apps/frontend/src-tauri/permissions/default.toml` (default set).

**React hook adapter pattern:**
- Purpose: encapsulate IPC subscription lifecycle so components stay declarative.
- Examples: `useGamepad`, `useBluetooth`.
- Pattern: `useEffect` sets up `listen` subscriptions in an async helper, stores returned `UnlistenFn`s in a `useRef` array (gamepad) or a single `unlisten` variable (bluetooth), uses a `cancelled` flag to guard against late callbacks, and tears down on cleanup.

**Dual-runtime hook (`useBluetooth`):**
- Purpose: support both Tauri and (theoretically) browser Web Bluetooth from one hook.
- Pattern: an `isTauri()` guard checks `__TAURI_INTERNALS__` / `__TAURI__` on `window` and branches between `invoke` + Tauri events and `navigator.bluetooth.requestDevice` + GATT. The Web Bluetooth branch is dead code on the Steam Deck (WebKitGTK has no `navigator.bluetooth`) and exists primarily for non-Tauri browser testing. (`apps/frontend/src/hooks/use-bluetooth.ts:24-27, 87-122`)

## Entry Points

**Rust binary (`main` fn):**
- Location: `apps/frontend/src-tauri/src/main.rs`
- Triggers: `cargo tauri dev`, `cargo tauri build`, the bundled `robot-controller` executable.
- Responsibilities: set `WEBKIT_DISABLE_COMPOSITING_MODE=1` (must precede any WebKit init — fixes blank white screen on Gamescope/X11), call `app_lib::run()`.

**Rust app composition (`pub fn run`):**
- Location: `apps/frontend/src-tauri/src/lib.rs:16-61`
- Triggers: invoked from `main()`; also `#[cfg_attr(mobile, tauri::mobile_entry_point)]` for mobile targets.
- Responsibilities: Flatpak detection, conditional D-Bus socket rewrite (skip when in Flatpak), build the Tauri app, register `BleState`, spawn `setup_event_listener`, spawn `setup_gamepad_monitor`, mount the three BLE commands, run.

**Frontend HTML entry:**
- Location: `apps/frontend/index.html`
- Triggers: served by Vite on `http://localhost:5173` in dev, packaged as `dist/index.html` and loaded by the WebView in production.
- Responsibilities: provide `<div id="root">` and load `/src/main.tsx` as the module entry.

**React entry (`main.tsx`):**
- Location: `apps/frontend/src/main.tsx`
- Triggers: WebView loads `index.html` → `<script type="module" src="/src/main.tsx">`.
- Responsibilities: `createRoot(...).render(<StrictMode><ErrorBoundary><App /></ErrorBoundary></StrictMode>)` and import `index.css`.

**Tauri command surface:**
- Location: `apps/frontend/src-tauri/src/ble/mod.rs` (functions annotated `#[tauri::command]`).
- Registered handler: `tauri::generate_handler![ble_connect, ble_disconnect, ble_send]` in `lib.rs:54-58`.
- Triggers: `invoke("ble_connect")`, `invoke("ble_disconnect")`, `invoke("ble_send", { command })` from the WebView.

**Event channels (Rust → JS):**
| Channel | Producer | Payload | Consumer |
|---------|----------|---------|----------|
| `ble-state-changed` | `ble::ble_connect`, `ble::ble_disconnect`, `setup_event_listener` | string: `"connecting"` \| `"connected"` \| `"disconnected"` | `useBluetooth` |
| `gamepad-connected` | `gamepad::setup_gamepad_monitor` | `{ name: string }` | `useGamepad` |
| `gamepad-disconnected` | `gamepad::setup_gamepad_monitor` | `{ name: string }` | `useGamepad` |
| `gamepad-direction` | `gamepad::setup_gamepad_monitor` | `{ direction: "F"\|"B"\|"L"\|"R"\|"S" }` | `useGamepad` |

## Architectural Constraints

- **Threading:**
  - JS side is single-threaded (V8/JSC + React).
  - Rust uses Tokio (`features = ["macros", "rt-multi-thread"]`) for BLE — `ble_connect` is `async fn`, `setup_event_listener` is launched via `tauri::async_runtime::spawn`.
  - Gamepad polling intentionally uses **`std::thread::spawn`** (not `tauri::async_runtime::spawn`) because `gilrs::Gilrs` is not `Send` across an async runtime in the same way; `AppHandle` is cloned into the thread (`AppHandle` is `Send`). (`apps/frontend/src-tauri/src/gamepad/mod.rs:119-121`)
- **Global state:**
  - `BleState` is the only managed shared state. `Arc<Mutex<Option<Peripheral>>>` — held lock is short-lived (set/get) but uses `std::sync::Mutex`, so blocking inside an `await` while holding it would block the runtime. Current code is safe (lock dropped before `.await`).
  - Module-level constants only: `BT24_NAME`, `SCAN_TIMEOUT`, `BT24_CHAR_UUID`, `DEADZONE`, `STEAM_DECK_VENDOR_ID`, `STEAM_DECK_PRODUCT_ID`.
- **Circular imports:** None. The frontend layering is `main.tsx → app.tsx → hooks/* + components/*`; hooks import from `../types`; components import from `../types`. The Rust side is a strict tree from `lib.rs → ble/* + gamepad/*`.
- **Locked files (CI-enforced):** `apps/frontend/src/app.tsx` — `git diff --exit-code` step in `.github/workflows/ci.yml:34-35`. Tracked components (`control-pad.tsx`, `status-bar.tsx`) referenced as locked by `src-tauri/ARCHITECTURE.md` but only `app.tsx` is currently enforced in CI.
- **WebKitGTK compatibility:** Vite build target is `safari15` on non-Windows builds (`apps/frontend/vite.config.ts:24`) because modern JS features cause blank screens on the Steam Deck's WebKitGTK.
- **Fixed dev port:** Vite must listen on `5173` (`strictPort: true`) to match `tauri.conf.json:devUrl`.
- **CSP:** `default-src 'self'; connect-src 'self' http://localhost:5173 ws://localhost:5173; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'` — only local resources and the dev HMR socket. (`apps/frontend/src-tauri/tauri.conf.json:23`)
- **Flatpak gate:** D-Bus socket rewrite logic in `lib.rs` is gated on `!in_flatpak()`. Inside Flatpak, the runtime proxies `DBUS_SYSTEM_BUS_ADDRESS`; overwriting it would break BLE silently. Belt-and-suspenders detection: both `FLATPAK_ID` env var and `/.flatpak-info` file. (`apps/frontend/src-tauri/src/lib.rs:8-34`)
- **Single-binary deployment:** No separate backend service. `apps/backend/` exists as an empty directory; the Fastify backend was removed during the Tauri v2 migration.

## Anti-Patterns

### Mutating `app.tsx`

**What happens:** Direct edits to `apps/frontend/src/app.tsx` get past local hooks but fail CI.
**Why it's wrong:** CI runs `git diff --exit-code -- apps/frontend/src/app.tsx` (`.github/workflows/ci.yml:34-35`). The composition layer is intentionally frozen so new behavior is added via new hooks/components or by extending existing hooks.
**Do this instead:** Add a new hook in `apps/frontend/src/hooks/` or a new component in `apps/frontend/src/components/` and (separately) request an allow-listed change to `app.tsx`.

### Calling `navigator.bluetooth` directly in components

**What happens:** A component reaches into `navigator.bluetooth` instead of going through `useBluetooth`.
**Why it's wrong:** WebKitGTK (the Steam Deck WebView) has no `navigator.bluetooth`. The Web Bluetooth path in `use-bluetooth.ts:87-122` is a fallback for browser-based dev/test only. Production traffic must flow through `invoke("ble_*")`.
**Do this instead:** Use `useBluetooth()` and call `send`/`connect`. The hook handles runtime detection (`isTauri()`).

### `tauri::async_runtime::spawn` for gilrs polling

**What happens:** Wrap the gamepad polling loop in `tauri::async_runtime::spawn(async move { ... })`.
**Why it's wrong:** `Gilrs` initialization and `next_event` are blocking and not designed to be polled cooperatively. Mixing them with the async runtime leads to runtime starvation and missed events. Comments `D-32` / `D-33` in `gamepad/mod.rs:117-121` flag this explicitly.
**Do this instead:** Use `std::thread::spawn(move || { let mut gilrs = Gilrs::new()...; loop { ... } })`. Clone `AppHandle` (it's `Send`) into the thread.

### Emitting `gamepad-direction` on every poll

**What happens:** Emit on every `EventType::AxisChanged` regardless of whether the inferred direction actually changed.
**Why it's wrong:** Stick chatter would flood the IPC channel and cause `ble_send` calls every frame — exhausting BlueZ throughput and producing visible robot stutter. Comments `D-13` / `D-41` in `gamepad/mod.rs:182, 200` describe the direction-change guard.
**Do this instead:** Keep the `last_direction: Option<Direction>` thread-local and only emit when `last_direction != Some(new_direction)`.

### Holding the `BleState` lock across `.await`

**What happens:** `let guard = state.peripheral.lock().unwrap(); peripheral.write(...).await;`
**Why it's wrong:** `BleState` uses `std::sync::Mutex`, which is not async-aware. Holding the guard across `.await` blocks the Tokio worker and can deadlock if another command tries to acquire the lock.
**Do this instead:** Use the existing `BleState::get` (which clones the `Peripheral` out of the `Mutex`) and operate on the clone. See `ble_send` for the pattern (`apps/frontend/src-tauri/src/ble/mod.rs:188-217`).

### Skipping `tauri::generate_handler!` registration

**What happens:** Add a new `#[tauri::command]` but forget to list it in `tauri::generate_handler![...]` and/or the capability files.
**Why it's wrong:** The command will exist but `invoke()` returns "command not found" at runtime, and the Tauri ACL system blocks calls without an explicit permission. Both are silent on the Rust side.
**Do this instead:** Always update three places: the command's `mod.rs`, the `generate_handler!` macro in `lib.rs:54-58`, and `permissions/*.toml` + `capabilities/main.json`.

## Error Handling

**Strategy:** Rust commands return `Result<(), String>`. Strings are formatted at the call site with context (e.g., `format!("Failed to discover BT24 services: {}", e)`). On the JS side, `invoke()` rejects the promise with an `Error` whose `message` is the string. `useBluetooth` catches and stores it in `error` state. Background tasks (`setup_event_listener`, gamepad thread) ignore most errors — they `let _ =` the result so a transient failure doesn't crash the listener.

**Patterns:**
- **Validated input:** `ble_send` rejects multi-byte commands explicitly with `"Invalid command: '{}'. Must be single char (F/B/L/R/S)"`. (`apps/frontend/src-tauri/src/ble/mod.rs:181-186`)
- **Domain errors over panics:** `state.get().ok_or_else(|| "Not connected to BT24 device".to_string())` returns a domain error instead of unwrapping. (`apps/frontend/src-tauri/src/ble/mod.rs:188-190`)
- **Timeout-bounded scans:** `tokio::time::timeout(SCAN_TIMEOUT, ...)` returns a structured `"Scan timed out after 10 seconds..."` message with remediation guidance.
- **React error fence:** `ErrorBoundary` catches render-time exceptions and renders a fallback. Hook async errors are caught locally and stored in `error` state.
- **Event-loop suppression:** Disconnect listener uses `let _ = app.emit(...)` to avoid bubbling emit failures.

## Cross-Cutting Concerns

**Logging:**
- Rust: `eprintln!` with `[ble]` / `[gamepad] / [debug]` prefixes (`apps/frontend/src-tauri/src/ble/mod.rs:113`, `gamepad/mod.rs:131, 138`, `lib.rs:24`). No structured logging crate.
- TS: `console.error` for hook failures, `console.log` for Steam Deck detection breadcrumbs (`use-gamepad.ts:59`, `use-bluetooth.ts:60`).

**Validation:**
- Single command validator in `ble_send` (length check).
- TypeScript-level: `Direction` literal type prevents arbitrary strings from being sent through the hook surface.
- Rust enum `Direction` prevents invalid emissions from the gamepad side.

**Authentication:** None — local device, no auth surface.

**IPC permissioning:** Tauri capabilities/permissions described above; enforced by the runtime.

**Build-time enforcement:**
- `app.tsx` lock (CI step).
- Vite `strictPort: true` (fails fast if 5173 is taken).
- `tsconfig` extends `@ks0555/tsconfig/tsconfig.react.json` (strict + `noUncheckedIndexedAccess`).
- ESLint flat config at root (`eslint.config.ts`) plus React-specific config at `packages/eslint-config/src/react.ts`.

---

*Architecture analysis: 2026-05-14*

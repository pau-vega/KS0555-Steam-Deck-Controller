# Research Summary: Steam Deck Robot Controller

## Stack

### Frontend
- **React 19 + Vite + TypeScript** — standard modern stack, fast dev
- **Gamepad API** (`navigator.getGamepads()`) — well-established, Chrome on Steam Deck supports it
- **WebSocket client** — native browser `WebSocket`, no library needed

### Backend
- **Node.js** (minimal, no framework) — plain `http` + `ws` server
- **ws** — lightweight WebSocket server library
- **serialport** — connects to `/dev/rfcomm0` (Bluetooth RFCOMM bound device)
- **Linux setup required**: `bluetoothctl` pairing + `rfcomm bind` to create `/dev/rfcomm0`

### DX-BT24 Module Details
- BLE 5.1 with UART transparent transmission
- Default baud rate: **9600** (8N1, no parity, no flow control)
- Device name: "BT24"
- Service UUID: FFE0, Write UUID: FFE1, Notify UUID: FFE2
- Accepts plain ASCII serial commands: F, B, L, R, S
- On Linux: pair via `bluetoothctl`, bind to `/dev/rfcomm0` via `rfcomm bind`

### Monorepo
- **pnpm workspaces** — `apps/frontend`, `apps/backend`
- No shared packages needed for MVP

## Features

### Table Stakes
- Connection status display (connected/disconnected)
- Manual control buttons (F, B, L, R, S)
- Gamepad input mapping (analog stick → direction)
- Command display (show last sent command)
- Auto-reconnect on serial drop
- Stop on disconnect (safety)

### Differentiators (deferred for MVP)
- Motor speed control (u<number>#, v<number>#)
- Connection history/log
- Custom button mapping UI
- Multiple robot profiles

### Anti-Features (deliberately NOT building)
- Authentication (single-user local device)
- Mobile app (Steam Deck only)
- Cloud connectivity
- Video feed integration
- Path planning/autonomous mode

## Architecture

### Components
```
Frontend (React/Vite) ←→ WebSocket (ws://localhost:PORT) ←→ Backend (Node.js) ←→ /dev/rfcomm0 ←→ DX-BT24 ←→ Arduino
```

### Data Flow
1. Frontend polls `navigator.getGamepads()` in `requestAnimationFrame` loop
2. Direction changes detected (with deadzone) → send WebSocket message
3. Backend receives WebSocket message → writes single byte to serialport
4. Serial data received from robot → forwarded to frontend (optional, for status)

### Build Order
1. Monorepo structure + workspace config (foundation)
2. Backend (WebSocket + serialport) — can test independently with serial terminal
3. Frontend (React UI + gamepad) — depends on backend being available
4. Integration testing

## Pitfalls

### Bluetooth/RFCOMM
- **DX-BT24 is BLE, not classic SPP** — on Linux, must use `bluetoothctl` to pair and `rfcomm bind` to expose as serial device
- `/dev/rfcomm0` requires proper permissions — may need `sudo` or udev rules on Steam Deck
- Bluetooth pairing must be done once manually before the app works
- The module defaults to 9600 baud — serialport must match

### Gamepad API
- **Steam Input mode matters** — Chrome must be set to "Gamepad with Mouse Trackpad" for gamepad detection
- **Flatpak filesystem override needed**: `flatpak --user override --filesystem=/run/udev:ro com.google.Chrome`
- Gamepad API only activates after first user gesture (button press)
- Analog sticks have jitter — deadzone of ~0.1-0.15 is essential
- `navigator.getGamepads()` may return null entries — must handle gracefully

### WebSocket
- Connection drops must trigger "S" (stop) command for safety
- No authentication needed (localhost only)
- Single client is fine for MVP — no multi-client support needed

### Serial
- Port may not exist if Bluetooth not paired — backend should handle gracefully with clear error messages
- Auto-reconnect loop needs backoff to avoid spam
- Write operations should be single characters, no newline needed (Arduino firmware reads raw chars)

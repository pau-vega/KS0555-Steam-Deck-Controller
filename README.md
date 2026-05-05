# KS0555 Steam Deck Robot Controller

Control a Bluetooth Arduino robot (DX-BT24 module) using your Steam Deck gamepad.

## Quick Start

```bash
pnpm install
pnpm dev
```

## Prerequisites

- Node.js >= 18
- pnpm >= 10
- Steam Deck (Desktop Mode) or any Linux machine with Bluetooth

## Bluetooth Setup (Steam Deck)

Before running the app, pair your DX-BT24 module:

```bash
# Open bluetoothctl
bluetoothctl

# Inside bluetoothctl:
power on
agent on
default-agent
scan on
# Wait for "BT24" to appear, note its MAC address
pair XX:XX:XX:XX:XX:XX
trust XX:XX:XX:XX:XX:XX
connect XX:XX:XX:XX:XX:XX
quit
```

Then bind it to a serial device:

```bash
sudo rfcomm bind /dev/rfcomm0 XX:XX:XX:XX:XX:XX:XX 1
```

Verify:
```bash
rfcomm -a
# Should show: rfcomm0: XX:XX:XX:XX:XX:XX channel 1 clean
```

### Chrome Gamepad Setup (Steam Deck)

For the Gamepad API to work in Chrome on Steam Deck:

```bash
flatpak --user override --filesystem=/run/udev:ro com.google.Chrome
```

In Steam Gaming Mode, set Chrome's Steam Input to **"Gamepad with Mouse Trackpad"**.

## Architecture

```
Frontend (React/Vite) ←→ WebSocket (ws://localhost:8080) ←→ Backend (Node.js) ←→ /dev/rfcomm0 ←→ DX-BT24 ←→ Arduino
```

## Commands

The robot accepts these serial commands:

| Command | Action |
|---------|--------|
| F | Move forward |
| B | Move backward |
| L | Turn left |
| R | Turn right |
| S | Stop |

## Gamepad Mapping

| Input | Command |
|-------|---------|
| Left stick up | F |
| Left stick down | B |
| Left stick left | L |
| Left stick right | R |
| Neutral | S |

## Development

```bash
# Run both frontend and backend
pnpm dev

# Run individually
pnpm dev:frontend   # http://localhost:3000
pnpm dev:backend    # ws://localhost:8080

# Type check
pnpm typecheck

# Build for production
pnpm build
```

## Environment Variables (Backend)

| Variable | Default | Description |
|----------|---------|-------------|
| WS_PORT | 8080 | WebSocket server port |
| SERIAL_PORT | /dev/rfcomm0 | Bluetooth serial device |
| BAUD_RATE | 9600 | Serial baud rate |

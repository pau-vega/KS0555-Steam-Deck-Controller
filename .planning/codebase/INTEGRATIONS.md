# External Integrations

**Analysis Date:** 2026-05-05

## APIs & External Services

**Browser APIs:**
- **Web Bluetooth API** - Used in `apps/frontend/src/hooks/use-bluetooth.ts`
  - Purpose: Connect to Bluetooth robot device ("BT24")
  - Service UUID: `0000ffe0-0000-1000-8000-00805f9b34fb`
  - Characteristic UUID: `0000ffe1-0000-1000-8000-00805f9b34fb`
  - SDK/Client: Native browser API (no npm package)
  - Type definitions: `@types/web-bluetooth`
  - Usage: `navigator.bluetooth.requestDevice()` for device selection and connection

- **Gamepad API** - Used in `apps/frontend/src/hooks/use-gamepad.ts`
  - Purpose: Detect and read input from Steam Deck or other gamepads
  - SDK/Client: Native browser API
  - Usage: `navigator.getGamepads()` for polling, `gamepadconnected`/`gamepaddisconnected` events
  - Features: Axes-based direction detection with deadzone (0.15)

**WebSocket Communication:**
- **Frontend → Backend WebSocket** - Real-time command streaming
  - Endpoint: `ws://localhost:3001/ws` (configurable via `PORT` env var)
  - Client: Native WebSocket API in browser
  - Server: `@fastify/websocket` 9.0.0 + `ws` 8.18.0
  - Implementation: `apps/backend/src/index.ts` (lines 68-120)
  - Protocol: JSON messages with `type` and `message` fields
  - Commands: `F` (forward), `B` (backward), `L` (left), `R` (right), `S` (stop)

## Data Storage

**Databases:**
- None - This is a real-time control application with no persistent data storage

**File Storage:**
- Local filesystem only
- Build outputs: `apps/frontend/dist/`, `apps/backend/dist/`, `packages/eslint-config/dist/`

**Caching:**
- None - No caching layer implemented

## Authentication & Identity

**Auth Provider:**
- None - No authentication implemented
- Direct WebSocket connections accepted without auth
- Serial port access is local-only (no network exposure beyond WebSocket endpoint)

## Monitoring & Observability

**Error Tracking:**
- None - No external error tracking service

**Logs:**
- Backend: `console.log()` and `console.error()` with timestamps in `apps/backend/src/index.ts`
- Frontend: No explicit logging (browser console for development)
- Fastify logger enabled: `fastify({ logger: true })` in backend

## CI/CD & Deployment

**Hosting:**
- Backend: Node.js server environment (self-hosted or cloud)
- Frontend: Static site hosting compatible with Vite build output

**CI Pipeline:**
- None detected - No `.github/workflows/` files present

## Environment Configuration

**Required env vars:**
- `PORT` - Backend server port (default: 3001, used in `apps/backend/src/index.ts`)

**Secrets location:**
- None - No secrets or API keys required for this application

## Webhooks & Callbacks

**Incoming:**
- WebSocket endpoint: `GET /ws` - Accepts real-time command connections from frontend
- Health check: `GET /` - Returns server status and serial connection state

**Outgoing:**
- Serial port: `/dev/rfcomm0` - Writes command characters (F/B/L/R/S) to robot via `serialport` library
- Bluetooth (frontend): Writes command data to Bluetooth characteristic via `characteristic.writeValue()`

## Hardware Integrations

**Serial Communication:**
- Library: `serialport` 12.0.0
- Device path: `/dev/rfcomm0` (configured in `apps/backend/src/index.ts`)
- Baud rate: 9600
- Auto-reconnect: Enabled with 2-second retry interval
- Commands: Single character protocol (F, B, L, R, S)
- Implementation: `apps/backend/src/index.ts` (lines 40-65 for connection, lines 88-96 for writing)

**Bluetooth Communication:**
- API: Web Bluetooth API (browser-native)
- Device name filter: "BT24"
- Connection: GATT (Generic Attribute Profile)
- Data transfer: Write to characteristic via `writeValue()`
- Auto-reconnect: Not implemented (user must manually reconnect)
- Implementation: `apps/frontend/src/hooks/use-bluetooth.ts`

## Special Integration Notes

**Command Validation:**
- Backend validates incoming WebSocket commands against whitelist: `F`, `B`, `L`, `R`, `S`
- Invalid commands return error message via WebSocket
- Implementation: `apps/backend/src/types.ts` (line 20-22) and `apps/backend/src/index.ts` (line 81)

**Safety Features:**
- WebSocket disconnect triggers "S" (stop) command to serial port
- Backend auto-reconnects to serial port on close/error
- Frontend gamepad deadzone prevents false triggers

---

*Integration audit: 2026-05-05*

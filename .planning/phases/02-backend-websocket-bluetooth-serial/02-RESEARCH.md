# Phase 2: Backend — WebSocket + Bluetooth Serial - Research

**Date:** 2026-05-03
**Phase:** 2-Backend — WebSocket + Bluetooth Serial

## Technology Stack

### Fastify WebSocket (@fastify/websocket v9.0.0)
- Plugin for Fastify v5 that adds WebSocket support
- Register with `fastify.register(require('@fastify/websocket'))`
- Define WebSocket routes with `{ websocket: true }` option
- Handler receives `(socket, request)` where socket is a ws WebSocket instance
- Access underlying ws.Server via `fastify.websocketServer`

**Key patterns:**
```typescript
// Register plugin
await fastify.register(fastifyWebsocket)

// WebSocket route
fastify.get('/ws', { websocket: true }, (socket, request) => {
  socket.on('message', (message) => {
    // message is Buffer or string
    socket.send('response')
  })
  socket.on('close', (code, reason) => {
    // Handle disconnect
  })
  socket.on('error', (err) => {
    // Handle error
  })
})
```

### SerialPort (serialport v12.0.0)
- Node.js library for serial port communication
- Works with RFCOMM Bluetooth devices on Linux (`/dev/rfcomm0`)
- Auto-open by default, or use `autoOpen: false` with manual `port.open()`

**Key patterns:**
```typescript
import { SerialPort } from 'serialport'

// Create port (auto-opens by default)
const port = new SerialPort({
  path: '/dev/rfcomm0',
  baudRate: 9600
})

// Write data
port.write('F', (err) => {
  if (err) console.error('Write error:', err.message)
})

// Event handlers
port.on('open', () => {
  console.log('Serial port opened')
})
port.on('close', () => {
  console.log('Serial port closed')
})
port.on('error', (err) => {
  console.error('Serial error:', err.message)
})
```

## Implementation Approach

### WebSocket Server
- Register `@fastify/websocket` plugin on Fastify server
- Create WebSocket route at `/ws` (or root `/`)
- Handle `message` events: validate command, write to serial
- Handle `close` events: write "S" (stop) to serial port
- Log all events to console

### Serial Connection
- Create SerialPort instance for `/dev/rfcomm0` at 9600 baud
- On server start: open port, retry every 2 seconds if fails
- On WebSocket message: validate F/B/L/R/S, write to serial
- On WebSocket close: write "S" to serial port
- On serial close: attempt reconnect with 2-second interval
- Log all status changes to console

### Command Validation
- Whitelist: only accept `F`, `B`, `L`, `R`, `S` (single characters)
- Reject and log anything else
- Commands are strings from WebSocket messages

## Architecture Decision: Single Fastify Server

Per D-01 (CONTEXT.md), use single Fastify server with `@fastify/websocket` plugin:
- HTTP server + WebSocket on same port
- Simpler than separate servers
- Already in dependencies

## Testing Strategy

- Vitest for unit tests
- Test serial port mocking (if needed)
- Test WebSocket message handling
- Test command validation (whitelist)

## References

- Fastify WebSocket: https://github.com/fastify/fastify-websocket
- SerialPort: https://github.com/serialport/node-serialport
- Context7 library IDs: `/fastify/fastify-websocket`, `/serialport/website`

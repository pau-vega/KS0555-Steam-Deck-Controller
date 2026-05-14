---
phase: 2-backend-websocket-bluetooth-serial
plan: 01
subsystem: backend
tags: [fastify, websocket, serialport, bluetooth, robot-control]

# Dependency graph
requires:
  - phase: "1-monorepo-foundation"
    provides: "pnpm monorepo structure with apps/backend workspace"
provides:
  - "Fastify server with WebSocket support at /ws endpoint"
  - "SerialPort connection to /dev/rfcomm0 at 9600 baud"
  - "Command validation whitelist (F/B/L/R/S)"
  - "Auto-reconnect logic for serial port"
  - "Stop command on WebSocket disconnect"
affects: [3-frontend-websocket-client, testing, integration]

# Tech tracking
tech-stack:
  added: [@fastify/websocket, serialport]
  patterns: [WebSocket message validation, Serial port auto-reconnect, Build function export for testing]
key-files:
  created: [apps/backend/src/types.ts]
  modified: [apps/backend/src/index.ts]

key-decisions:
  - "Use @fastify/websocket plugin for WebSocket support (D-01)"
  - "Use plain console.log/console.error for logging (D-02)"
  - "Log and continue on errors (D-03)"
  - "Connect to serial on startup with 2000ms retry interval (D-04)"
  - "Whitelist validation for F/B/L/R/S commands only (D-05)"

patterns-established:
  - "SocketStream pattern: const socket = connection.socket for @fastify/websocket"

requirements-completed: [BACK-01, BACK-02, BACK-04, BACK-06, SAFE-01, SAFE-02]

# Metrics
duration: 3 min
completed: 2026-05-03
---

# Phase 2 Plan 01: WebSocket Server + Serial Port Setup Summary

**Fastify server with @fastify/websocket plugin serving WebSocket at /ws, SerialPort connection to /dev/rfcomm0 at 9600 baud, command whitelist validation (F/B/L/R/S), auto-reconnect logic, and stop-on-disconnect safety feature**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-03T20:12:02Z
- **Completed:** 2026-05-03T20:15:34Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Fastify server with @fastify/websocket plugin registered and operational
- WebSocket route at `/ws` accepts connections and validates commands against whitelist
- SerialPort instance created for `/dev/rfcomm0` at 9600 baud with auto-reconnect
- Command validation accepting only F/B/L/R/S (single characters)
- Valid commands written to serial port for robot control
- Stop command ("S") sent automatically on WebSocket client disconnect
- Auto-reconnect logic with 2000ms retry interval for serial port
- Health check route at `/` returns JSON with `status` and `serialConnected` fields
- TypeScript types file created with interfaces for WebSocketMessage, ValidCommand, SerialPortConfig, ServerConfig
- `build()` function exported for testing purposes
- Console logs with timestamps for all events (connection, commands, errors, status changes)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create TypeScript Types for Backend** - `d104be6` (feat)
2. **Task 2: Set up Fastify Server with WebSocket and Serial Port** - `05a8a65` (feat)

**Plan metadata:** (to be added after SUMMARY commit)

## Files Created/Modified

- `apps/backend/src/types.ts` - TypeScript interfaces and types for WebSocket messages, commands, serial port config, and server config
- `apps/backend/src/index.ts` - Fastify server with WebSocket support, SerialPort connection, command validation, auto-reconnect, and stop-on-disconnect

## Decisions Made

- D-01: Use @fastify/websocket plugin — single Fastify server handles HTTP + WS, less code, aligned with MVP/minimal philosophy
- D-02: Plain console.log/console.error — zero dependencies, sufficient for local single-user MVP per PROJECT.md constraints
- D-03: Log and continue — log serial write failures and WS errors, send "S" on WS client disconnect
- D-04: Connect on server startup with 2000ms retry interval — not lazy-connect, simple retry for MVP
- D-05: Whitelist validation — only accept F/B/L/R/S commands, reject and log anything else

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- TypeScript type error with `@fastify/websocket`: The socket parameter in the WebSocket handler is actually a `SocketStream` object, not a raw WebSocket. The correct pattern is `const socket = connection.socket` to access the underlying WebSocket. This was discovered during typecheck and fixed by using the proper `SocketStream` pattern from @fastify/websocket documentation.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Backend foundation complete with WebSocket server and Serial Port connection
- Ready for frontend WebSocket client implementation (Phase 3)
- Serial port path `/dev/rfcomm0` and baud rate 9600 are fixed per DX-BT24 hardware spec
- Command validation whitelist established — frontend must send only F/B/L/R/S single characters

---
*Phase: 2-backend-websocket-bluetooth-serial*
*Completed: 2026-05-03*

## Self-Check: PASSED

All SUMMARY claims verified:
- Files created/modified exist on disk ✓
- Commit hashes d104be6 and 05a8a65 found in git log ✓
- Task 1 acceptance criteria all pass ✓
- Task 2 acceptance criteria all pass ✓
- Typecheck passes (verification step 1) ✓

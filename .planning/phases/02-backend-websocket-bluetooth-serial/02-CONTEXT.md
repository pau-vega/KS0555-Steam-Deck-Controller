# Phase 2: Backend — WebSocket + Bluetooth Serial - Context

**Gathered:** 2026-05-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Build Node.js backend that connects to DX-BT24 via serial port and bridges WebSocket commands to Bluetooth serial. Delivers: WebSocket server, serial connection to `/dev/rfcomm0` at 9600 baud, command forwarding, auto-reconnect, and stop-on-disconnect behavior.

</domain>

<decisions>
## Implementation Decisions

### WebSocket Transport
- **D-01:** Use `@fastify/websocket` — single Fastify server handles HTTP + WS, less code, aligned with MVP/minimal philosophy. Already in package.json dependencies.

### Logging
- **D-02:** Plain `console.log`/`console.error` — zero dependencies, sufficient for local single-user MVP per PROJECT.md constraints.

### Error Handling
- **D-03:** Log and continue — log serial write failures and WS errors. On WS client disconnect, send "S" to serial port and clean up. No retry logic for MVP.

### Serial Connection Lifecycle
- **D-04:** Connect on server startup (not lazy-connect). If `/dev/rfcomm0` not available, retry with fixed interval (e.g., every 2 seconds). No exponential backoff for MVP simplicity.

### Command Validation
- **D-05:** Whitelist validation — only accept F/B/L/R/S commands from WebSocket. Reject and log anything else. Backend is not a pass-through.

### the agent's Discretion
- Serial port path (`/dev/rfcomm0`) and baud rate (9600) are fixed per DX-BT24 hardware spec — agent should not change these.
- Fixed retry interval value (e.g., 2000ms) is left to agent discretion within reason.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/ROADMAP.md` — Phase 2 goal, requirements BACK-01 through BACK-06, SAFE-01, SAFE-02
- `.planning/REQUIREMENTS.md` — Full v1 requirements including BACK-01 through BACK-06, SAFE-01, SAFE-02

### Project Context
- `.planning/PROJECT.md` — MVP scope, constraints (low latency, simple Node.js, no auth), Arduino firmware is FIXED (F/B/L/R/S commands only)

### Backend Codebase
- `apps/backend/package.json` — Dependencies already include fastify, serialport, @fastify/websocket, ws
- `apps/backend/src/index.ts` — Entry point (currently empty, needs implementation)
- `apps/backend/tsconfig.json` — TypeScript config extends @ks0555/tsconfig

### Robot Protocol
- PROJECT.md "Context" section: Arduino accepts F, B, L, R, S commands + optional motor speed (u<number>#, v<number>#) — MVP scope is F/B/L/R/S only

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Fastify server**: Already set up in backend deps, use `@fastify/websocket` plugin for WS support
- **serialport library**: Already in dependencies (v12.0.0), ready to use for `/dev/rfcomm0` connection
- **vitest**: Already configured in backend for testing

### Established Patterns
- **TypeScript strict mode**: Backend uses `@ks0555/tsconfig` (node24 base)
- **tsx for dev**: `tsx watch src/index.ts` for development
- **ESLint**: Uses `packages/eslint-config/src/node.js` for linting

### Integration Points
- **Fastify server** (`apps/backend/src/index.ts`): Register `@fastify/websocket` plugin, handle WS connections
- **Serial port** (`/dev/rfcomm0` at 9600 baud): Open via `serialport` library, write commands from WS
- **WebSocket ↔ Serial bridge**: WS message → validate → write to serial; WS disconnect → write "S" to serial

</code_context>

<specifics>
## Specific Ideas

- Fixed retry interval for serial reconnect: 2000ms (2 seconds) — simple, predictable for MVP
- Serial port path is `/dev/rfcomm0` (standard Bluetooth RFCOMM device on Linux/Steam Deck)
- Baud rate is 9600 (DX-BT24 default UART baud rate)
- "S" (stop) command is the safety command — sent on WS disconnect and serial drop scenarios

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 2 scope.

</deferred>

---
*Phase: 2-Backend — WebSocket + Bluetooth Serial*
*Context gathered: 2026-05-03*

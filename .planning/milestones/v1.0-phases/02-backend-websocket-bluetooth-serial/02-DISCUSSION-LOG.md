# Phase 2: Backend — WebSocket + Bluetooth Serial - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-03
**Phase:** 2-Backend — WebSocket + Bluetooth Serial
**Areas discussed:** WebSocket transport, Logging, Error handling, Serial connection lifecycle, Serial reconnect, Command validation

---

## WebSocket Transport

| Option | Description | Selected |
|--------|-------------|----------|
| @fastify/websocket (Recommended) | Single Fastify server handles both HTTP + WS. Less code, aligned with MVP/minimal philosophy. Already in deps. | ✓ |
| ws (standalone) | Separate WebSocket server. More control over connection lifecycle, but adds complexity with two server instances. | |

**User's choice:** @fastify/websocket (Recommended)
**Notes:** Integrated approach preferred for MVP — less code, aligns with PROJECT.md minimal philosophy.

---

## Logging

| Option | Description | Selected |
|--------|-------------|----------|
| Plain console.log (Recommended) | Plain console.log/console.error. Simple, zero deps, sufficient for local MVP. | ✓ |
| Structured logger (pino) | Add a lightweight structured logger like pino. JSON logs, log levels, but adds a dependency. | |

**User's choice:** Plain console.log (Recommended)
**Notes:** MVP/minimal philosophy — zero deps, sufficient for local single-user device.

---

## Error Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Log + continue (Recommended) | Log and ignore serial write failures. Log WS errors. On WS disconnect, send 'S' to serial and clean up. | ✓ |
| Retry + state tracking | Retry serial writes N times on failure. Track connection state. More code, may over-engineer for MVP. | |

**User's choice:** Log + continue (Recommended)
**Notes:** Log errors, send 'S' on WS disconnect, no retry logic for MVP.

---

## Serial Connection Lifecycle

| Option | Description | Selected |
|--------|-------------|----------|
| Connect on startup (Recommended) | Try to open serial on server startup. If fails, log and retry with backoff until connected. | ✓ |
| Lazy-connect on first WS | Wait until first WebSocket client connects, then open serial. Delays serial setup but avoids startup failures. | |

**User's choice:** Connect on startup (Recommended)
**Notes:** Connect on startup, retry with fixed interval if /dev/rfcomm0 isn't ready.

---

## Serial Reconnect Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed interval (Recommended) | Simple: retry every N seconds (e.g., 2s) indefinitely. Easy to implement, fine for MVP. | ✓ |
| Exponential backoff | Wait 1s, then 2s, then 4s, up to a max (e.g., 30s). Avoids spamming if serial is unavailable long-term. | |

**User's choice:** Fixed interval (Recommended)
**Notes:** Simple fixed interval (e.g., 2s), MVP-appropriate. No exponential backoff needed.

---

## Command Validation

| Option | Description | Selected |
|--------|-------------|----------|
| Whitelist F/B/L/R/S (Recommended) | Only accept F/B/L/R/S. Reject and log anything else. Clean, MVP-aligned. | ✓ |
| Pass-through any string | Pass any string from WS to serial. Flexible, but could send garbage to the robot if frontend has a bug. | |

**User's choice:** Whitelist F/B/L/R/S (Recommended)
**Notes:** Reject anything outside F/B/L/R/S, log invalid messages. Backend enforces valid commands.

---

## the agent's Discretion

- Serial port path (`/dev/rfcomm0`) and baud rate (9600) — fixed per DX-BT24 hardware spec
- Fixed retry interval value — agent discretion within reason (discussed 2000ms)

## Deferred Ideas

None — discussion stayed within Phase 2 scope.

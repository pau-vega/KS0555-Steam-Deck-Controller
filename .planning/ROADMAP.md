# Roadmap: Steam Deck Robot Controller

## Phase1: Monorepo Foundation

**Goal:** Set up pnpm workspaces monorepo with frontend and backend apps, TypeScript configured, and working dev scripts.

**Requirements:** MONO-01, MONO-02, MONO-03, MONO-04

**Plans:** 4 plans

**Success Criteria:**
1. `pnpm install` from root installs all dependencies without errors
2. `pnpm dev` starts both frontend and backend development servers
3. Both apps have TypeScript configured with strict mode
4. Workspace structure has `apps/frontend`, `apps/backend`, and empty `packages/` directory

Plans:
- [x] 01-01-PLAN.md — Create shared tsconfig and eslint-config packages (Wave 1)
- [x] 01-02-PLAN.md — Set up backend with Fastify + TypeScript + Vitest (Wave 2)
- [x] 01-03-PLAN.md — Set up frontend with Vite + React + Tailwind + Vitest (Wave 2)
- [x] 01-04-PLAN.md — Configure turbo.json and root scripts (Wave 3)

---

## Phase2: Backend — WebSocket + Bluetooth Serial

**Goal:** Build Node.js backend that connects to DX-BT24 via serial port and bridges WebSocket commands to Bluetooth serial.

**Requirements:** BACK-01, BACK-02, BACK-03, BACK-04, BACK-05, BACK-06, SAFE-01, SAFE-02

**Plans:** 2 plans

**Success Criteria:**
1. WebSocket server starts and accepts connections on a configurable port
2. Serial connection to `/dev/rfcomm0` at 9600 baud establishes successfully
3. Sending "F" via WebSocket results in "F" written to serial port
4. Serial disconnection triggers auto-reconnect with backoff
5. WebSocket client disconnect triggers "S" written to serial port
6. Console logs show command receipt and serial status changes

Plans:
- [x] 02-01-PLAN.md — Set up Fastify server with WebSocket and Serial Port (Wave 1)
- [x] 02-02-PLAN.md — Add Vitest tests for command validation and WebSocket handling (Wave 2)

---

## Phase3: Frontend — React UI + Gamepad Control

**Goal:** Build React UI with connection status, manual buttons, gamepad support, and WebSocket communication.

**Requirements:** FRONT-01, FRONT-02, FRONT-03, FRONT-04, FRONT-05, FRONT-06, FRONT-07, FRONT-08

**Success Criteria:**
1. UI displays connection status that updates when WebSocket connects/disconnects
2. Manual buttons (F, B, L, R, S) send commands via WebSocket when clicked
3. Last sent command is displayed on screen
4. Gamepad stick input maps to correct robot commands with visible feedback
5. Analog stick deadzone prevents jitter from triggering commands
6. Commands only sent on direction change, not continuously
7. WebSocket auto-reconnects if backend restarts

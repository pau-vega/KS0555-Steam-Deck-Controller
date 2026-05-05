<!-- refreshed: 2026-05-05 -->
# Architecture

**Analysis Date:** 2026-05-05

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                  Steam Deck Controller UI                    │
│              `apps/frontend/src/app.tsx`                    │
├──────────────────┬──────────────────┬───────────────────────┤
│   ControlPad     │    StatusBar     │   App State Mgmt      │
│  `components/`  │  `components/`  │  `app.tsx` hooks     │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                     │
         ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Hooks Layer                      │
│              `hooks/use-bluetooth.ts`                        │
│              `hooks/use-gamepad.ts`                          │
└────────┬──────────────────────────────┬─────────────────────┘
         │                              │
         │ WebSocket (ws://localhost:3001/ws)
         │                              │
         ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend Server (Fastify)                  │
│              `apps/backend/src/index.ts`                    │
├──────────────────┬──────────────────┬───────────────────────┤
│  WebSocket API  │  Serial Port     │  Auto-Reconnect       │
│  `/ws` route    │  `/dev/rfcomm0` │  Logic                │
└──────────────────┴──────────────────┴───────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                 Serial Port (Bluetooth RFCOMM)              │
│               `serialConfig.path` in backend                 │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| App | Main application logic, state coordination | `apps/frontend/src/app.tsx` |
| ControlPad | Directional button pad UI component | `apps/frontend/src/components/control-pad.tsx` |
| StatusBar | Connection status display | `apps/frontend/src/components/status-bar.tsx` |
| useBluetooth | Web Bluetooth API integration | `apps/frontend/src/hooks/use-bluetooth.ts` |
| useGamepad | Steam Deck gamepad polling | `apps/frontend/src/hooks/use-gamepad.ts` |
| Backend Server | WebSocket server, serial port communication | `apps/backend/src/index.ts` |

## Pattern Overview

**Overall:** Client-Server architecture with real-time WebSocket communication

**Key Characteristics:**
- Monorepo with pnpm workspaces and Turbo task orchestration
- React frontend with hooks-based state management
- Fastify backend with WebSocket support for real-time command streaming
- Serial port communication for Bluetooth RFCOMM connection to robot
- TypeScript strict mode across all packages with shared tsconfig
- Command validation via whitelist pattern (F, B, L, R, S commands)

## Layers

**Workspace Root:**
- Purpose: Orchestrate builds, linting, testing, and dev across all workspaces
- Location: `/Users/pauvelascogarrofe/Documents/KS0555-Steam-Deck-Controller-2`
- Contains: Root `package.json`, Turbo configuration, shared tooling
- Depends on: pnpm workspaces, Turbo, shared dev dependencies
- Used by: All workspace packages through npm/pnpm resolution

**Packages (Shared Configurations):**
- Purpose: Shared, reusable configurations for TypeScript and ESLint
- Location: `/packages`
- Contains: tsconfig variants, ESLint configurations
- Depends on: TypeScript, ESLint plugins
- Used by: Apps and other packages via workspace dependencies

**TypeScript Config Package:**
- Purpose: Provide consistent TypeScript configuration across monorepo
- Location: `packages/tsconfig/`
- Contains: `tsconfig.json` (base), `tsconfig.node.json`, `tsconfig.react.json`
- Depends on: `@tsconfig/node22` (implied by target ES2022)
- Used by: All apps and packages via `extends` field

**ESLint Config Package:**
- Purpose: Provide consistent linting rules across monorepo
- Location: `packages/eslint-config/`
- Contains: `src/node.ts` (Node.js config), `src/react.ts` (React config)
- Depends on: typescript-eslint, eslint-plugin-react, eslint-plugin-perfectionist
- Used by: All apps via workspace dependencies

**Frontend Application:**
- Purpose: React-based controller interface for Steam Deck
- Location: `apps/frontend/`
- Contains: UI components, hooks, Vite config, Vitest tests
- Depends on: React 19, Vite 8, Tailwind CSS 4, Web Bluetooth API
- Used by: End users controlling the robot

**Backend Server:**
- Purpose: Bridge between WebSocket clients and serial port (robot)
- Location: `apps/backend/`
- Contains: Fastify server, WebSocket handling, serial port communication
- Depends on: Fastify, @fastify/websocket, serialport, ws
- Used by: Frontend app via WebSocket connection

## Data Flow

### Primary Request Path (User Input → Robot Movement)

1. User presses button or moves gamepad stick (`apps/frontend/src/components/control-pad.tsx:27` or `apps/frontend/src/hooks/use-gamepad.ts:45`)
2. Direction state updates in `useGamepad` hook or `ControlPad` onClick handler (`apps/frontend/src/app.tsx:11-13`)
3. `useEffect` detects direction change, calls `sendCommand` (`apps/frontend/src/app.tsx:24-29`)
4. `sendCommand` calls `useBluetooth.send()` with direction command (`apps/frontend/src/app.tsx:16-22`)
5. Bluetooth characteristic writes value via Web Bluetooth API (`apps/frontend/src/hooks/use-bluetooth.ts:50`)
6. Backend WebSocket receives message (`apps/backend/src/index.ts:76-100`)
7. Command validated against whitelist (`apps/backend/src/index.ts:81`)
8. Valid command written to serial port (`apps/backend/src/index.ts:88-95`)
9. Serial port (RFCOMM Bluetooth) transmits to robot

### WebSocket Connection Flow

1. Frontend calls `useBluetooth.connect()` (`apps/frontend/src/hooks/use-bluetooth.ts:14-45`)
2. Web Bluetooth API requests device with filter "BT24" (`apps/frontend/src/hooks/use-bluetooth.ts:22-25`)
3. GATT server connects, gets service and characteristic (`apps/frontend/src/hooks/use-bluetooth.ts:37-39`)
4. Connection state updates to "connected" (`apps/frontend/src/hooks/use-bluetooth.ts:41`)
5. Backend WebSocket route `/ws` accepts connection (`apps/backend/src/index.ts:69`)
6. Server sends connection confirmation (`apps/backend/src/index.ts:74`)

### Reconnection Flow

1. WebSocket disconnects (`apps/backend/src/index.ts:102-114`)
2. Backend sends "S" (stop) command to serial port for safety (`apps/backend/src/index.ts:105-113`)
3. Serial port closes (`apps/backend/src/index.ts:52-56`)
4. Backend auto-reconnects serial port after 2 seconds (`apps/backend/src/index.ts:55`)
5. Frontend detects Bluetooth disconnect (`apps/frontend/src/hooks/use-bluetooth.ts:27-30`)
6. State returns to "disconnected" (`apps/frontend/src/hooks/use-bluetooth.ts:28`)

**State Management:**
- Frontend: React useState/useRef hooks for local component state
- Backend: Module-level variables for serialPort instance
- No centralized state management library (Redux, Zustand, etc.)
- Props passed down from App to components
- Commands flow up via callbacks (onCommand pattern)

## Key Abstractions

**Direction Type:**
- Purpose: Type-safe command representation
- Examples: `apps/frontend/src/types.ts`, `apps/backend/src/types.ts`
- Pattern: String literal union type `"F" | "B" | "L" | "R" | "S"`
- Used in both frontend and backend for type safety

**ValidCommand Validation:**
- Purpose: Whitelist validation for incoming WebSocket commands
- Location: `apps/backend/src/types.ts:20-22`
- Pattern: Set-based lookup with type guard function
- Prevents invalid commands from reaching serial port

**useBluetooth Hook:**
- Purpose: Encapsulate Web Bluetooth API complexity
- Location: `apps/frontend/src/hooks/use-bluetooth.ts`
- Pattern: Custom hook with state machine (disconnected/connecting/connected/unsupported)
- Returns: `{ connected, connecting, unsupported, connect, send }`

**useGamepad Hook:**
- Purpose: Poll Steam Deck gamepad and convert to directions
- Location: `apps/frontend/src/hooks/use-gamepad.ts`
- Pattern: requestAnimationFrame loop with deadzone filtering
- Returns: `{ direction, gamepadConnected }`

## Entry Points

**Development Mode (Turbo):**
- Location: `turbo.json` → `pnpm dev`
- Triggers: `turbo dev` runs parallel dev processes for all packages
- Responsibilities: Coordinate workspace development builds with watch mode

**Frontend Development Server:**
- Location: `apps/frontend/src/main.tsx`
- Triggers: `vite` command (via `pnpm dev:frontend`)
- Responsibilities: Initialize React app, render App component with StrictMode
- Code: Imports global styles, mounts App to DOM root element

**Frontend Application:**
- Location: `apps/frontend/src/app.tsx`
- Triggers: Called from main.tsx
- Responsibilities: Coordinate Bluetooth connection, gamepad input, command sending
- Pattern: Uses hooks for Bluetooth and gamepad, effects for direction change detection

**Backend Server:**
- Location: `apps/backend/src/index.ts:138-152`
- Triggers: `tsx src/index.ts` (via `pnpm dev:backend`)
- Responsibilities: Start Fastify server, connect serial port, handle WebSocket
- Conditional: Only starts if file run directly (not imported for testing)

**Backend Factory Function:**
- Location: `apps/backend/src/index.ts:21-135`
- Triggers: Called by start() or by tests
- Responsibilities: Create configured Fastify instance with WebSocket support
- Exported: `export default function build()` for testability

## Architectural Constraints

- **Threading:** Single-threaded Node.js event loop in backend; browser main thread in frontend with requestAnimationFrame
- **Global state:** Backend has module-level `serialPort` variable in `apps/backend/src/index.ts:28`; frontend state isolated to React components
- **Circular imports:** Not applicable in this small codebase; clear dependency direction
- **WebSocket connection:** One-way command flow (client → server); server sends JSON status messages only
- **Serial port path:** Hardcoded to `/dev/rfcomm0` in `apps/backend/src/index.ts:16`; not configurable via env vars
- **Bluetooth device filter:** Hardcoded to "BT24" device name in `apps/frontend/src/hooks/use-bluetooth.ts:23`

## Anti-Patterns

### useState for Previous Value Tracking

**What happens:** Using `useRef` to track previous direction value alongside `useState` for current direction
**Why it's wrong:** Creates two sources of truth; can lead to stale closures or missed updates
**Do this instead:** Use `useRef` alone or combine with useEffect properly. Example from `apps/frontend/src/app.tsx:14`:
```typescript
const prevDirection = useRef<Direction>("S")
// Later in effect:
if (direction !== prevDirection.current) {
  sendCommand(direction)
  prevDirection.current = direction
}
```

### Mixed Type Definitions

**What happens:** Direction type defined in both `apps/frontend/src/types.ts` and `apps/frontend/src/hooks/use-gamepad.ts:3`
**Why it's wrong:** Duplicate type definitions can drift apart; violates DRY principle
**Do this instead:** Export from single location (`apps/frontend/src/types.ts`) and import in hooks

### Hardcoded Configuration

**What happens:** Serial port path, baud rate, Bluetooth device name, and server port are hardcoded
**Why it's wrong:** Reduces flexibility; requires code changes for different environments
**Do this instead:** Use environment variables with defaults. Example from `apps/backend/src/index.ts:10-18`:
```typescript
const serverConfig: ServerConfig = {
  port: parseInt(process.env.PORT || "3001", 10),
  host: process.env.HOST || "0.0.0.0",
}
// But serial config still hardcoded:
const serialConfig: SerialPortConfig = {
  path: "/dev/rfcomm0", // Should be process.env.SERIAL_PATH || "/dev/rfcomm0"
  baudRate: 9600,
}
```

## Error Handling

**Strategy:** Graceful degradation with user feedback

**Patterns:**
- Frontend: Bluetooth state machine shows "connecting", "connected", "unsupported" states
- Backend: try-catch around Bluetooth connection; auto-reconnect on serial port errors
- WebSocket: Error events logged; invalid commands return error JSON messages
- Serial port: Write errors logged; port auto-reconnects on close/error

## Cross-Cutting Concerns

**Logging:**
- Frontend: No logging framework; uses browser console for debugging
- Backend: Fastify built-in logger (`server.log.info/error`); plus custom `log()` and `logError()` functions with timestamps (`apps/backend/src/index.ts:31-37`)

**Validation:**
- Backend: `isValidCommand()` whitelist validation for WebSocket messages (`apps/backend/src/types.ts:20-22`)
- Frontend: Relies on TypeScript types; no runtime validation

**Authentication:**
- None: WebSocket server accepts all connections
- Bluetooth: Web Bluetooth API handles device pairing; no application-level auth

**Styling:**
- Tailwind CSS 4 with utility classes
- Custom CSS variables in `apps/frontend/src/index.css`
- Class naming: `bg-surface`, `border-border`, `text-accent` (Tailwind theme)

**Testing:**
- Frontend: Vitest + jsdom + @testing-library/react (`apps/frontend/vitest.config.ts`)
- Backend: Vitest + Node environment (`apps/backend/vitest.config.ts`)
- Test files co-located with source: `*.test.tsx` and `*.test.ts`

---

*Architecture analysis: 2026-05-05*

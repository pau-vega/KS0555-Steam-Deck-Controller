# Phase 3: Frontend — React UI + Gamepad Control - Context

**Gathered:** 2026-05-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Build React UI with connection status, manual buttons, gamepad support, and WebSocket communication. Delivers: UI displays connection status, manual control buttons (F/B/L/R/S), gamepad integration via navigator.getGamepads(), WebSocket auto-reconnect, deadzone handling, and direction-change-only command sending.

**Significant code already exists** in `apps/frontend/src/`:
- `app.tsx` — Main component with WS + Gamepad hooks
- `hooks/use-websocket.ts` — WebSocket hook with auto-reconnect
- `hooks/use-gamepad.ts` — Gamepad polling with deadzone (0.15)
- `components/control-pad.tsx` — Manual buttons (F/B/L/R/S)
- `components/status-bar.tsx` — Connection status display
- `types.ts` — Direction type

Phase work includes: Tailwind CSS migration, env-based WebSocket URL config, status display refinements, and test suite implementation.

</domain>

<decisions>
## Implementation Decisions

### Styling approach
- **D-01:** Full migration to Tailwind utilities — remove all component CSS files (control-pad.css, status-bar.css, app.css)
- **D-02:** Use Tailwind v4 @theme directive in index.css for custom dark theme colors (preserve current aesthetic: #1a1a2e, #16213e, #0f3460, #e94560 as semantic names)
- **D-03:** All styling moves to JSX className — no component-level CSS files remain

### WebSocket URL config
- **D-04:** Use Vite env variable `VITE_WS_URL` for full WebSocket URL (e.g., `ws://localhost:3001`)
- **D-05:** Default port is 3001 (matching Phase 1 decision D-03), not 8080 (current hardcoded value)
- **D-06:** `useWebSocket` hook reads `import.meta.env.VITE_WS_URL` internally — no URL parameter needed
- **D-07:** Create `.env` file at `apps/frontend/.env` with `VITE_WS_URL=ws://localhost:3001`

### Connection status display
- **D-08:** Label status as "Backend" (not "WebSocket") — user-facing label should be meaningful
- **D-09:** Show 2 indicators: Backend + Gamepad (current count preserved)
- **D-10:** Keep colored pill badge style (green for connected, red for disconnected)
- **D-11:** Show "Connecting..." state while WebSocket is reconnecting (2s interval)

### Test strategy
- **D-12:** Unit test both hooks (useWebSocket, useGamepad) and both components (ControlPad, StatusBar)
- **D-13:** Mock WebSocket with `vi.fn` for hook tests
- **D-14:** Mock `navigator.getGamepads` for gamepad hook tests
- **D-15:** Component tests verify render + interaction (button clicks fire onCommand, disabled state works, status labels correct)
- **D-16:** Key scenarios covered, no coverage gate enforced — ~10-15 tests total

### Prior decisions carried forward (from Phase 1)
- **D-17:** Vite + React + TypeScript (Phase 1 D-09)
- **D-18:** Native browser WebSocket API (Phase 1 D-17)
- **D-19:** JSON message format `{ type: "command", ... }` (Phase 1 D-19)
- **D-20:** Vitest + @testing-library/react for testing (Phase 1 D-14)
- **D-21:** Path alias `@` maps to `src/` (Phase 1 D-15)

### Inconsistencies to resolve during implementation
- Current code sends `{ type: "command", command: cmd }` — Phase 1 D-19 specified `{ type: "command", data: "F" }`. Agent should align with Phase 1 decision or update backend accordingly.
- Current code uses `gamepads[0]` — may need to find the Steam Deck gamepad by ID if multiple gamepads are detected.
- Existing `.js` files alongside `.ts/.tsx` files should be cleaned up (build artifacts).

### the agent's Discretion
- Exact Tailwind class names for button styling (hover, active, disabled states) — agent picks utilities matching current visual behavior
- Specific test case names and organization — agent structures tests logically
- Exact color token names in @theme (e.g., `--color-surface`, `--color-accent`) — agent picks semantic names
- Whether to use `lucide-react` icons (already in monorepo template deps) for status indicators

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Definition
- `.planning/ROADMAP.md` §Phase 3 — Goal, requirements FRONT-01 through FRONT-08, success criteria
- `.planning/REQUIREMENTS.md` — Full v1 frontend requirements (FRONT-01 through FRONT-08)

### Project Context
- `.planning/PROJECT.md` — MVP scope, constraints (Steam Deck Desktop Mode, low latency, simple React UI)
- `.planning/PROJECT.md` §Key Decisions — Gamepad API via browser decision
- `.planning/phases/01-monorepo-foundation/01-CONTEXT.md` — Phase 1 decisions (D-09 through D-21) carried forward

### Frontend Codebase
- `apps/frontend/src/app.tsx` — Current main component (needs WS URL config update, Tailwind migration)
- `apps/frontend/src/hooks/use-websocket.ts` — WebSocket hook (needs env-based URL, connecting state)
- `apps/frontend/src/hooks/use-gamepad.ts` — Gamepad hook (already has deadzone + direction detection)
- `apps/frontend/src/components/control-pad.tsx` — Manual buttons component (needs Tailwind migration)
- `apps/frontend/src/components/status-bar.tsx` — Status display (needs label change to "Backend")
- `apps/frontend/src/types.ts` — Direction type definition
- `apps/frontend/package.json` — Dependencies (Tailwind installed but unused, testing deps ready)
- `apps/frontend/vite.config.ts` — Vite config (needs env validation if applicable)

### Backend Integration
- `apps/backend/src/index.ts` — Backend entry point (WebSocket server on port 3001)
- `.planning/phases/02-backend-websocket-bluetooth-serial/02-CONTEXT.md` — Phase 2 decisions (WS server, message handling)

### Shared Configuration
- `packages/tsconfig/tsconfig.react.json` — Frontend TypeScript config
- `packages/eslint-config/src/react.ts` — Frontend ESLint preset
- `.planning/codebase/STACK.md` — Full stack analysis (React 19.2.5, Vite 8.0.8, Tailwind 4.2.2)
- `.planning/codebase/CONVENTIONS.md` — Naming patterns, code style conventions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **useWebSocket hook** (`apps/frontend/src/hooks/use-websocket.ts`): Already implements connect, disconnect, auto-reconnect (2s interval), send. Needs env-based URL and connecting state.
- **useGamepad hook** (`apps/frontend/src/hooks/use-gamepad.ts`): Already implements rAF polling, deadzone (0.15), direction detection (F/B/L/R/S), gamepad connect/disconnect events.
- **ControlPad component** (`apps/frontend/src/components/control-pad.tsx`): Already implements 5-button grid layout with command dispatch. Needs Tailwind migration.
- **StatusBar component** (`apps/frontend/src/components/status-bar.tsx`): Already implements dual status display. Needs label change ("Backend" instead of "WebSocket").
- **Direction type** (`apps/frontend/src/types.ts`): Shared type "F" | "B" | "L" | "R" | "S".

### Established Patterns
- **TypeScript strict mode**: Frontend uses `@ks0555/tsconfig` (react base)
- **Vite + React**: apps/frontend already scaffolded with this stack
- **Tailwind CSS 4.2.2**: Installed in frontend deps, needs @import in index.css
- **Vitest + @testing-library/react**: Ready for test implementation
- **Named exports only**: No default exports per project conventions
- **kebab-case file naming**: control-pad.tsx, status-bar.tsx, use-gamepad.ts, use-websocket.ts

### Integration Points
- **WebSocket URL**: Currently hardcoded `ws://localhost:8080` in app.tsx:12 — needs env-based config
- **Backend port**: Phase 1 decided 3001, current code uses 8080 — must align
- **Message format**: Frontend sends `{ type: "command", command: cmd }` — verify backend expects this format
- **Tailwind setup**: Need `@import 'tailwindcss'` in index.css and remove component CSS files
- **Cleanup**: Remove duplicate `.js` files (build artifacts alongside `.ts/.tsx`)

</code_context>

<specifics>
## Specific Ideas

- Dark theme colors to preserve via @theme: background (#1a1a2e), surface (#16213e), border (#0f3460), accent (#e94560), success green (#1b4332 / #95d5b2), error red (#3d0000 / #ff6b6b)
- Control button grid: 3x3 layout with buttons at positions (1,2), (2,1), (2,2), (2,3), (3,2)
- Stop button (S) has distinct styling: darker red background, red border
- Gamepad deadzone threshold: 0.15 (already implemented, keep this value)
- WebSocket reconnect interval: 2000ms (already implemented, keep this value)
- Steam Deck Desktop Mode target: Chromium browser with Gamepad API support

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 3-Frontend — React UI + Gamepad Control*
*Context gathered: 2026-05-04*

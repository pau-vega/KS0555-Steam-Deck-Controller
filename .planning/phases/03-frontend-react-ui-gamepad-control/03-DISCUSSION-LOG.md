# Phase 3: Frontend — React UI + Gamepad Control - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-04
**Phase:** 03-frontend-react-ui-gamepad-control
**Areas discussed:** Styling approach, WebSocket URL config, Connection status display, Test strategy

---

## Styling approach

| Option | Description | Selected |
|--------|-------------|----------|
| Migrate to Tailwind utilities | Consistent with Phase 1 decision (D-13). Requires rewriting existing CSS but aligns with monorepo template patterns. | ✓ |
| Keep plain CSS | Existing CSS works, is simple, and is already written. Faster to ship. Breaks Phase 1 decision. | |
| Hybrid — Tailwind + CSS modules | Use Tailwind for layout/spacing but keep custom CSS for complex button states. | |

**User's choice:** Migrate to Tailwind utilities

**Follow-up: Migration approach**

| Option | Description | Selected |
|--------|-------------|----------|
| Full Tailwind migration | Add @import 'tailwindcss' to index.css, remove all .css files, use Tailwind classes in JSX. | ✓ |
| Tailwind CSS-first config | Keep CSS files but use @theme directive and Tailwind's CSS-first config. | |

**User's choice:** Full Tailwind migration

**Follow-up: Dark theme colors**

| Option | Description | Selected |
|--------|-------------|----------|
| Tailwind @theme with custom colors | Define colors in @theme block with semantic names (bg-surface, text-primary, border-accent). | ✓ |
| Default Tailwind palette | Use built-in slate/blue/red palette. Loses exact current aesthetic. | |
| Preserve current color scheme exactly | Keep exact hex values as custom Tailwind colors. | |

**User's choice:** Tailwind @theme with custom colors

**Follow-up: CSS file cleanup**

| Option | Description | Selected |
|--------|-------------|----------|
| Remove all component CSS files | Delete control-pad.css, status-bar.css, app.css. All styling in JSX. | ✓ |
| Keep only index.css for @theme | Keep index.css for @theme and resets, remove component-level CSS files. | |

**User's choice:** Remove all component CSS files

---

## WebSocket URL config

| Option | Description | Selected |
|--------|-------------|----------|
| Vite env variable | Use VITE_WS_URL env var. Create .env with default. Steam Deck users can override. | ✓ |
| Config file (src/config.ts) | Simple JS config object. No build-time dependency, easy to edit. | |
| Hardcoded constant | Hardcode ws://localhost:3001. Simplest for MVP. | |

**User's choice:** Vite env variable

**Follow-up: Default port**

| Option | Description | Selected |
|--------|-------------|----------|
| Port 3001 (Phase 1 decision) | Match Phase 1 decision D-03. Backend default is 3001. | ✓ |
| Keep 8080 (current code) | 8080 is what's currently in the code. | |
| You decide | Let user decide. | |

**User's choice:** Port 3001 (Phase 1 decision)

**Follow-up: Env variable format**

| Option | Description | Selected |
|--------|-------------|----------|
| Full URL in env variable | VITE_WS_URL=ws://localhost:3001. Flexible — can change host too. | ✓ |
| Only port in env variable | VITE_WS_PORT=3001. Construct URL in code. | |

**User's choice:** Full URL in env variable

**Follow-up: Hook API design**

| Option | Description | Selected |
|--------|-------------|----------|
| Hook reads env internally | useWebSocket() — no URL parameter needed. Cleaner API. | ✓ |
| Keep URL parameter in hook | useWebSocket(url) — pass env value from App. More flexible for testing. | |

**User's choice:** Hook reads env internally

---

## Connection status display

| Option | Description | Selected |
|--------|-------------|----------|
| Show WebSocket as 'Backend Connected' | Show 'Backend' instead of 'WebSocket'. Backend's WS connection implies it can reach the robot. | ✓ |
| Backend reports Bluetooth status | Backend sends periodic 'serial_connected' status. More accurate but requires backend changes. | |
| Show both WS + Bluetooth status | Show both: WebSocket + whether backend reports serial connected. Requires backend changes. | |

**User's choice:** Show WebSocket as 'Backend Connected'

**Follow-up: Number of indicators**

| Option | Description | Selected |
|--------|-------------|----------|
| 2 indicators — Backend + Gamepad | Keep current 2 indicators. Clean, minimal, covers what frontend knows. | ✓ |
| Single 'Ready' indicator | Single indicator showing overall system readiness. Less diagnostic info. | |
| Add inferred 'Robot' status | Third indicator confirmed when first command succeeds. | |

**User's choice:** 2 indicators — Backend + Gamepad

**Follow-up: Visual style**

| Option | Description | Selected |
|--------|-------------|----------|
| Colored pill badges (current style) | Keep current pill-style badges with green/red backgrounds. | ✓ |
| Dot indicators with text | Use dot indicators next to text labels. More compact. | |
| Icon-based status | Use icons (check/x, wifi/gamepad icons from lucide-react). | |

**User's choice:** Colored pill badges (current style)

**Follow-up: Reconnecting state**

| Option | Description | Selected |
|--------|-------------|----------|
| Show connecting state | Show 'Connecting...' text or spinner during 2s reconnect interval. | ✓ |
| Only show connected/disconnected | Just show disconnected (red). Simpler but user doesn't know if it's trying. | |

**User's choice:** Show connecting state

---

## Test strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Unit test hooks + components | Test hooks with mocked APIs. Test component rendering and click handlers. | ✓ |
| Component tests only | Test components render correctly. Hooks tested implicitly. | |
| Hook tests only | Test hooks in isolation. Components visually tested via running app. | |

**User's choice:** Unit test hooks + components

**Follow-up: WebSocket testing**

| Option | Description | Selected |
|--------|-------------|----------|
| Mock WebSocket with vi.fn | Use vi.mock to mock WebSocket constructor. Standard approach. | ✓ |
| Real WebSocket test server | Create real WebSocket server in tests using 'ws' library. More complex. | |
| Test via factory injection | Extract WS logic into injectable factory. More refactoring. | |

**User's choice:** Mock WebSocket with vi.fn

**Follow-up: Gamepad testing**

| Option | Description | Selected |
|--------|-------------|----------|
| Mock navigator.getGamepads | Mock to return fake gamepad objects with different axis values. | ✓ |
| Test pure function only | Test getDirectionFromAxes directly without mocking browser APIs. | |
| Both pure function + hook | Test direction function AND hook-level behavior. | |

**User's choice:** Mock navigator.getGamepads

**Follow-up: Component test scope**

| Option | Description | Selected |
|--------|-------------|----------|
| Render + interaction tests | Test ControlPad renders 5 buttons, click fires onCommand, disabled state works. | ✓ |
| Snapshot tests | Fast to write but brittle on styling changes. | |
| Accessibility-focused tests | Accessibility checks, keyboard navigation, screen reader labels. | |

**User's choice:** Render + interaction tests

**Follow-up: Test coverage**

| Option | Description | Selected |
|--------|-------------|----------|
| Key scenarios, no coverage gate | 10-15 focused tests covering happy paths and key edge cases. No coverage threshold. | ✓ |
| Aim for 80%+ coverage | Set 80% coverage threshold. More comprehensive but slower. | |
| Minimum: critical paths only | 5-8 tests for WebSocket reconnect, gamepad deadzone, button dispatch. | |

**User's choice:** Key scenarios, no coverage gate

---

## the agent's Discretion

- Exact Tailwind class names for button styling (hover, active, disabled states)
- Specific test case names and organization
- Exact color token names in @theme (e.g., --color-surface, --color-accent)
- Whether to use lucide-react icons for status indicators
- Cleanup of existing .js build artifact files
- Alignment of message format between frontend ({ type: "command", command: cmd }) and Phase 1 decision ({ type: "command", data: "F" })

## Deferred Ideas

None — discussion stayed within phase scope.

---

*Phase: 3-Frontend — React UI + Gamepad Control*
*Discussion logged: 2026-05-04*

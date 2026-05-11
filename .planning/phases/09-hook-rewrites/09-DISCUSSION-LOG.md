# Phase 9: Hook Rewrites - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-06
**Phase:** 9-Hook Rewrites
**Areas discussed:** send() error handling, Direction type source, connect() wrapping

---

## send() error handling

| Option | Description | Selected |
|--------|-------------|----------|
| Fire-and-forget (void) | void invoke('ble_send', { command: data }) — silently ignore, matches current behavior exactly | ✓ |
| Catch and console.error | Catch promise rejection, log to console for debug visibility, no UI change | |

**User's choice:** Fire-and-forget (void)
**Notes:** No connection guard needed — Rust returns Err if disconnected, silently ignored.

| Option | Description | Selected |
|--------|-------------|----------|
| No, invoke handles it | Rust ble_send returns Err if not connected — fire-and-forget means errors are silently ignored regardless | ✓ |
| Yes, skip if disconnected | Guard: if state !== 'connected', return early | |

**User's choice:** No, invoke handles it
**Notes:** — | — | — |

| Option | Description | Selected |
|--------|-------------|----------|
| useCallback (stable ref) | Matches current pattern. send is a dependency in app.tsx sendCommand — stable ref avoids effect re-runs | ✓ |
| Plain function | Simpler code, sendCommand recreates but cost is trivial | |

**User's choice:** useCallback (stable ref)

**connect() error handling:**

| Option | Description | Selected |
|--------|-------------|----------|
| Set disconnected, re-throw | setState('disconnected') then throw. Consumer catches with try/catch | ✓ |
| Set disconnected, no throw | setState('disconnected'), error consumed silently | |

**User's choice:** Set disconnected, re-throw

---

## Direction type source

| Option | Description | Selected |
|--------|-------------|----------|
| Import from src/types.ts | Single source of truth — both app.tsx and types.ts already define it there | ✓ |
| Keep local type | Self-contained hook, no import coupling to types.ts | |

**User's choice:** Import from src/types.ts

| Option | Description | Selected |
|--------|-------------|----------|
| Inline type in listen call | listen<{ direction: Direction }>('gamepad-direction', callback) | ✓ |
| Named interface | Define interface GamepadDirectionPayload { direction: Direction } at top of hook file | |

**User's choice:** Inline type in listen call

| Option | Description | Selected |
|--------|-------------|----------|
| Define inline | type BleState = 'disconnected' | 'connecting' | 'connected' — local, self-contained | ✓ |
| Export from types.ts | Shared type in types.ts if other files need it (currently only useBluetooth needs it) | |

**User's choice:** Define inline

---

## connect() wrapping

| Option | Description | Selected |
|--------|-------------|----------|
| useCallback (stable ref) | Matches current pattern, avoids unnecessary re-renders when passed as onClick prop | ✓ |
| Plain function | Simpler code, re-render cost trivial | |

**User's choice:** useCallback (stable ref)

| Option | Description | Selected |
|--------|-------------|----------|
| Set connecting first | setState('connecting') then await invoke('ble_connect') — immediate visual feedback | ✓ |
| invoke handles it | Rust ble_connect emits 'ble-state-changed' with 'connecting' immediately | |

**User's choice:** Set connecting first

| Option | Description | Selected |
|--------|-------------|----------|
| In a useEffect (runs once on mount) | Set up listener in useEffect with empty deps. Listener ready before user clicks Connect | ✓ |
| Inside connect() after setConnecting | Set up listener right before calling invoke | |

**User's choice:** In a useEffect (runs once on mount)

---

## the agent's Discretion

- Return shapes are fixed — no additions or removals
- `unsupported` always `false`
- `send` fire-and-forget, `connect` catch-and-rethrow

## Deferred Ideas

None — discussion stayed within Phase 9 scope.

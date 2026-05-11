# Phase 8: Gamepad Monitoring with gilrs - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-06
**Phase:** 8-Gamepad Monitoring with gilrs
**Areas discussed:** Thread spawn strategy, Event emission pattern, Gamepad discovery, Direction change guard

---

## Thread Spawn Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| std::thread::spawn (Recommended) | Simpler, blocks on gilrs next_event(). Clone AppHandle (Arc wrapped) and move into thread. Matches typical gilrs examples. | ✓ |
| tauri::async_runtime::spawn | Uses Tauri's tokio runtime. Requires gilrs next_event() to be non-blocking or wrap in task::spawn_blocking. More complex. | |
| You decide | Let the planner pick based on code simplicity and Tauri v2 best practices. | |

**User's choice:** std::thread::spawn (Recommended)

---

## AppHandle Sharing

| Option | Description | Selected |
|--------|-------------|----------|
| Clone + move (Recommended) | AppHandle implements Clone and Send. Clone it in setup() and move into the thread. Simplest pattern. | ✓ |
| Arc<AppHandle> | Wrap in Arc for shared ownership. More explicit about thread safety but adds indirection. | |
| You decide | Planner picks based on Tauri v2 patterns in the codebase. | |

**User's choice:** Clone + move (Recommended)

---

## Thread Spawn Timing

| Option | Description | Selected |
|--------|-------------|----------|
| In setup() hook (Recommended) | Matches BLE pattern from Phase 7 — spawn during Tauri setup(). Gamepad monitoring starts immediately. | ✓ |
| Lazy spawn on first listen() | Spawn thread only when frontend first calls listen('gamepad-direction'). More complex — need lazy init flag. | |
| You decide | Planner chooses based on simplicity and Phase 7 patterns. | |

**User's choice:** In setup() hook (Recommended)

---

## Thread Lifecycle

| Option | Description | Selected |
|--------|-------------|----------|
| None needed (Recommended) | gilrs next_event() blocks; thread exits when main() drops. Simple, no cleanup needed. | ✓ |
| Shutdown flag (Arc<AtomicBool>) | Set flag on app exit to signal thread to stop. Requires more state management. | |
| You decide | Planner picks based on Tauri lifecycle patterns. | |

**User's choice:** None needed (Recommended)

---

## Event Payload - gamepad-direction

| Option | Description | Selected |
|--------|-------------|----------|
| Direction char only (Recommended) | Payload: { direction: 'F' }. Simple, matches current use-gamepad.ts return shape. | ✓ |
| Full gamepad state | Payload: { direction: 'F', axes: [x, y], timestamp: ... }. More data but unused. | |
| You decide | Planner picks based on hook interface stability requirements. | |

**User's choice:** Direction char only (Recommended)

---

## Event Payload - gamepad-connected/disconnected

| Option | Description | Selected |
|--------|-------------|----------|
| Name only (Recommended) | Payload: { name: 'Steam Deck Controller' }. Simple, frontend just needs connected/disconnected state. | ✓ |
| Full info | Payload: { name, id, index, ... }. More data but useGamepad() only tracks boolean. | |
| You decide | Planner picks based on frontend needs. | |

**User's choice:** Name only (Recommended)

---

## Event Rate Limiting

| Option | Description | Selected |
|--------|-------------|----------|
| No limit (Recommended) | Direction change guard already prevents spam. gilrs next_event() is event-driven, not polling. | ✓ |
| Throttle (e.g., 60fps) | Add minimum interval between events. Overkill since direction change guard already prevents spam. | |
| You decide | Planner evaluates if rate limiting adds value. | |

**User's choice:** No limit (Recommended)

---

## Emit Error Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Ignore silently (Recommended) | If frontend isn't listening yet, events are lost. Not critical — next gamepad move re-emits. | ✓ |
| Log and continue | eprintln!() on emit failure. More debug info but adds noise. | |
| You decide | Planner picks based on Tauri error handling patterns from Phase 7. | |

**User's choice:** Ignore silently (Recommended)

---

## Gamepad Selection

| Option | Description | Selected |
|--------|-------------|----------|
| First 'Steam' named (Recommended) | Filter gamepads by name contains 'Steam'. Matches current use-gamepad.ts logic. | ✓ |
| All gamepads (multi) | Monitor all connected gamepads and emit per-gamepad events. More complex, not needed. | |
| You decide | Planner picks based on requirements GPAD-05. | |

**User's choice:** First 'Steam' named (Recommended)

---

## Initial Gamepad Discovery

| Option | Description | Selected |
|--------|-------------|----------|
| Wait and retry (Recommended) | next_event() already blocks until EventType::Connected. gilrs fires Connected event when controller initializes. | ✓ |
| Poll gamepads() periodically | Active polling if next_event() misses initial state. More complex but catches edge cases. | |
| You decide | Planner picks based on gilrs event model. | |

**User's choice:** Wait and retry (Recommended)

---

## Multiple Steam Gamepads

| Option | Description | Selected |
|--------|-------------|----------|
| Ignore others (Recommended) | First 'Steam' gamepad wins. Simple, matches single-robot use case. | ✓ |
| Emit for all Steam gamepads | Track multiple gamepads, emit per-gamepad events. More complex, not needed for MVP. | |
| You decide | Planner picks based on single-robot constraint. | |

**User's choice:** Ignore others (Recommended)

---

## Gamepad Reconnection

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-reconnect (Recommended) | On Disconnected event, wait for new Connected event. Same pattern as BLE auto-reconnect (D-25). | ✓ |
| Manual re-init needed | Frontend must call something to re-subscribe. More complex, not needed — gilrs fires new Connected event. | |
| You decide | Planner picks based on Phase 7 auto-reconnect pattern. | |

**User's choice:** Auto-reconnect (Recommended)

---

## Direction Change Guard Location

| Option | Description | Selected |
|--------|-------------|----------|
| In gilrs thread (Recommended) | Store last_direction in thread local state. Check before emitting. Matches use-gamepad.ts pattern. | ✓ |
| Frontend listener | Always emit from Rust, let frontend ignore duplicates. More events cross Tauri boundary, wasteful. | |
| You decide | Planner picks based on low latency requirement. | |

**User's choice:** In gilrs thread (Recommended)

---

## Axes for Direction

| Option | Description | Selected |
|--------|-------------|----------|
| LeftStickX + LeftStickY (Recommended) | Matches current use-gamepad.ts and getDirectionFromAxes(). Same logic, ported to gilrs. | ✓ |
| All sticks + D-pad | Monitor more inputs. Overkill for robot control — only left stick needed. | |
| You decide | Planner picks based on current use-gamepad.ts logic. | |

**User's choice:** LeftStickX + LeftStickY (Recommended)

---

## Deadzone Value

| Option | Description | Selected |
|--------|-------------|----------|
| 0.15 (Recommended) | Matches current use-gamepad.ts DEADZONE constant. Same behavior as existing frontend. | ✓ |
| 0.1 (tighter) | More sensitive to small stick movements. Might cause jitter near center. | |
| You decide | Planner picks based on requirement GPAD-03 specifying 0.15. | |

**User's choice:** 0.15 (Recommended)

---

## Direction Mapping Logic

| Option | Description | Selected |
|--------|-------------|----------|
| Port getDirectionFromAxes() (Recommended) | Same logic: if |y| > |x| then F/B, else L/R. Deadzone check first. Exact port. | ✓ |
| Refactor to Rust enum | Define Direction enum in Rust with From<(f32, f32)> impl. More idiomatic but overkill. | |
| You decide | Planner picks based on Phase 7 code patterns. | |

**User's choice:** Port getDirectionFromAxes() (Recommended)

---

## the agent's Discretion
- Hook interfaces must stay stable — `useGamepad()` return shape preserved for Phase 9
- Low latency is critical for responsive robot control
- Error propagation via `Result<(), String>` return type (from Phase 7 D-28)

---

## Deferred Ideas

None — discussion stayed within Phase 8 scope

---

*Discussion completed: 2026-05-06*
*Next step: /gsd-plan-phase 8*

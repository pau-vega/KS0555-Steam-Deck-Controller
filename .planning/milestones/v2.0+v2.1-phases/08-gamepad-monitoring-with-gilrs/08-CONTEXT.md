# Phase 8: Gamepad Monitoring with gilrs - Context

**Gathered:** 2026-05-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement gilrs background thread in `apps/frontend/src-tauri/src/` that polls gamepad events and emits Tauri events (`gamepad-connected`, `gamepad-disconnected`, `gamepad-direction`). Replaces broken `navigator.getGamepads()` in WebView. Uses gilrs 0.11.1. Detects Steam Deck built-in controller. No hook rewrites yet (Phase 9).

</domain>

<decisions>
## Implementation Decisions

### Thread Spawn Strategy
- **D-01:** Use `std::thread::spawn` for gilrs background thread. Simpler than `tauri::async_runtime::spawn`, matches gilrs blocking `next_event()` model.
- **D-02:** Clone `AppHandle` and move into thread. `AppHandle` implements `Clone` and `Send`. Simplest pattern for cross-thread event emission.
- **D-03:** Spawn thread in `setup()` hook. Matches BLE pattern from Phase 7 — gamepad monitoring starts immediately with app launch.
- **D-04:** No thread lifecycle management needed. `gilrs next_event()` blocks; thread exits when main drops. Simple, no cleanup overhead.

### Event Emission Pattern
- **D-05:** `gamepad-direction` payload: `{ direction: 'F' }` (direction char only). Matches `useGamepad()` return shape `{ direction, gamepadConnected }`. Frontend gets direction directly.
- **D-06:** `gamepad-connected`/`gamepad-disconnected` payload: `{ name: '...' }` (name only). Frontend just needs connected/disconnected state.
- **D-07:** No rate limiting needed. Direction change guard + event-driven gilrs `next_event()` already prevents spam.
- **D-08:** Ignore emit errors silently. If frontend isn't listening yet, events are lost — next gamepad move re-emits. Low latency focus means no blocking on emit success.

### Gamepad Discovery
- **D-09:** Pick first gamepad with name containing "Steam". Matches current `use-gamepad.ts` logic: `gamepads.find((g) => g?.id.includes("Steam"))`. Steam Deck built-in controller always has "Steam" in name.
- **D-10:** Wait for `EventType::Connected` event. `gilrs next_event()` blocks until events fire. Handles initial discovery and reconnects.
- **D-11:** Ignore additional "Steam" gamepads — first one wins. Single-robot use case, matches requirement GPAD-05.
- **D-12:** Auto-reconnect on disconnect. On `EventType::Disconnected`, wait for new `Connected` event. Same pattern as BLE auto-reconnect (D-25 from Phase 7).

### Direction Change Guard
- **D-13:** Direction change guard in gilrs thread. Store `last_direction: Option<Direction>` in thread local state. Only emit `gamepad-direction` when direction actually changes. Matches `setDirection()` behavior in current `use-gamepad.ts`.
- **D-14:** Use `Axis::LeftStickX` and `Axis::LeftStickY`. Port `getDirectionFromAxes()` logic from `use-gamepad.ts`.
- **D-15:** Deadzone 0.15. Matches `DEADZONE` constant in `use-gamepad.ts`. Same behavior as existing frontend implementation.
- **D-16:** Port `getDirectionFromAxes()` logic to Rust. Same logic: if `|y| > |x|` then F/B, else L/R. Deadzone check first. Output "F"/"B"/"L"/"R"/"S".

### the agent's Discretion
- Hook interfaces must stay stable — `useGamepad()` return shape `{ direction, gamepadConnected }` preserved for Phase 9 rewrite (from PROJECT.md)
- Low latency is critical for responsive robot control (from PROJECT.md Context)
- Error propagation via `Result<(), String>` return type for Tauri commands (from Phase 7 D-28)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Project Context
- `.planning/REQUIREMENTS.md` — GPAD-01 through GPAD-06 (Gamepad Input requirements)
- `.planning/PROJECT.md` § Constraints — Low latency critical, hook interfaces stable, monorepo preserved
- `.planning/ROADMAP.md` § Phase 8 — Goal, success criteria, dependencies (Phase 6)

### Code Locations
- `apps/frontend/src-tauri/src/main.rs` — Tauri setup with `setup()` hook, will add `gamepad` module here
- `apps/frontend/src-tauri/Cargo.toml` — Has gilrs 0.11.1, btleplug 0.12.0, tokio with rt-multi-thread
- `apps/frontend/src/hooks/use-gamepad.ts` — Current implementation to port: `getDirectionFromAxes()`, deadzone 0.15, Steam filter
- `apps/frontend/src/types.ts` — Direction type (`"F" | "B" | "L" | "R" | "S"`)
- `apps/frontend/src-tauri/src/ble/mod.rs` — BLE module pattern: managed state, Tauri commands, event emission

### gilrs Crate
- gilrs 0.11.1 — Gamepad library for Rust, sees Steam Deck built-in controller
- `Gilrs::next_event()` — Blocking event loop, returns `EventType::Connected`/`Disconnected`/`ButtonPressed`/`AxisChanged`
- `Gamepad::name()` — Check for "Steam" to identify Steam Deck controller
- `Gamepad::axis_data(Axis::LeftStickX/Y)` — Read axis values for direction detection

### Tauri v2 Documentation
- Tauri v2 events: `app_handle.emit(event_name, payload)` for cross-thread emission
- Tauri v2 commands: `invoke()` from `@tauri-apps/api@^2.10.1`
- `std::thread::spawn` with cloned `AppHandle` — valid pattern for background threads

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/frontend/src-tauri/src/main.rs` — Tauri setup exists with `setup()` hook and BLE state management. Add `gamepad` module similarly.
- `apps/frontend/src-tauri/src/ble/mod.rs` — BLE module pattern: `#[tauri::command]` functions, `app.manage()` state, `setup_event_listener()`. Gamepad module should follow same structure.
- `apps/frontend/src/hooks/use-gamepad.ts` — Direction logic to port: `getDirectionFromAxes()`, `DEADZONE = 0.15`, Steam filter `gamepads.find((g) => g?.id.includes("Steam"))`.

### Established Patterns
- `std::thread::spawn` with cloned `AppHandle` for background threads
- Tauri events via `app_handle.emit()` for state changes
- Managed state via `app.manage()` for cross-command data sharing
- Direction change guard prevents event spam (store last state, compare before emit)
- Auto-reconnect pattern on disconnect (from Phase 7 D-25)

### Integration Points
- `apps/frontend/src-tauri/src/main.rs` — Add `mod gamepad; use gamepad::setup_gamepad_monitor;` and call in `setup()` hook
- `apps/frontend/src-tauri/src/gamepad/mod.rs` — New module for gilrs thread and event emission
- Frontend `use-gamepad.ts` — Phase 9 will replace `navigator.getGamepads()` with `listen("gamepad-direction")`, `listen("gamepad-connected")`, `listen("gamepad-disconnected")`

</code_context>

<specifics>
## Specific Ideas

- Port `getDirectionFromAxes()` exactly: if `|y| > |x|` then `y < 0 ? "F" : "B"`, else `x < 0 ? "L" : "R"`, deadzone check first returns "S"
- Steam Deck controller: check `gamepad.name().contains("Steam")` to pick right gamepad
- Direction change guard: store `last_direction: Option<Direction>` in thread, only emit on `Some(new_dir) != last_direction`
- Auto-reconnect: on `EventType::Disconnected`, loop continues and waits for new `EventType::Connected`
- Clone `AppHandle` in `setup()` and move into `std::thread::spawn` — no `Arc` needed since single owner

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 8 scope

</deferred>

---
*Phase: 8-Gamepad Monitoring with gilrs*
*Context gathered: 2026-05-06*

# Technology Stack

**Project:** KS0555 Steam Deck Robot Controller — v2.2 Progressive Analog Control
**Researched:** 2026-05-13

## Recommended Stack

No new dependencies required. Everything needed exists in the current Cargo.toml and package.json.

### Core Framework (Unchanged)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tauri | 2.11.0 | Desktop shell + IPC bridge | Already in use. Rust backend, React frontend. |
| Rust | Edition 2021 | Backend logic | Already in use for btleplug + gilrs. New analog module. |
| React | 19.x | UI components | Already in use. Hook extension + new component. |
| Vite | 6.x | Frontend bundler | Already in use. No configuration changes needed. |
| TypeScript | 5.x | Frontend type safety | Already in use. New types for analog state. |

### Database

None. This is a single-user desktop app with no persistent state for the analog milestone.

### Infrastructure (Unchanged)

| Technology | Purpose | Why |
|------------|---------|-----|
| btleplug 0.12 | BLE communication | Already in use. No changes to scan/connect/disconnect. |
| gilrs 0.11 | Gamepad input | Already in use. Steam Deck trigger axis (`Axis::LeftZ`/`Axis::RightZ`) already recognized. |

### Supporting Libraries (Unchanged)

| Library | Purpose | Why |
|---------|---------|-----|
| serde + serde_json | Serialization for IPC events | Already in use. New `AnalogState` struct derives Serialize. |
| tokio | Async runtime for BLE | Already in use. `ble_send_analog` uses same pattern. |
| thiserror | Error handling | Already in use. |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Speed protoco l | Relax `ble_send` validation | New `ble_send_raw` command | Simpler to extend existing command than add new one that circumvents all validation. But actually adding `ble_send_analog` as a NEW command is cleaner since it batches three writes with one service discovery. |
| Speed computation | Rust (`gamepad/analog.rs`) | TypeScript frontend | Lower latency (no IPC roundtrip for compute), single source of truth, no risk of IPC hiccups during rapid trigger changes. Frontend only needs display values. |
| Analog state sharing | Extended hook return | React Context / Zustand | Extending `useGamepad()` return is simplest and matches existing patterns. Context unnecessary — only two consumers (control hook + display). |
| UI mounting | Main.tsx sibling | React Portal / Teleport | Sibling is simpler than Portal. No extra tooling needed. Positioned with CSS `fixed`. |
| Event strategy | Dual events (old + new) | Single event replacing old | Replacing old would break app.tsx's effect. Dual events are redundant but harmless. |

## Installation

No new packages. All code is either:
- **Existing files modified:** `types.ts`, `use-gamepad.ts`, `ble/mod.rs`, `gamepad/mod.rs`, `lib.rs`, `capabilities/main.json`, `main.tsx`
- **New files:** `gamepad/analog.rs`, `use-analog-control.ts`, `analog-display.tsx`

```bash
# No npm install needed
# No cargo add needed
```

## Sources

- [Gilrs Axis enum](https://docs.rs/gilrs/latest/gilrs/ev/enum.Axis.html) — LeftZ, RightZ trigger axes
- [Gilrs Gamepad](https://docs.rs/gilrs/latest/gilrs/struct.Gamepad.html) — axis_data() returns -1..1 range
- Current codebase: `gamepad/mod.rs`, `ble/mod.rs`, `app.tsx`, `use-gamepad.ts`

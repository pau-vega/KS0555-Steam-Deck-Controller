# AGENTS.md

## Dev Commands

```bash
pnpm dev                    # Full Tauri dev (frontend + Rust backend)
pnpm build                  # Production build (turbo build)
pnpm test                   # Run all tests (vitest)
pnpm lint                   # Lint all packages (ESLint)
pnpm typecheck              # TypeScript typecheck all packages (tsc --noEmit)
pnpm format:check           # Check formatting (Prettier)
pnpm format                 # Auto-format (Prettier --write)
```

`just check` runs `lint → typecheck → test` in order (full pre-commit suite).  
`just nuke` removes all `dist`, `.turbo`, `node_modules`, etc. `just phoenix` nukes + reinstalls.

## Pre-commit Hooks

Managed by lefthook (`.husky/` shims delegate to it). On commit:

- `pnpm format:check` — Prettier
- `pnpm lint` — ESLint (turbo)
- Commitlint enforces Conventional Commits (`feat(tauri): ...`, `fix(ble): ...`)

## Architecture

- Single Tauri v2 process. Rust owns BLE (`btleplug`) and gamepad (`gilrs`) handles.
- Frontend ↔ Rust contract: `invoke()` for commands, `listen()` for events.
- No separate backend process.
- pnpm workspace: `apps/frontend` (Vite + React + Tauri), `packages/tsconfig`, `packages/eslint-config`.

## Key Files

| Concern        | Path                                                     |
| -------------- | -------------------------------------------------------- |
| Rust entry     | `apps/frontend/src-tauri/src/main.rs`                    |
| BLE logic      | `apps/frontend/src-tauri/src/ble/mod.rs`                 |
| Gamepad logic  | `apps/frontend/src-tauri/src/gamepad/mod.rs`             |
| Frontend entry | `apps/frontend/src/main.tsx` → `app.tsx`                 |
| React hooks    | `apps/frontend/src/hooks/{use-bluetooth,use-gamepad}.ts` |

## Critical Constraints

- **`app.tsx` is locked.** CI runs `git diff --exit-code -- apps/frontend/src/app.tsx`. Any change fails CI. All editing must happen in components, hooks, or new files — never modify `app.tsx`.
- CI runs `turbo build lint typecheck test` (builds _before_ lint/typecheck, which is unusual — any build failure must be fixed first).
- Vite dev server uses fixed port 5173. Must match `devUrl` in `tauri.conf.json`. Don't change the port.

## Platform Notes

- **macOS**: First BLE scan triggers CoreBluetooth permission prompt (`NSBluetoothAlwaysUsageDescription` in Info.plist).
- **Steam Deck**: Rust auto-detects Gamescope (sets `WEBKIT_DISABLE_COMPOSITING_MODE=1`) and SteamOS system bus socket (`DBUS_SYSTEM_BUS_ADDRESS` → `/run/host/run/dbus/system_bus_socket`).

## GSD Workflow

This repo uses GSD planning. Use these commands:

- `/gsd-quick` — small fixes, ad-hoc tasks
- `/gsd-debug` — investigation and bug fixing
- `/gsd-execute-phase` — planned phase work

Do not make direct repo edits outside GSD unless explicitly requested.

## Style

- TypeScript: kebab-case files, PascalCase components, `import type` required
- Rust: standard `cargo fmt`, feature-based modules (`src/ble/mod.rs`)
- Prettier: no semicolons, 120-char width

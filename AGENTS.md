# AGENTS.md

## Dev Commands

```bash
pnpm dev                    # Full Tauri dev (frontend + Rust shell)
pnpm --filter @ks0555/frontend tauri:dev  # Equivalent, explicit
pnpm build                  # Production build
pnpm test                   # Run all tests
pnpm lint                   # Lint all packages
pnpm format:check           # Check formatting
```

## Pre-commit Hooks

Before committing, these run automatically:

- `pnpm format:check` — Prettier
- `pnpm lint` — ESLint

Commit messages must follow Conventional Commits (`feat(tauri): ...`, `fix(ble): ...`).

## Architecture

- Single Tauri v2 process. Rust owns BLE (`btleplug`) and gamepad (`gilrs`) handles.
- Frontend ↔ Rust contract: `invoke()` for commands, `listen()` for events.
- No separate backend process.

## Key Files

| Concern        | Path                                                     |
| -------------- | -------------------------------------------------------- |
| Rust entry     | `apps/frontend/src-tauri/src/lib.rs`                     |
| BLE logic      | `apps/frontend/src-tauri/src/ble/mod.rs`                 |
| Gamepad logic  | `apps/frontend/src-tauri/src/gamepad/mod.rs`             |
| Frontend entry | `apps/frontend/src/main.tsx` → `app.tsx`                 |
| React hooks    | `apps/frontend/src/hooks/{use-bluetooth,use-gamepad}.ts` |

## Platform Notes

- **macOS**: First BLE scan triggers macOS Bluetooth permission prompt. Uses CoreBluetooth via `btleplug`.
- **Steam Deck**: Rust sets `WEBKIT_DISABLE_COMPOSITING_MODE=1` before `tauri::Builder` to avoid Gamescope crash.

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

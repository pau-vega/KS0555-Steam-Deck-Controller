# AGENTS.md

This file provides guidance to coding agents (Claude Code, OpenCode, Cursor, etc.) when working with code in this repository. `CLAUDE.md` is a symlink to this file.

## What this is

Single-process **Tauri v2** desktop app that drives a Bluetooth Arduino robot (DX-BT24 module) from a Steam Deck gamepad. Rust owns BLE (`btleplug`) and gamepad (`gilrs`); React renders UI inside the Tauri WebView. No backend server, no Web Bluetooth, no `rfcomm`.

Primary distribution target is a **Flatpak bundle** for Steam Deck (Desktop + Gaming Mode). macOS and Linux desktop are supported as dev/run platforms via raw `cargo tauri build` (no Flatpak).

## Commands

Run from repo root unless noted. Most are wired through Turbo, so they fan out across the pnpm workspace.

```bash
pnpm dev            # Tauri dev (Vite on :5173 + Rust shell). Alias: just dev
pnpm build          # turbo build (Vite build for the frontend workspace)
pnpm lint           # turbo lint (ESLint flat config)
pnpm typecheck      # turbo typecheck (tsc --noEmit)
pnpm test           # turbo test (Vitest in @ks0555/frontend)
pnpm format         # Prettier --write .
pnpm format:check   # Prettier --check . (CI gate)
pnpm install:steamdeck  # rsync + SSH deploy via upgrade-robot-controller.sh
just check          # lint → typecheck → test (pre-merge sanity run)
just phoenix        # nuke dist/.turbo/node_modules/target, then pnpm install
```

### Tauri-specific

```bash
pnpm --filter @ks0555/frontend tauri:dev    # Same as pnpm dev
pnpm --filter @ks0555/frontend tauri:build  # Produces .app/.dmg on macOS, .deb on Linux
```

Tauri build outputs land under `apps/frontend/src-tauri/target/release/bundle/`.

### Running a single test

Vitest lives in `apps/frontend`. Two options:

```bash
# By file path
pnpm --filter @ks0555/frontend test -- App.test.tsx

# By test name (uses -t / --testNamePattern)
pnpm --filter @ks0555/frontend test -- -t "deadzone"
```

`pnpm test` from the root fans out via Turbo and runs `vitest run` (non-watch). For watch mode, run `pnpm --filter @ks0555/frontend exec vitest` directly.

### Flatpak (Linux x86_64 only)

`just flatpak-build` wraps `flatpak-builder` against `flatpak/com.ks0555.robotcontroller.yaml`. `just docker-build-all` does the full `.deb → .flatpak` pipeline in a Docker container — **refuses to run on arm64 hosts** (Apple Silicon) because `bubblewrap` needs user namespaces that Rosetta/QEMU cannot translate. On Apple Silicon, push a tag and let `.github/workflows/build.yml` produce the artifact.

## Architecture

```
React (Vite)  ──Tauri IPC──>  Rust (btleplug + gilrs)  ──BLE──>  BT24  ──UART──>  Arduino
```

One Rust process owns all hardware state. The React side only `invoke()`s commands and `listen()`s for events. Authoritative reference: `docs/ARCHITECTURE.md`.

### IPC contract

| Direction | Name                                         | Payload                                          |
| --------- | -------------------------------------------- | ------------------------------------------------ |
| FE → Rust | `ble_connect` / `ble_disconnect`             | `()`                                             |
| FE → Rust | `ble_send`                                   | `{ command: "F" \| "B" \| "L" \| "R" \| "S" }`   |
| Rust → FE | `ble-state-changed`                          | `"connecting" \| "connected" \| "disconnected"`  |
| Rust → FE | `gamepad-direction`                          | `{ direction: "F" \| "B" \| "L" \| "R" \| "S" }` |
| Rust → FE | `gamepad-connected` / `gamepad-disconnected` | `{ name: string }`                               |

BLE writes use `WriteType::WithoutResponse` (fire-and-forget) on characteristic `0000ffe1...`. Device filter is the name `"BT24"`. Arduino firmware is **immutable** — it only understands the five single-char commands above.

### Where things live

| Concern                         | Path                                                                       |
| ------------------------------- | -------------------------------------------------------------------------- |
| Rust entry                      | `apps/frontend/src-tauri/src/main.rs`                                      |
| Setup hook + Flatpak/D-Bus gate | `apps/frontend/src-tauri/src/lib.rs`                                       |
| BLE logic + state               | `apps/frontend/src-tauri/src/ble/{mod,state}.rs`                           |
| Gamepad monitor                 | `apps/frontend/src-tauri/src/gamepad/mod.rs`                               |
| Frontend root                   | `apps/frontend/src/{main,app}.tsx`                                         |
| Shared FE types                 | `apps/frontend/src/types.ts`                                               |
| UI components                   | `apps/frontend/src/components/{control-pad,status-bar,error-boundary}.tsx` |
| IPC hooks                       | `apps/frontend/src/hooks/use-{bluetooth,gamepad}.ts`                       |
| Tauri config                    | `apps/frontend/src-tauri/tauri.conf.json`                                  |
| Flatpak manifest                | `flatpak/com.ks0555.robotcontroller.yaml`                                  |
| Shared TS/ESLint config         | `packages/{tsconfig,eslint-config}/`                                       |
| Steam Deck SSH installer        | `upgrade-robot-controller.sh` (run via `pnpm install:steamdeck`)           |

### Non-obvious runtime details

- **Gamepad runs on `std::thread`, not Tokio.** `gilrs::next_event()` blocks; running it under `tokio::spawn` would stall the runtime. Each loop iteration sleeps 8 ms.
- **Direction coalescing.** Gamepad sticks fire AxisChanged constantly; the monitor tracks `last_direction` and only emits when it changes, cutting BLE/IPC traffic ~90%. Left-stick deadzone is `0.15` (in `gamepad/mod.rs`). If both axes exceed deadzone, the stronger axis wins.
- **`in_flatpak()` gate in `lib.rs`** checks both `FLATPAK_ID` env var **and** `/.flatpak-info`. Inside Flatpak the D-Bus system bus rewrite must NOT run (Flatpak's proxy handles BlueZ). Outside Flatpak on SteamOS, the rewrite points `DBUS_SYSTEM_BUS_ADDRESS` at `/run/host/run/dbus/system_bus_socket` so `btleplug` can reach BlueZ through Gamescope.
- **`WEBKIT_DISABLE_COMPOSITING_MODE=1`** is set unconditionally in `lib.rs` (and again via Flatpak `finish-args`) — WebKitGTK's GPU compositing path is broken under Gamescope.
- **macOS** requires `NSBluetoothAlwaysUsageDescription` in `apps/frontend/src-tauri/Info.plist`. First scan triggers the system prompt.
- **Meta-tests in `apps/frontend/src/`.** Files like `ci-workflow.test.ts`, `deployment.test.ts`, `docs.test.ts`, `verification-docs.test.ts`, `tauri-frontend.test.ts` aren't unit tests of code — they assert against config (`.github/workflows/`, `flatpak/`, `docs/`). Editing those configs without updating their meta-tests fails CI.

## Critical constraints

- **Keep `apps/frontend/src/app.tsx` thin.** New behavior should land in components, hooks, or new files rather than bloating the root component. **Hook return shapes for `useBluetooth` / `useGamepad` are part of this contract** — adding fields is fine; renaming or removing is not.
- **Vite dev port is fixed at 5173** and must match `devUrl` in `tauri.conf.json`. Don't change it.
- **CI runs `turbo build lint typecheck test` in that order** — build failures must be fixed before lint/typecheck errors will even surface.
- **Conventional Commits required.** Lefthook + commitlint enforce on commit-msg. Use scoped types: `feat(tauri): …`, `fix(ble): …`, `chore(ci): …`. Pre-commit also runs `pnpm format` (auto-fix), `pnpm lint`, `pnpm typecheck` in parallel.
- **Don't edit `package.json` by hand to add dependencies.** Use `pnpm add` / `pnpm add -D` so the lockfile and the latest published version stay correct.
- **Don't manually bump versions.** Release-please owns versioning via `.github/workflows/release-please.yml`. The build workflow reads the version from `Cargo.toml` via `cargo metadata + jq`, not from `github.ref_name`.

## TypeScript conventions

Authoritative source: `.agents/rules/typescript.md`. Highlights — these are enforced by review, not just lint:

- Prefer `interface C extends A, B {}` over `type C = A & B` (intersections are slow in tsc and produce worse errors).
- Model variant data as **discriminated unions**, not bag-of-optionals.
- **No `any`.** Use generics or `unknown`; for unavoidable casts use `as unknown as T`. Function overloads beat `as any` inside generic bodies.
- Return types are required on top-level functions. Components and custom hooks are exempt.
- **No enums** — use `as const` objects with `keyof typeof` / indexed types. Existing enums stay unless asked to convert.
- **No default exports** (except where a framework demands it).
- **Top-level `import type`** only — never inline `import { type X }` (some bundlers leave behind side-effect imports).
- Errors that callers must handle: use a `Result<T, E>` shape (`{ ok: true; value }` | `{ ok: false; error }`) rather than throwing. Throwing is fine when a framework handler catches it.
- File names are `kebab-case`; type parameters are `T`-prefixed (`TItem`).
- Prettier: **no semicolons, 120-char width.**

## Workflow expectations

- **`AGENTS.md` is the single source of truth.** `CLAUDE.md` is a symlink to this file, so all agents read identical content. Edit `AGENTS.md` directly.
- This repo uses the **GSD planning system** (`.planning/`). For non-trivial work, prefer the GSD slash commands (`/gsd-quick`, `/gsd-debug`, `/gsd-plan-phase`, `/gsd-execute-phase`) over raw edits. Direct edits are fine for typo-level fixes; anything that touches Rust, BLE, gamepad logic, or CI should go through a plan.
- `.planning/STATE.md` and `.planning/PROJECT.md` describe current milestone position. v2.0 (Tauri migration) and v2.1 (Flatpak packaging) are archived; the repo is between milestones at time of writing.
- Pre-commit hooks: `lefthook` (configured in `lefthook.yml`). Husky shims under `.husky/` just delegate. **Do not skip hooks** (`--no-verify`) without explicit user instruction — commitlint lives there.

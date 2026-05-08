<!-- GSD:project-start source:PROJECT.md -->
## Project

**Steam Deck Robot Controller**

A Tauri v2 desktop app that connects a Steam Deck (or Mac, or any modern Linux box) to a Bluetooth Arduino robot driven by a DX-BT24 module. The Rust backend handles BLE via `btleplug` and gamepad input via `gilrs`; the React frontend runs in the Tauri WebView and talks to Rust through `invoke()` / `listen()`.

**Core Value:** Drive a real robot with the Deck's gamepad with low latency — single binary, no separate backend, no `rfcomm`, no Chrome flags.

**Current Milestone:** v2.0 Tauri Migration (in progress) — replace browser-based Web Bluetooth + Gamepad APIs with native Rust alternatives so the app actually works under SteamOS / Gamescope.

### Constraints

- **One process, one binary**: BLE peripheral handle and gamepad event loop both live in the Rust shell; the React side is presentational.
- **Friction-free Steam Deck install**: end users install via a one-line `curl | bash` that drops an AppImage in `~/Applications/` and registers a `.desktop` entry; no source build, no manual deps.
- **Mac dev parity**: same `tauri:dev` runs on macOS via CoreBluetooth + IOKit so contributors don't need to boot the Deck for every iteration.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

### Languages
- TypeScript 5.9.3 - Frontend (`apps/frontend/src`) and shared configs
- Rust (edition 2021) - Tauri shell (`apps/frontend/src-tauri/src`)
- JavaScript - Vite/Vitest config files

### Runtime
- Node.js >= 18 (`.nvmrc` pins exact version)
- pnpm 10.29.3 (lockfile-enforced via `preferFrozenLockfile: true`)
- Rust stable (no `rust-toolchain.toml`; CI uses `dtolnay/rust-toolchain@stable`)

### Frameworks & Major Crates
- Tauri 2.11.0 (`tauri-build` 2.6.0) - desktop shell + IPC
- React 19 + Vite 8 - frontend
- Tailwind CSS 4 - styling
- `btleplug` 0.12.0 - cross-platform BLE (BlueZ on Linux, CoreBluetooth on macOS, WinRT on Windows)
- `gilrs` 0.11.1 (with `serde` feature) - gamepad input via udev/evdev on Linux, IOKit on macOS
- `tokio` 1 + `futures` 0.3 - async runtime for BLE/gamepad event loops
- Vitest 4 - frontend unit tests
- Playwright 1.59 - E2E test harness (limited use)
- ESLint 10 (flat config) + Prettier 3 + typescript-eslint 8

### Configuration
- Workspace: `pnpm-workspace.yaml` (`apps/*`, `packages/*`)
- Build orchestration: `turbo.json`
- TypeScript: `tsconfig.base.json` (strict, `noUncheckedIndexedAccess` on, `target: esnext`)
- Tauri bundle: `apps/frontend/src-tauri/tauri.conf.json` (1280×800 window, no media framework on Linux to keep AppImage small)
- macOS BLE permission: `apps/frontend/src-tauri/Info.plist` (`NSBluetoothAlwaysUsageDescription`)
- CI: `.github/workflows/build.yml` (x86_64 AppImage, aarch64 AppImage, universal-apple-darwin DMG on tag push)

### Platform Targets
- **Steam Deck (SteamOS, x86_64)** - primary, distributed as AppImage
- **macOS 11+ (Apple Silicon + Intel via universal binary)** - dev workstation, distributed as DMG
- **Linux desktop (Arch / Debian / Ubuntu)** - dev workstation, build via `pnpm tauri build` or `./build-steamdeck.sh`

### Workspace Structure
- `apps/frontend` - Vite + React UI **and** the Tauri shell under `src-tauri/`
- `packages/ui` - shared component library (placeholder for now)
- `packages/eslint-config`, `packages/tsconfig` - shared lint / TS configs
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

### TypeScript / React
- Files: kebab-case (`use-bluetooth.ts`, `control-pad.tsx`)
- Components: PascalCase (`ControlPad`, `StatusBar`)
- Functions / vars: camelCase
- Types / interfaces: PascalCase, generic params prefixed with `T` (`TItem`)
- Type-only imports always `import type` (enforced by `@typescript-eslint/consistent-type-imports`)
- No default exports (except where a framework requires it)
- Prettier: no semicolons, 120-char width
- See `.agents/rules/typescript.md` for the full rule set (Result types, no `any`, discriminated unions, etc.)

### Rust
- Standard `cargo fmt` formatting
- Modules organised by feature: `src/ble/mod.rs`, `src/gamepad/mod.rs`
- Tauri commands return `Result<T, String>` so the frontend gets a serialisable error
- Shared state lives behind `tokio::sync::Mutex` inside a `tauri::State`-managed struct

### Commits
- Conventional Commits enforced via commitlint (`commitlint.config.ts`) and a Husky `commit-msg` hook
- Scope examples: `feat(tauri): ...`, `feat(steam-deck): ...`, `fix(ble): ...`, `docs(running): ...`

### GSD planning artefacts
- Phase work lives under `.planning/phases/<NN>-...`
- Quick tasks (this is one of them) live under `.planning/quick/<DATE>-<slug>/`
- Each quick task has a `PLAN.md`, then a `SUMMARY.md` once complete; `STATE.md` at the planning root tracks the current commit hash
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

### Pattern Overview
- Single Tauri v2 process. Rust owns the long-lived hardware handles (BLE peripheral, gamepad event loop). The React UI is a thin presentation layer that issues commands and subscribes to events.
- Frontend ↔ Rust contract is the Tauri IPC: `invoke('ble_connect')` etc. for command-style calls, `listen('ble-state-changed')` etc. for event streams.
- No HTTP server, no WebSocket, no separate backend process. The previous `apps/backend` Fastify server was removed in the v2.0 Tauri migration (Phase 6).

### Data Flow

```
React (Vite, in Tauri WebView)
        │ invoke()        ▲ listen()
        ▼                 │
Rust (Tokio runtime, src-tauri/src)
   ├── ble/    btleplug   ──BLE──▶ BT24 (DX-BT24 module)  ──UART──▶ Arduino sketch
   └── gamepad/ gilrs     ──evdev/IOKit──▶ Steam Deck / Mac controller
```

- BLE write payload is a single ASCII char (`F`/`B`/`L`/`R`/`S`) over the BT24's notify/write characteristic.
- Gamepad left stick is sampled in a dedicated tokio task; deadzone is `0.15` (`apps/frontend/src-tauri/src/gamepad/mod.rs`). Direction changes are coalesced and re-emitted as `gamepad-direction` events.

### Key Files
| Concern | File |
|---------|------|
| BLE scan / connect / write | `apps/frontend/src-tauri/src/ble/mod.rs` |
| Gamepad → Direction | `apps/frontend/src-tauri/src/gamepad/mod.rs` |
| Tauri command registration | `apps/frontend/src-tauri/src/lib.rs` |
| React entry | `apps/frontend/src/main.tsx` → `app.tsx` |
| BLE hook (frontend) | `apps/frontend/src/hooks/use-bluetooth.ts` |
| Gamepad hook (frontend) | `apps/frontend/src/hooks/use-gamepad.ts` |
| Window / bundle config | `apps/frontend/src-tauri/tauri.conf.json` |
| macOS BLE permission | `apps/frontend/src-tauri/Info.plist` |

### Steam Deck Specifics
- The Rust shell sets `WEBKIT_DISABLE_COMPOSITING_MODE=1` before `tauri::Builder` runs, working around a Gamescope + WebKitGTK compositing bug that otherwise crashes the window in Gaming Mode.
- AppImage is built with `bundleMediaFramework: false` (keeps the artifact small — no GStreamer needed).
- End-user install: `install-on-steamdeck.sh` downloads the AppImage from the latest GitHub Release, drops it in `~/Applications/`, registers a `.desktop` entry, and tells the user to "Add a Non-Steam Game" in Steam.
- On-device source build (rare): `./build-steamdeck.sh` toggles `steamos-readonly`, installs `webkit2gtk-4.1` + `librsvg` + `patchelf` via pacman, then runs `pnpm tauri build`.

### Mac Dev Parity
- `pnpm dev` (= `pnpm --filter @ks0555/frontend tauri:dev`) runs the same Tauri shell on macOS.
- `btleplug` switches to CoreBluetooth automatically; the first BLE scan triggers macOS's Bluetooth permission prompt (driven by `NSBluetoothAlwaysUsageDescription`).
- CI also publishes `RobotController-universal.dmg` (Intel + Apple Silicon) on every tagged release so non-developers don't need a Rust toolchain.

### Entry Points
| Entry | Triggered by | Responsibility |
|-------|--------------|----------------|
| `apps/frontend/src-tauri/src/lib.rs::run()` | Tauri runtime / `tauri:dev` / packaged binary | Configure plugins, register commands, spawn BLE + gamepad tasks |
| `apps/frontend/src/main.tsx` | Vite dev server / built bundle inside Tauri WebView | Mount React app |
| `.github/workflows/build.yml` | git tag `v*` or `workflow_dispatch` | Build x64 AppImage, arm64 AppImage, universal macOS DMG; attach to Release |
| `install-on-steamdeck.sh` | End user via `curl \| bash` in Konsole | Download latest AppImage, register desktop entry |
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

| Skill | Description | Path |
|-------|-------------|------|
| shadcn | Manages shadcn components and projects — adding, searching, fixing, debugging, styling, and composing UI. Provides project context, component docs, and usage examples. Applies when working with shadcn/ui, component registries, presets, --preset codes, or any project with a components.json file. Also triggers for "shadcn init", "create an app with --preset", or "switch to --preset". | `.agents/skills/shadcn/SKILL.md` |
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->

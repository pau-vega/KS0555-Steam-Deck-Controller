# Codebase Structure

**Analysis Date:** 2026-05-14

## Directory Layout

```
KS0555-Steam-Deck-Controller-2/
├── apps/
│   ├── frontend/                          # The Tauri v2 desktop app (everything is here)
│   │   ├── index.html                     # Vite HTML entry → loads /src/main.tsx
│   │   ├── package.json                   # @ks0555/frontend, scripts: dev/build/test/tauri:*
│   │   ├── tsconfig.json                  # Extends @ks0555/tsconfig/tsconfig.react.json
│   │   ├── vite.config.ts                 # Tailwind + React plugin, port 5173, safari15 target
│   │   ├── vitest.config.ts               # jsdom env, setupTests.ts
│   │   ├── .env                           # Frontend env vars (not committed contents)
│   │   ├── README.md                      # Frontend-specific readme
│   │   ├── src/                           # React 19 frontend
│   │   │   ├── main.tsx                   # createRoot + StrictMode + ErrorBoundary
│   │   │   ├── app.tsx                    # LOCKED by CI — composition root
│   │   │   ├── types.ts                   # Direction = "F"|"B"|"L"|"R"|"S"
│   │   │   ├── index.css                  # Tailwind v4 @theme tokens
│   │   │   ├── vite-env.d.ts              # Vite ambient types
│   │   │   ├── setupTests.ts              # vitest jest-dom matcher import
│   │   │   ├── components/                # Presentational React components
│   │   │   │   ├── control-pad.tsx        # 3×3 directional pad
│   │   │   │   ├── status-bar.tsx         # Connection pills
│   │   │   │   ├── error-boundary.tsx     # React class error fence
│   │   │   │   └── *.test.tsx             # Co-located component tests
│   │   │   ├── hooks/                     # Tauri IPC adapter hooks
│   │   │   │   ├── use-bluetooth.ts       # invoke ble_* + listen ble-state-changed
│   │   │   │   ├── use-gamepad.ts         # listen gamepad-* events
│   │   │   │   └── *.test.ts              # Co-located hook tests
│   │   │   ├── App.test.tsx               # End-to-end smoke at the app level
│   │   │   ├── ci-workflow.test.ts        # Tests that assert .github/workflows contents
│   │   │   ├── deployment.test.ts         # Asserts upgrade script / install path
│   │   │   ├── docs.test.ts               # Asserts docs/ contents
│   │   │   ├── tauri-frontend.test.ts     # Asserts Tauri config invariants
│   │   │   └── verification-docs.test.ts  # Asserts docs/VALIDATION etc.
│   │   └── src-tauri/                     # Rust backend (lives inside frontend pkg)
│   │       ├── Cargo.toml                 # Crate `robot-controller`, lib `app_lib`
│   │       ├── Cargo.lock
│   │       ├── build.rs                   # tauri_build::build()
│   │       ├── tauri.conf.json            # Window, CSP, bundle targets (deb)
│   │       ├── Info.plist                 # macOS Bluetooth usage descriptions
│   │       ├── ARCHITECTURE.md            # Tauri-specific architecture notes (kept in-tree)
│   │       ├── .gitignore
│   │       ├── src/
│   │       │   ├── main.rs                # Thin entry: env var + app_lib::run()
│   │       │   ├── lib.rs                 # Builder, Flatpak gate, manage(BleState), handlers
│   │       │   ├── ble/
│   │       │   │   ├── mod.rs             # ble_connect / ble_disconnect / ble_send + listener
│   │       │   │   └── state.rs           # BleState struct (Arc<Mutex<Option<Peripheral>>>)
│   │       │   └── gamepad/
│   │       │       └── mod.rs             # setup_gamepad_monitor + Direction + tests
│   │       ├── capabilities/
│   │       │   └── main.json              # main-capability — windows: ["main"], BLE permissions
│   │       ├── permissions/
│   │       │   ├── ble.toml               # Permission definitions (ble-connect, etc.)
│   │       │   └── default.toml           # Default permission set
│   │       ├── tests/                     # Cargo integration tests
│   │       │   ├── ble_connect_test.rs
│   │       │   ├── ble_disconnect_test.rs
│   │       │   ├── ble_event_test.rs
│   │       │   ├── ble_linux_filter_test.rs
│   │       │   ├── ble_send_test.rs
│   │       │   ├── ble_state_test.rs
│   │       │   ├── flatpak_sandbox_test.rs
│   │       │   ├── tauri_shell_test.rs
│   │       │   └── validation_test.rs
│   │       ├── icons/                     # App icons (32/128/256, .ico, .icns)
│   │       └── gen/                       # Tauri-generated ACL schemas (committed)
│   └── backend/                           # EMPTY — legacy Fastify backend removed during Tauri migration
├── packages/
│   ├── tsconfig/                          # Shared @ks0555/tsconfig
│   │   ├── tsconfig.json                  # Base: strict + noUncheckedIndexedAccess
│   │   ├── tsconfig.react.json            # React preset
│   │   ├── tsconfig.node.json             # Node preset
│   │   └── README.md
│   └── eslint-config/                     # Shared @ks0555/eslint-config
│       ├── src/
│       │   ├── react.ts                   # React rules (perfectionist sort-imports)
│       │   └── node.ts                    # Node rules
│       └── tests/                         # Config-level tests
├── flatpak/                               # Flatpak packaging (Steam Deck distribution)
│   ├── com.ks0555.robotcontroller.yaml    # Manifest (runtime, sdk, finish-args, deb-extract)
│   ├── com.ks0555.robotcontroller.metainfo.xml  # AppStream metadata
│   ├── build.sh                           # Local Flatpak build script
│   ├── docker-build.sh                    # Docker-based Flatpak build (macOS host)
│   ├── Dockerfile                         # Builder image (Ubuntu + Rust + Tauri CLI)
│   ├── validate-phase14.sh                # Validation pipeline
│   ├── README.md
│   ├── VALIDATION-CHECKLIST.md
│   ├── icons/                             # 32/128/256@2 PNGs for installer
│   ├── tests/                             # Flatpak-specific test fixtures
│   ├── validation-reports/                # (git-ignored) per-run reports
│   └── validation-logs/                   # (git-ignored) captured logs
├── docs/                                  # Long-form documentation
│   ├── ARCHITECTURE.md                    # Public architecture overview
│   ├── CONFIGURATION.md
│   ├── DEVELOPMENT.md
│   ├── GETTING-STARTED.md
│   ├── RUNNING.md                         # Per-device run guide
│   ├── STEAM_DECK.md
│   └── TESTING.md
├── .github/workflows/                     # CI/CD
│   ├── ci.yml                             # PR: build+lint+typecheck+test, app.tsx lock
│   ├── build.yml                          # Tag/manual: .deb → .flatpak release pipeline
│   ├── release-please.yml                 # Release-please automation
│   └── validate-release-pr.yml
├── .agents/                               # Agent rules + skills (project skill set)
│   ├── rules/typescript.md                # TypeScript conventions
│   └── skills/                            # SKILL.md per topic (tauri-v2, vite, etc.)
├── .claude/                               # Claude Code project config (hooks, skills)
├── .opencode/                             # OpenCode config
├── .planning/                             # GSD planning artifacts
│   ├── codebase/                          # ← these mapper outputs live here
│   ├── milestones/  phases/  research/  ui-reviews/  quick/  tmp/
├── .husky/                                # Husky shim files (delegates to lefthook)
├── .vscode/
├── AGENTS.md                              # Top-level agent guide (dev commands, constraints)
├── README.md                              # User-facing readme (Steam Deck install)
├── CHANGELOG.md
├── package.json                           # Root workspace (turbo + pnpm)
├── pnpm-workspace.yaml                    # packages: apps/* + packages/*
├── pnpm-lock.yaml
├── turbo.json                             # Turborepo task graph
├── justfile                               # `just check / nuke / phoenix / flatpak-*`
├── lefthook.yml                           # Pre-commit hooks (format/lint/typecheck/commitlint)
├── commitlint.config.ts                   # Conventional Commits enforcement
├── eslint.config.ts                       # Root ESLint flat config (ignores + JSON)
├── .prettierrc                            # { semi: false, printWidth: 120 }
├── .prettierignore
├── .nvmrc                                 # Node version pin
├── opencode.json
├── skills-lock.json
├── upgrade-robot-controller.sh            # Steam Deck Flatpak upgrade script
└── RobotController-x86_64.flatpak         # Local build artifact (kept at root)
```

## Directory Purposes

**`apps/frontend/`:**
- Purpose: the entire Tauri v2 desktop application — confusingly named `frontend` despite containing both the React UI **and** the Rust backend via `src-tauri/`.
- Contains: Vite project for the React side + the full Tauri Rust crate.
- Key files: `package.json` (script entry points), `vite.config.ts`, `tsconfig.json`, `index.html`.

**`apps/frontend/src/`:**
- Purpose: React 19 + TypeScript source for the WebView UI.
- Contains: composition root (`app.tsx`), entry shim (`main.tsx`), shared types, hooks, components, and co-located tests.
- Key files: `main.tsx`, `app.tsx`, `types.ts`, `index.css`.

**`apps/frontend/src/components/`:**
- Purpose: presentational React components — no IPC, no business state ownership beyond props.
- Contains: `control-pad.tsx`, `status-bar.tsx`, `error-boundary.tsx`, plus co-located `.test.tsx` files.

**`apps/frontend/src/hooks/`:**
- Purpose: Tauri IPC adapter hooks — translate `invoke`/`listen` into React state.
- Contains: `use-bluetooth.ts`, `use-gamepad.ts`, plus co-located `.test.ts` files.

**`apps/frontend/src-tauri/`:**
- Purpose: Rust crate that produces the `robot-controller` binary, plus all Tauri metadata.
- Contains: Cargo crate (`Cargo.toml`, `Cargo.lock`, `build.rs`), Tauri config (`tauri.conf.json`), `capabilities/`, `permissions/`, `icons/`, integration `tests/`, generated schemas (`gen/`), and platform metadata (`Info.plist`).

**`apps/frontend/src-tauri/src/`:**
- Purpose: Rust source — strictly partitioned into the binary entrypoint, library setup, and feature modules.
- Contains: `main.rs` (thin), `lib.rs` (composition), `ble/` (BLE feature), `gamepad/` (input feature).

**`apps/frontend/src-tauri/src/ble/`:**
- Purpose: BLE feature module. Owns scan/connect/write logic + the shared peripheral handle.
- Contains: `mod.rs` (commands + listener), `state.rs` (`BleState`).

**`apps/frontend/src-tauri/src/gamepad/`:**
- Purpose: Gamepad polling + direction inference.
- Contains: `mod.rs` only — includes inline `#[cfg(test)] mod tests` for unit tests of the deadzone logic.

**`apps/frontend/src-tauri/capabilities/`:**
- Purpose: Tauri v2 capability declarations binding permissions to windows.
- Key file: `main.json` (the only capability currently defined).

**`apps/frontend/src-tauri/permissions/`:**
- Purpose: Tauri v2 permission definitions (which commands/events are allowed to be referenced from a capability).
- Key files: `ble.toml`, `default.toml`.

**`apps/frontend/src-tauri/tests/`:**
- Purpose: Cargo integration tests (one file per feature concern).

**`apps/frontend/src-tauri/gen/`:**
- Purpose: Tauri-generated ACL schemas — committed to enable schema-aware capability JSON validation in editors.
- Generated: Yes (by `tauri-build`). Committed: Yes.

**`apps/backend/`:**
- Purpose: **deprecated**. Empty directory left behind after the legacy Fastify backend was removed during the Tauri v2 migration. Do not add new code here.

**`packages/tsconfig/`:**
- Purpose: shared `tsconfig.json` presets (`base`, `react`, `node`) consumed by workspace packages.

**`packages/eslint-config/`:**
- Purpose: shared ESLint flat config (`react`, `node`) consumed via `--config ../../packages/eslint-config/src/react.ts`.

**`flatpak/`:**
- Purpose: Flatpak packaging assets and build scripts for Steam Deck distribution.
- Contains: manifest, AppStream metainfo, icons, builder Dockerfile, helper scripts, validation checklist.

**`docs/`:**
- Purpose: long-form Markdown documentation for users and developers (not for agents).
- Contains: `ARCHITECTURE.md`, `CONFIGURATION.md`, `DEVELOPMENT.md`, `GETTING-STARTED.md`, `RUNNING.md`, `STEAM_DECK.md`, `TESTING.md`.

**`.github/workflows/`:**
- Purpose: GitHub Actions CI/CD pipelines.
- Contains: `ci.yml` (PR), `build.yml` (release build), `release-please.yml`, `validate-release-pr.yml`.

**`.agents/`:**
- Purpose: machine-readable project rules and skills loaded by agent runtimes.
- Contains: `rules/typescript.md` (style), `skills/<topic>/SKILL.md` (per-topic playbooks).

**`.planning/codebase/`:**
- Purpose: GSD-mapper output (these documents). Consumed by `/gsd-plan-phase` and `/gsd-execute-phase`.

## Key File Locations

**Entry Points:**
- `apps/frontend/src-tauri/src/main.rs`: Rust binary `main()` — only runs `app_lib::run()`.
- `apps/frontend/src-tauri/src/lib.rs`: `pub fn run()` — Tauri Builder, command/handler registration, state management, listener bootstraps.
- `apps/frontend/index.html`: WebView HTML entry — loaded by Tauri from `dist/` in prod and from `http://localhost:5173` in dev.
- `apps/frontend/src/main.tsx`: React mount point.
- `apps/frontend/src/app.tsx`: React composition root (locked by CI).

**Configuration:**
- `apps/frontend/src-tauri/tauri.conf.json`: window dimensions, CSP, bundle target (`deb`), dev URL.
- `apps/frontend/src-tauri/Cargo.toml`: Rust deps + version (`0.1.21`) — also drives bundle version.
- `apps/frontend/vite.config.ts`: Vite + Tailwind + React; Steam-Deck-friendly build target (`safari15`).
- `apps/frontend/vitest.config.ts`: jsdom + setup file.
- `apps/frontend/tsconfig.json`: extends `@ks0555/tsconfig/tsconfig.react.json`, paths `@/* → ./src/*`.
- `packages/tsconfig/tsconfig.json`: shared base — `strict: true`, `noUncheckedIndexedAccess: true`.
- `turbo.json`: task graph for `build`, `lint`, `typecheck`, `test`, `dev`.
- `pnpm-workspace.yaml`: `apps/*` + `packages/*`.
- `eslint.config.ts`: root flat config (ignores + JSON plugin).
- `packages/eslint-config/src/react.ts`: React-specific rules (`perfectionist/sort-imports`).
- `.prettierrc`: `{ semi: false, printWidth: 120 }`.
- `lefthook.yml`: pre-commit hooks (format, lint, typecheck, commitlint).
- `commitlint.config.ts`: Conventional Commits enforcement.
- `justfile`: command runner (`just check`, `just nuke`, `just phoenix`, `just flatpak-*`).

**Core Logic — Rust:**
- `apps/frontend/src-tauri/src/ble/mod.rs`: `ble_connect`, `ble_disconnect`, `ble_send`, `setup_event_listener`, `find_bt24`, BT24 UUID constant.
- `apps/frontend/src-tauri/src/ble/state.rs`: `BleState` (managed state).
- `apps/frontend/src-tauri/src/gamepad/mod.rs`: `setup_gamepad_monitor`, `compute_direction`, `Direction`, deadzone tests.

**Core Logic — Frontend:**
- `apps/frontend/src/hooks/use-bluetooth.ts`: BLE IPC adapter + Web Bluetooth fallback.
- `apps/frontend/src/hooks/use-gamepad.ts`: gamepad event subscriber + Steam Deck detection.
- `apps/frontend/src/app.tsx`: composition + bridge between gamepad direction and BLE send (locked).
- `apps/frontend/src/components/control-pad.tsx`: manual direction buttons.
- `apps/frontend/src/components/status-bar.tsx`: connectivity pills.
- `apps/frontend/src/types.ts`: `Direction` type.

**Tauri ACL surface:**
- `apps/frontend/src-tauri/capabilities/main.json`: window-to-permission binding.
- `apps/frontend/src-tauri/permissions/ble.toml`: permission definitions for the three BLE commands and the `ble-state-changed` event.
- `apps/frontend/src-tauri/permissions/default.toml`: default permission set.

**Testing:**
- `apps/frontend/src/**/*.test.{ts,tsx}`: Vitest + jsdom + Testing Library (co-located).
- `apps/frontend/src/setupTests.ts`: `@testing-library/jest-dom/vitest` import.
- `apps/frontend/src-tauri/tests/*.rs`: Cargo integration tests (run via `cargo test`).
- Gamepad inline tests: `#[cfg(test)] mod tests` inside `gamepad/mod.rs`.

**Packaging:**
- `flatpak/com.ks0555.robotcontroller.yaml`: Flatpak manifest (runtime, sandbox, finish-args).
- `flatpak/com.ks0555.robotcontroller.metainfo.xml`: AppStream metadata.
- `flatpak/Dockerfile`: build environment for `flatpak-builder` on non-Linux hosts.
- `apps/frontend/src-tauri/icons/`: platform icons.

**CI/CD:**
- `.github/workflows/ci.yml`: PR pipeline — `turbo build lint typecheck test`, `format:check`, and the `app.tsx` lock check.
- `.github/workflows/build.yml`: tag-triggered + manual — builds `.deb`, then `.flatpak`, then uploads to the GitHub Release.
- `.github/workflows/release-please.yml`: release-please automation.

**Scripts:**
- `upgrade-robot-controller.sh`: Steam Deck install/upgrade helper (curl-pipe-bash entry point).

## Naming Conventions

**Files:**
- TypeScript: `kebab-case.ts` / `kebab-case.tsx` (e.g., `use-bluetooth.ts`, `control-pad.tsx`, `error-boundary.tsx`).
- Tests: co-located with the source they cover, mirror name (`control-pad.test.tsx`, `use-bluetooth.test.ts`).
- The composition root file is `app.tsx` — lowercase, even though it exports the `App` component (PascalCase).
- Rust modules: lowercase + `mod.rs` (e.g., `ble/mod.rs`, `gamepad/mod.rs`). Feature submodules use `<name>.rs` (e.g., `ble/state.rs`).
- Rust integration tests: `<feature>_<topic>_test.rs` (e.g., `ble_connect_test.rs`).
- Markdown docs at root use `UPPERCASE.md` (e.g., `AGENTS.md`, `CHANGELOG.md`, `README.md`); long-form docs under `docs/` follow the same convention (`ARCHITECTURE.md`, `RUNNING.md`).
- Tauri config files: lowercase JSON/TOML (`tauri.conf.json`, `main.json`, `ble.toml`).

**Directories:**
- All lowercase, single-purpose, plural when listing multiples (e.g., `hooks/`, `components/`, `capabilities/`, `permissions/`).
- Feature modules in Rust use singular names matching their domain (`ble/`, `gamepad/`).
- Workspace tier dirs: `apps/`, `packages/`.

**Code-level identifiers:**
- React components: `PascalCase` (`ControlPad`, `StatusBar`, `ErrorBoundary`).
- Hooks: `useCamelCase` (`useBluetooth`, `useGamepad`).
- Variables / functions: `camelCase`.
- Types / interfaces: `PascalCase` (`Direction`, `BluetoothState`, `ControlPadProps`).
- Type parameters: `T`-prefixed (per `.agents/rules/typescript.md`).
- Rust types: `PascalCase` (`BleState`, `Direction`).
- Rust functions / variables: `snake_case` (`ble_connect`, `find_bt24`, `setup_gamepad_monitor`).
- Constants: `UPPER_SNAKE_CASE` (`BT24_NAME`, `SCAN_TIMEOUT`, `DEADZONE`, `STEAM_DECK_VENDOR_ID`).
- Tauri event channel names: `kebab-case` with feature prefix (`ble-state-changed`, `gamepad-direction`, `gamepad-connected`, `gamepad-disconnected`).
- Tauri command names: `snake_case` to match Rust function names (`ble_connect`, `ble_send`).
- Tauri permission identifiers: `kebab-case` matching command name (`ble-connect`, `ble-send`).

## Where to Add New Code

**New Tauri command (Rust → JS):**
1. Add an `async fn` annotated `#[tauri::command]` in the appropriate feature module under `apps/frontend/src-tauri/src/<feature>/mod.rs`. Return `Result<T, String>`.
2. Re-export it via `pub use` if it's not already in `mod.rs`.
3. Register it in `tauri::generate_handler![...]` in `apps/frontend/src-tauri/src/lib.rs:54-58`.
4. Add a permission entry in `apps/frontend/src-tauri/permissions/<feature>.toml` (or create a new file).
5. Reference the permission in `apps/frontend/src-tauri/capabilities/main.json`.
6. Add a wrapper in the matching React hook under `apps/frontend/src/hooks/`.
7. Add tests: a Rust integration test under `apps/frontend/src-tauri/tests/` and a hook test under `apps/frontend/src/hooks/`.

**New Tauri event (Rust → JS):**
1. Emit from Rust via `app_handle.emit("<event-name>", payload)`. Payload is JSON-serializable.
2. If the event needs explicit ACL, add an `events.allow = ["<event-name>"]` permission entry under `permissions/` and list it in `capabilities/main.json`.
3. Subscribe in the matching hook via `listen<T>("<event-name>", cb)`; track the returned `UnlistenFn` in a `useRef`-backed array (see `use-gamepad.ts`) and call it on cleanup.

**New Rust feature module:**
1. Create `apps/frontend/src-tauri/src/<feature>/mod.rs` (use a directory if the feature will grow beyond one file, otherwise a single `<feature>.rs` is fine).
2. Add `pub mod <feature>;` to `apps/frontend/src-tauri/src/lib.rs`.
3. If the feature owns shared state, define a struct in `<feature>/state.rs`, derive `Clone`, and register it via `app.manage(state)` in `lib.rs::run::setup`.
4. Add integration tests in `apps/frontend/src-tauri/tests/<feature>_<topic>_test.rs`.

**New React hook:**
- Location: `apps/frontend/src/hooks/use-<feature>.ts`.
- Test: `apps/frontend/src/hooks/use-<feature>.test.ts`.
- Pattern: follow `use-gamepad.ts` — async setup inside `useEffect`, track unlisten functions in a `useRef`, guard with a `cancelled` flag.

**New React component:**
- Location: `apps/frontend/src/components/<name>.tsx`.
- Test: `apps/frontend/src/components/<name>.test.tsx`.
- Keep components presentational; IPC stays in hooks. Do not import from `@tauri-apps/api/*` inside components.

**New shared type:**
- Location: `apps/frontend/src/types.ts` for cross-cutting types (e.g., `Direction`).
- For feature-local types, co-locate them in the consuming file (see the `BUTTONS` array shape in `control-pad.tsx` or `BluetoothState` in `use-bluetooth.ts`).

**New utility / shared helper:**
- For frontend-only helpers: there's currently no `apps/frontend/src/lib/` or `utils/` directory. Add helpers next to their primary consumer or create `apps/frontend/src/lib/<helper>.ts` if it has multiple consumers and unit-test it.
- For Rust helpers: keep them in the owning feature module (see `find_bt24` in `ble/mod.rs`).

**New env var:**
- Frontend: prefix with `VITE_` (e.g., `VITE_DEFAULT_DEVICE=BT24`) and access via `import.meta.env.VITE_*`. Document expected vars in `apps/frontend/README.md`. Place the value in `apps/frontend/.env` (already exists).
- Backend (Rust): use `std::env::var(...)`. Document in `apps/frontend/src-tauri/ARCHITECTURE.md` if it affects Flatpak detection or D-Bus.

**New Tauri permission/capability:**
- Permission: declare under `apps/frontend/src-tauri/permissions/<feature>.toml` with `[[permission]]` blocks.
- Capability: reference the permission identifier in `apps/frontend/src-tauri/capabilities/main.json`.

**New CI step:** modify `.github/workflows/ci.yml` (PR) or `.github/workflows/build.yml` (release).

**New documentation:**
- User-facing: under `docs/<TOPIC>.md`.
- Codebase analysis (these mapper outputs): under `.planning/codebase/`.
- Tauri-specific architecture: extend `apps/frontend/src-tauri/ARCHITECTURE.md`.

**Where NOT to add code:**
- `apps/backend/` — empty deprecated directory. Adding code here will silently miss CI; the directory is not in the workspace task graph for any meaningful purpose.
- `apps/frontend/src/app.tsx` — locked by CI. Add new hooks/components and (separately) request an allow-listed change.
- `apps/frontend/src-tauri/gen/` — Tauri-generated, even though committed. Hand-edits will be overwritten by `tauri-build`.

## Special Directories

**`apps/backend/`:**
- Purpose: legacy Fastify backend stub.
- Generated: No (manually created and then emptied).
- Committed: Yes (empty directory tracked via convention; effectively a tombstone).
- Status: deprecated — do not add code.

**`apps/frontend/src-tauri/gen/`:**
- Purpose: Tauri-generated capability/ACL schemas for editor schema-aware autocomplete in the JSON capability files.
- Generated: Yes — produced by `tauri-build` during `cargo build`.
- Committed: Yes (referenced by `capabilities/main.json` via `$schema: "../gen/schemas/desktop-schema.json"`).

**`apps/frontend/dist/`:**
- Purpose: Vite build output (the WebView assets).
- Generated: Yes (by `pnpm build`).
- Committed: No (`.gitignore`).
- Consumed by: `cargo tauri build` (which reads `frontendDist: "../dist"` from `tauri.conf.json`).

**`apps/frontend/src-tauri/target/`:**
- Purpose: Cargo build output.
- Generated: Yes. Committed: No.

**`.turbo/`:**
- Purpose: Turborepo cache.
- Generated: Yes. Committed: No.

**`.planning/`:**
- Purpose: GSD planning artifacts (phases, research, codebase analyses, milestones).
- Generated: Yes (by GSD commands).
- Committed: depends on subdirectory — `.planning/codebase/` typically committed; `tmp/` typically not.

**`flatpak/validation-reports/` and `flatpak/validation-logs/`:**
- Purpose: per-run validation outputs.
- Generated: Yes (by validation scripts).
- Committed: No (`.gitignore`).

**`node_modules/`:**
- Purpose: pnpm-managed dependencies (hoisted at root + per-package).
- Generated: Yes. Committed: No.

**`packages/eslint-config/dist/`:**
- Purpose: built ESLint config output.
- Generated: Yes. Committed: No.

**`RobotController-x86_64.flatpak` (repo root):**
- Purpose: most-recent local Flatpak build kept at repo root for convenience.
- Generated: Yes (by `just flatpak-build` or `just docker-build-all`).
- Committed: currently tracked, but treated as a build artifact — do not edit by hand.

---

*Structure analysis: 2026-05-14*

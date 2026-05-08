<!-- generated-by: gsd-doc-writer -->

# KS0555 Steam Deck Robot Controller

Drive a Bluetooth Arduino robot (DX-BT24 module) with your Steam Deck gamepad. Single Tauri v2 desktop app — Rust talks BLE directly via `btleplug`, gamepad via `gilrs`. No separate backend, no `rfcomm`, no Chrome flags.

> **Looking for full per-device run instructions?** See **[docs/RUNNING.md](docs/RUNNING.md)** — Steam Deck (Desktop + Gaming Mode), macOS dev workflow, Linux dev workflow, and a troubleshooting matrix. The sections below are the quick version.

## Install on Steam Deck

In **Desktop Mode**, open Konsole and run:

```bash
curl -fsSL https://raw.githubusercontent.com/pau-vega/KS0555-Steam-Deck-Controller-2/main/install-on-steamdeck.sh | bash
```

That:

1. Downloads the latest signed AppImage from GitHub Releases.
2. Drops it in `~/Applications/RobotController.AppImage` and makes it executable.
3. Registers a `.desktop` entry so it shows up in Steam's _Add a Non-Steam Game_ picker.

Final manual step: in Steam → Library → **+** → **Add a Non-Steam Game** → pick **Robot Controller** → _Add Selected Programs_. Switch to Gaming Mode and it lives under the Non-Steam tab. Re-run the curl line any time to upgrade.

### Manual install (no script)

If you'd rather not pipe to bash:

1. Grab the AppImage matching your CPU from the [latest release](https://github.com/pau-vega/KS0555-Steam-Deck-Controller-2/releases/latest) (Steam Deck = `x86_64`).
2. `chmod +x ~/Downloads/RobotController-x86_64.AppImage`.
3. Steam → Library → **+** → **Add a Non-Steam Game** → _Browse_ → pick the AppImage.

## Run on Mac (no build)

CI publishes a universal `.dmg` (Intel + Apple Silicon) on every tagged release. To install:

1. Download `RobotController-universal.dmg` from the [latest release](https://github.com/pau-vega/KS0555-Steam-Deck-Controller-2/releases/latest).
2. Open the DMG and drag _Robot Controller_ into Applications.
3. First launch: right-click → _Open_ → _Open_ (the bundle is unsigned, so Gatekeeper warns once).
4. Allow Bluetooth access when macOS asks.

## Develop on Mac

The same Tauri app runs on macOS — `btleplug` uses CoreBluetooth, `gilrs` uses IOKit. You can iterate on the Mac and only boot the Deck when you need on-device verification.

```bash
pnpm install
pnpm --filter @ks0555/frontend tauri:dev
```

First time you press _Connect Bluetooth_, macOS prompts for Bluetooth access — driven by `NSBluetoothAlwaysUsageDescription` in `apps/frontend/src-tauri/Info.plist`. Allow it once.

To produce a local `.app` / `.dmg`:

```bash
pnpm --filter @ks0555/frontend tauri:build
# Output: apps/frontend/src-tauri/target/release/bundle/{macos,dmg}/
```

The macOS bundle is unsigned — Gatekeeper will warn on first launch. Right-click → _Open_ once to whitelist it.

## Architecture

```
React (Vite)  ──Tauri IPC──>  Rust (btleplug + gilrs)  ──BLE──>  BT24  ──UART──>  Arduino
```

One process, one binary. The Rust side owns the BLE peripheral handle and the gamepad event loop; the React side just `invoke()`s commands and `listen()`s for state events.

## Commands

The Arduino sketch accepts these single-character commands over the BT24 serial line:

| Command | Action        |
| ------- | ------------- |
| `F`     | Move forward  |
| `B`     | Move backward |
| `L`     | Turn left     |
| `R`     | Turn right    |
| `S`     | Stop          |

## Gamepad Mapping

| Input            | Command |
| ---------------- | ------- |
| Left stick up    | `F`     |
| Left stick down  | `B`     |
| Left stick left  | `L`     |
| Left stick right | `R`     |
| Stick at neutral | `S`     |

Left-stick deadzone is 0.15 (defined in `apps/frontend/src-tauri/src/gamepad/mod.rs`).

## Build from Source

Prereqs: Node ≥ 18 (`.nvmrc` pins exact version), pnpm ≥ 10, Rust stable.

```bash
pnpm install
pnpm --filter @ks0555/frontend tauri:build  # macOS / Linux dev box
./build-steamdeck.sh                        # SteamOS / Arch self-build (optional)
```

`build-steamdeck.sh` exists for offline / on-device source builds — usually you don't need it; the GitHub Actions workflow at `.github/workflows/build.yml` produces the AppImage attached to each tagged release.

## Project Layout

| Path                                          | What lives there                                         |
| --------------------------------------------- | -------------------------------------------------------- |
| `apps/frontend/`                              | Vite + React UI                                          |
| `apps/frontend/src-tauri/`                    | Tauri shell, Rust BLE + gamepad code, bundle config      |
| `apps/frontend/src-tauri/Info.plist`          | macOS Bluetooth usage description                        |
| `packages/eslint-config`, `packages/tsconfig` | Shared lint / TS configs                                 |
| `install-on-steamdeck.sh`                     | One-shot installer for end users                         |
| `build-steamdeck.sh`                          | On-device source build (SteamOS / Arch / Debian)         |
| `docs/RUNNING.md`                             | Per-device detailed run instructions and troubleshooting |
| `docs/STEAM_DECK.md`                          | Steam Deck verification notes                            |

## Development Scripts

| Script                 | Purpose                                                                     |
| ---------------------- | --------------------------------------------------------------------------- |
| `pnpm dev`             | Start Tauri dev server (same as `pnpm --filter @ks0555/frontend tauri:dev`) |
| `pnpm build`           | Build all workspaces via Turbo                                              |
| `pnpm lint`            | Run ESLint across all packages                                              |
| `pnpm typecheck`       | TypeScript type check across all packages                                   |
| `pnpm format:check`    | Check code formatting with Prettier                                         |
| `pnpm test`            | Run tests via Vitest                                                        |
| `pnpm build:steamdeck` | Build AppImage for SteamOS                                                  |

## Technology Stack

- **Frontend:** TypeScript 5.9, React 19, Vite 8, Tailwind CSS 4
- **Desktop Shell:** Tauri 2.11.0
- **BLE:** `btleplug` 0.12.0 (cross-platform: BlueZ on Linux, CoreBluetooth on macOS)
- **Gamepad:** `gilrs` 0.11.1 (udev/evdev on Linux, IOKit on macOS)
- **Async Runtime:** Tokio 1 + Futures 0.3
- **Testing:** Vitest 4
- **Linting:** ESLint 10 (flat config), Prettier 3, typescript-eslint 8
- **Build Orchestration:** Turbo 2
- **Package Manager:** pnpm 10.29.3

## License

This project is private and not open-source.

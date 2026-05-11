<!-- generated-by: gsd-doc-writer -->

# Getting Started

This guide walks new contributors through setting up the Robot Controller project for local development. The same Tauri v2 binary runs on macOS, Linux, and Steam Deck — we'll focus on the shared dev setup first, then platform-specific details.

## Prerequisites

### All platforms

- **Node.js >= 18.0.0** — pinned to v24 in `.nvmrc`. Use a version manager:
  - `fnm` (fast-node-manager): `fnm use` — reads `.nvmrc` automatically.
  - `nvm`: `nvm use` — reads `.nvmrc` automatically.
  - `asdf`: `asdf install` — requires the `nodejs` plugin.

- **pnpm >= 10.29.3** — the exact version is enforced in `package.json` via `"packageManager"`. Enable corepack (built into Node 18+):

  ```bash
  corepack enable
  corepack prepare pnpm@10.29.3 --activate
  ```

- **Rust stable** (any recent version from 2024+) — handles BLE and gamepad I/O via `btleplug` and `gilrs`:
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  source $HOME/.cargo/env
  ```

### macOS (11+, Intel or Apple Silicon)

- **Xcode Command Line Tools:**
  ```bash
  xcode-select --install
  ```
  (Required for Rust compilation and native Tauri dependencies.)

### Linux (Arch, Debian, Ubuntu, SteamOS)

Platform-specific system libraries for WebKit and gamepad input:

**Arch / SteamOS:**

```bash
sudo pacman -S webkit2gtk-4.1 libappindicator-gtk3 librsvg patchelf fuse2 libudev-zero
```

**Debian / Ubuntu:**

```bash
sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev libudev-dev patchelf libfuse2
```

**Gamepad input group** (Linux only) — Your user needs read access to `/dev/input/event*`:

```bash
sudo usermod -aG input "$USER"
# Log out and back in for the group to take effect
```

## Installation Steps

### 1. Clone the repository

```bash
git clone https://github.com/pau-vega/KS0555-Steam-Deck-Controller-2.git
cd KS0555-Steam-Deck-Controller-2
```

### 2. Ensure Node version matches

If you have `fnm` or `nvm` installed, they'll read `.nvmrc` automatically:

```bash
fnm use    # or: nvm use
```

Verify:

```bash
node --version    # Should be v24.x.x
```

### 3. Install dependencies

This is a monorepo with a Rust Tauri shell. pnpm will install Node deps and trigger a `cargo build` during the Tauri build step:

```bash
pnpm install
```

(pnpm locks `10.29.3` — if you have a different version, it will error with a clear message.)

## First Run

### Start the dev server

```bash
pnpm dev
```

This command:

1. Starts the Vite dev server on `http://localhost:5173` (React frontend).
2. Starts a Tauri dev shell that wraps the Vite server.
3. Spawns the Rust backend with BLE and gamepad tasks.

You should see the window open at 1280×800 with the Robot Controller UI.

### Test a BLE connection (requires hardware)

If you have a BT24 Bluetooth module and Arduino within range:

1. Click **Connect Bluetooth**.
2. The app scans for a device named `BT24` for 5 seconds.
3. On macOS, a **Bluetooth permission prompt** appears the first time (see troubleshooting below).
4. Once connected, tilt the left analog stick to send direction commands.

If you don't have the hardware yet, the app will still compile and launch — just skip the BLE connection.

## Common Setup Issues

### Node version mismatch

**Symptom:** `pnpm install` fails with "This project has engines.node of >=18.0.0, but you're using v16..."

**Fix:** Use `fnm use` or `nvm use` to load the version from `.nvmrc`:

```bash
fnm use
pnpm install
```

### Missing pnpm version

**Symptom:** "This project is configured to use pnpm >= 10.29.3, but you're using x.y.z"

**Fix:** Re-enable corepack and prepare the exact version:

```bash
corepack enable
corepack prepare pnpm@10.29.3 --activate
pnpm install
```

### macOS: Bluetooth permission denied

**Symptom:** When you click **Connect Bluetooth**, the app shows "Bluetooth permission denied" or the scan times out.

**Fix:** macOS requires explicit permission the first time. A system dialog should appear when you click **Connect Bluetooth** — allow it. If you missed it:

```
System Settings → Privacy & Security → Bluetooth
→ toggle Robot Controller on → relaunch the app
```

The permission is remembered per app bundle (`com.ks0555.robotcontroller`).

### Linux / SteamOS: Missing webkit2gtk-4.1

**Symptom:** `pnpm dev` fails with linker errors or the app crashes on startup with "libwebkit2gtk-4.1.so.0 not found."

**Fix:** Install the platform-specific WebKit dev package (see Prerequisites → Linux section above). On SteamOS, you may need to disable the read-only filesystem first:

```bash
sudo steamos-readonly disable
sudo pacman -S webkit2gtk-4.1 librsvg patchelf libudev-zero
sudo steamos-readonly enable
pnpm install
```

### Linux: Gamepad not detected

**Symptom:** You have a gamepad plugged in, but the app doesn't recognize it.

**Fix:** The gamepad input goes through `gilrs` → `udev` → `evdev`, which requires your user to be in the `input` group:

```bash
sudo usermod -aG input "$USER"
# Log out, then log back in
pnpm dev
```

After logging back in, try tapping the gamepad again.

### Rust compilation fails with weird linker errors

**Symptom:** `cargo` fails during `pnpm dev` or `pnpm tauri:build`.

**Fix:**

- **macOS:** Re-run `xcode-select --install`. Apple sometimes removes SDK headers after a system update.
- **Linux:** Ensure all system packages from Prerequisites are installed, and you've run `rustup update`.

## Next Steps

Once `pnpm dev` runs and you're familiar with the UI:

- **Running on specific devices:** See [RUNNING.md](./RUNNING.md) for Steam Deck end-user install, macOS build, and per-platform BLE/gamepad quirks.
- **Setting up for local development:** See [DEVELOPMENT.md](./DEVELOPMENT.md) for build scripts, linting, and code style.
- **Understanding the architecture:** See [ARCHITECTURE.md](./ARCHITECTURE.md) for the component diagram, data flow, and key abstractions.
- **Configuration & environment:** See [CONFIGURATION.md](./CONFIGURATION.md) for any environment variables and per-environment overrides.

## Hardware Checklist (optional)

To test the full control loop, you'll need:

1. **Arduino** with BT24 DX-BT24 Bluetooth module wired to RX/TX.
2. **BT24 powered on** (usually a separate 5V supply) and **within Bluetooth range** (~5–10 meters).
3. **Steam Deck, Mac, or Linux box** with the prerequisites above.

On first run:

- The BT24 module advertises as device name `BT24`.
- Click **Connect Bluetooth** — the app scans for 5 seconds and connects automatically (no pairing needed).
- Tilt the left stick to send commands (`F`/`B`/`L`/`R`/`S` over BLE).

No hardware? The app still builds and runs — you'll just skip the BLE connection step.

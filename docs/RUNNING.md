# Running Robot Controller

The same Tauri v2 binary runs on three places: a Steam Deck (end-user device), a Mac (developer workstation), and any modern Linux box. Bluetooth and gamepad I/O happen in the Rust side via `btleplug` and `gilrs` — no separate backend, no `rfcomm`, no Chrome flags.

> **Hardware prerequisite (any device):** the BT24 module on the Arduino must be powered on and within Bluetooth range. The app scans for the device named `BT24` for 5 seconds when you click _Connect Bluetooth_.

---

## Steam Deck — end user

### Desktop Mode (one-time setup)

1. Switch the Deck to Desktop Mode (Steam → Power → _Switch to Desktop_).
2. Open Konsole and run:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/pau-vega/KS0555-Steam-Deck-Controller-2/main/install-on-steamdeck.sh | bash
   ```

   The script downloads `RobotController-x86_64.AppImage` from the latest GitHub Release into `~/Applications/`, makes it executable, and registers a `.desktop` entry so Steam can see it.

3. Open Steam (still in Desktop Mode):
   - Library → **+** → **Add a Non-Steam Game**.
   - Pick **Robot Controller** from the list.
   - Click _Add Selected Programs_.

4. Right-click the new entry in the Library → _Properties_ → set the Steam Input layout to **Gamepad with Mouse Trackpad** (or any other gamepad layout — the app reads the left analog stick natively via `gilrs`, so most templates work).

### Gaming Mode (the regular way to play)

1. Switch back to Gaming Mode.
2. Library → _Non-Steam_ → **Robot Controller** → press A.
3. The window opens at 1280×800. Click _Connect Bluetooth_. The Deck does not need a paired BT24 first — `btleplug` scans BlueZ for any device named `BT24` and connects.
4. Tilt the left stick to drive. Stick at neutral = `S` (stop).

### Updating

Re-run the curl line in Desktop Mode whenever a new release ships. The script overwrites the AppImage in place; the Steam shortcut keeps working.

### Manual install (no shell script)

If piping to bash isn't your style:

1. Download `RobotController-x86_64.AppImage` from the [latest release](https://github.com/pau-vega/KS0555-Steam-Deck-Controller-2/releases/latest).
2. `chmod +x ~/Downloads/RobotController-x86_64.AppImage`.
3. Steam → Library → **+** → **Add a Non-Steam Game** → _Browse_ → pick the AppImage → _Add Selected Programs_.

### Building from source on the Deck

Only do this if you can't reach a tagged release (offline / pre-release work):

```bash
# In Desktop Mode, Konsole.
sudo steamos-readonly disable    # SteamOS only
git clone https://github.com/pau-vega/KS0555-Steam-Deck-Controller-2.git
cd KS0555-Steam-Deck-Controller-2
./build-steamdeck.sh             # installs deps via pacman, then `tauri build`
sudo steamos-readonly enable
```

Output: `apps/frontend/src-tauri/target/release/bundle/appimage/*.AppImage`. Same install flow afterwards.

---

## macOS — developer workstation

Tested on Apple Silicon (M-series). Intel Macs work too, target `x86_64-apple-darwin`.

### Prerequisites

- macOS ≥ 11 (Big Sur) — required for CoreBluetooth.
- Xcode Command Line Tools: `xcode-select --install`.
- Node 18+ (`.nvmrc` pins exact version): `fnm use` or `nvm use`.
- pnpm 10: `corepack enable && corepack prepare pnpm@10.29.3 --activate`.
- Rust stable: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`.

### Run in dev mode

```bash
pnpm install
pnpm dev            # = pnpm --filter @ks0555/frontend tauri:dev
```

Vite serves at `http://localhost:5173`; the Tauri shell wraps it. Edits to React reload instantly; edits to Rust trigger a recompile (~2-5 s incremental).

The first time you click _Connect Bluetooth_, macOS prompts for Bluetooth access. The prompt comes from `NSBluetoothAlwaysUsageDescription` in `apps/frontend/src-tauri/Info.plist`. Allow it once — preference is remembered per-bundle-identifier (`com.ks0555.robotcontroller`).

If you accidentally denied: System Settings → Privacy & Security → Bluetooth → toggle the bundle on. Re-launching is enough.

### Build a local `.app` / `.dmg`

```bash
pnpm --filter @ks0555/frontend tauri:build
```

Output: `apps/frontend/src-tauri/target/release/bundle/{macos,dmg}/`. The bundle is **unsigned**, so Gatekeeper warns the first time you double-click. To bypass once: right-click the `.app` → _Open_ → _Open_ again in the dialog. Subsequent launches are silent.

### Connecting to the BT24 robot

No pairing needed. The same `ble_connect` Tauri command that runs on Steam Deck runs on macOS — `btleplug` switches to CoreBluetooth automatically. The BT24 module appears as a peripheral named `BT24` in the scan; the 5-second scan + connect runs identically.

If the Mac doesn't see the BT24:

- Confirm the Arduino is powered and the BT24's blue LED is blinking (advertising).
- macOS occasionally caches a stale scan. Toggle Bluetooth off/on in Control Center.
- Some Macs scan slowly when the lid is closed in clamshell mode. Open the lid.

---

## Linux (Arch / Debian / Ubuntu) — developer workstation

Same Tauri stack. The AppImage from CI runs on most modern desktops, but for development you want a local toolchain.

### Prerequisites

```bash
# Arch / SteamOS
sudo pacman -S webkit2gtk-4.1 libappindicator-gtk3 librsvg patchelf fuse2 libudev-zero

# Debian / Ubuntu
sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev libudev-dev patchelf libfuse2
```

Plus Node 18+, pnpm 10, Rust stable (same as macOS).

### Run in dev mode

```bash
pnpm install
pnpm dev
```

BLE scans via BlueZ over D-Bus. `btleplug` handles BlueZ's quirks (D-30: post-filter scan results by device name, since BlueZ merges discovery filters across processes).

Gamepad input goes through `gilrs` → `udev` → `evdev`. Your user needs read access to `/dev/input/event*` — usually granted by being in the `input` group:

```bash
sudo usermod -aG input "$USER"
# log out + back in
```

### Build a local AppImage

```bash
./build-steamdeck.sh
# or:
pnpm --filter @ks0555/frontend tauri:build
```

---

## Troubleshooting cheat sheet

| Symptom                                       | Fix                                                                                                                                                                                                                                           |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Connect Bluetooth` spins for 5 s then errors | BT24 not advertising. Power-cycle the Arduino; verify the blue LED blinks.                                                                                                                                                                    |
| Mac shows "Bluetooth permission denied"       | System Settings → Privacy & Security → Bluetooth → enable Robot Controller → relaunch.                                                                                                                                                        |
| Steam Deck Gaming Mode opens then closes      | App crashed. In Desktop Mode run the AppImage from Konsole to see the panic. Common cause: missing `webkit2gtk-4.1`.                                                                                                                          |
| Stick tilts, app shows direction `S`          | Gamepad detected but axes in deadzone. Default deadzone is `0.15`; check stick calibration.                                                                                                                                                   |
| Stick works, robot does nothing               | BLE write reaching BT24 but Arduino UART not wired. Verify the BT24 TX → Arduino RX pin.                                                                                                                                                      |
| `cargo check` fails on Mac with linker errors | Re-run `xcode-select --install`. Apple SDK headers go missing after macOS upgrades.                                                                                                                                                           |
| Linux: gamepad detected on desktop, not Deck  | SteamOS Gamescope sometimes hides `evdev` from non-Steam apps. The app's `WEBKIT_DISABLE_COMPOSITING_MODE=1` plus `gilrs`'s direct `udev` access works around it; if it still fails, set Steam Input layout to _Gamepad with Mouse Trackpad_. |

---

## Where things live

| Concern               | File                                         |
| --------------------- | -------------------------------------------- |
| BLE scan / write      | `apps/frontend/src-tauri/src/ble/mod.rs`     |
| Gamepad → Direction   | `apps/frontend/src-tauri/src/gamepad/mod.rs` |
| React entry           | `apps/frontend/src/main.tsx` → `app.tsx`     |
| BLE hook (frontend)   | `apps/frontend/src/hooks/use-bluetooth.ts`   |
| Gamepad hook          | `apps/frontend/src/hooks/use-gamepad.ts`     |
| Window size, bundle   | `apps/frontend/src-tauri/tauri.conf.json`    |
| macOS BLE permission  | `apps/frontend/src-tauri/Info.plist`         |
| Steam Deck installer  | `install-on-steamdeck.sh`                    |
| CI / release pipeline | `.github/workflows/build.yml`                |

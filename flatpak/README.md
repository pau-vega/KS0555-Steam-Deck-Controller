# Flatpak — Robot Controller

## Prerequisites

- flatpak >= 1.14
- flatpak-builder
- Flathub remote configured:

```bash
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
```

- `org.freedesktop.Platform//24.08` runtime and `org.freedesktop.Sdk//24.08` SDK
  (auto-fetched by flatpak-builder on first build)

## Building

1. Build the Tauri deb:

```bash
cd apps/frontend/src-tauri
cargo tauri build --bundles deb
```

2. Run the build script:

```bash
./flatpak/build.sh apps/frontend/src-tauri/target/release/bundle/deb/robot-controller_0.1.5_amd64.deb
```

`build.sh` validates the package structure on macOS and runs flatpak-builder on Linux
to produce a single-file `.flatpak` bundle.

## Installing and Running

```bash
# Install the .flatpak bundle
flatpak install --user RobotController-x86_64.flatpak

# Run the app
flatpak run com.ks0555.robotcontroller
```

## Regenerating Icons

Source icon: `apps/frontend/src-tauri/icons/icon.png` (256×256 RGBA PNG)

```bash
# 32×32 downscale
convert apps/frontend/src-tauri/icons/icon.png -resize 32x32 flatpak/icons/32x32/com.ks0555.robotcontroller.png

# 128×128 downscale
convert apps/frontend/src-tauri/icons/icon.png -resize 128x128 flatpak/icons/128x128/com.ks0555.robotcontroller.png

# 512×512 upscale (256@2 high-DPI)
convert apps/frontend/src-tauri/icons/icon.png -resize 512x512 flatpak/icons/256x256@2/com.ks0555.robotcontroller.png
```

Icons are pre-generated and committed to the repository. Regeneration is only
needed when the source icon changes.

## Architecture

The Flatpak build uses a **deb-extract** pattern:

1. Tauri builds a `.deb` via `cargo tauri build --bundles deb`
2. `build.sh` copies the `.deb` into the `flatpak/` directory
3. `flatpak-builder` extracts it with `ar -x` + `tar -xf`
4. Build-commands install the binary, desktop file, and icons to Flatpak paths
5. The desktop file is renamed to `com.ks0555.robotcontroller.desktop` and its
   `Icon=` line is updated to match the Flatpak app ID

See the root [README](../README.md) for full usage documentation.

## Flatpak Manifest

- **Location:** `flatpak/com.ks0555.robotcontroller.yaml`
- **Runtime:** `org.freedesktop.Platform//24.08`
- **SDK:** `org.freedesktop.Sdk//24.08`
- **Extension:** `org.freedesktop.Platform.GL.default`

**Finish-args (display only):** `--socket=wayland`, `--socket=fallback-x11`,
`--share=ipc`, `--device=dri`, `--env=WEBKIT_DISABLE_COMPOSITING_MODE=1`

BLE (`org.bluez`) and gamepad (`--device=input`) finish-args are added in a
later phase and are not present in the initial manifest.

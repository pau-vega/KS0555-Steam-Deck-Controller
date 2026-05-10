# Steam Deck Support

This project targets Steam Deck as a primary platform. The app runs natively
on Steam Deck via Flatpak distribution.

## Install on Steam Deck

### Prerequisites

- SteamOS 3.6+ (Flatpak ≥ 1.15.8 ships with it)
- Download the latest `.flatpak` bundle from GitHub Releases

### Install

```bash
flatpak install --user RobotController-<version>-x86_64.flatpak
```

### Add as Non-Steam Game (Gaming Mode)

1. Switch to Desktop Mode
2. Open Steam → "Add a Non-Steam Game" → Browse
3. Navigate to `~/.local/share/flatpak/exports/bin/com.ks0555.robotcontroller`
   (or `/var/lib/flatpak/exports/bin/com.ks0555.robotcontroller` for system-wide install)
4. Select it, add to library
5. Switch back to Gaming Mode — the app appears in your library

### Upgrade

```bash
flatpak install --user --reinstall RobotController-<version>-x86_64.flatpak
```

## Build for Steam Deck

### Prerequisites

- Rust stable toolchain (x86_64)
- Flatpak + flatpak-builder installed
- System deps: `libwebkit2gtk-4.1-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`, etc.

### Build Commands

```bash
# 1. Build the .deb
cargo tauri build --bundles deb

# 2. Build Flatpak (runs the flatpak/build.sh script)
cd flatpak && ./build.sh

# Output: RobotController-<version>-x86_64.flatpak
```

Or use justfile recipes:

```bash
just flatpak-build   # Run flatpak-builder
just flatpak-install # Install the built Flatpak
just flatpak-run     # Run the installed Flatpak
```

### GitHub Actions (CI)

Single CI job (`build`) on `ubuntu-24.04`:

1. Install system deps + stock tauri-cli (no fork)
2. Build Rust binary + bundle as .deb
3. Copy .deb to flatpak/ directory
4. flatpak-builder wraps .deb into .flatpak using the manifest
5. Upload .flatpak + SHA256 to GitHub Release

## Controller Mapping

### Steam Deck Gamepad Detection

The app auto-detects Steam Deck via `use-gamepad.ts`:

- Vendor ID: `057e` (Valve)
- Product ID: `2009` (Steam Deck controller)
- Fallback: matches "steam deck" or "galileo" in gamepad ID string

### Steam Input Best Practices (Verified Requirements)

| Requirement                     | Implementation                                         |
| ------------------------------- | ------------------------------------------------------ |
| Default controller config works | `use-gamepad.ts` maps all D-pad/joystick to directions |
| On-screen keyboard              | Tauri webview handles text inputs natively             |
| 1280×800 resolution             | `tauri.conf.json` sets window to 1280×800              |
| No launcher                     | Tauri is the launcher — app opens directly             |
| Cloud saves                     | Use Steam Cloud or `@tauri-apps/plugin-store`          |

### Gyro/Trackpad Support

Steam Deck trackpads emulate mouse events natively in Tauri's WebKit webview.
For advanced gyro/gyro-as-mouse, use Steam Input API via FFI or `tauri-plugin-shell`.

## Performance Tips

- **Bundle size**: Flatpak ~50-80MB (runtime + app; single .flatpak ~10MB)
- **Async Rust commands**: Keep UI thread free — use `async fn` in Tauri commands
- **Proton**: Steam's compatibility layer translates DirectX→Vulkan automatically

## Known Issues

1. **Text input in gaming mode**: If on-screen keyboard doesn't appear, ensure Steam Overlay is enabled
2. **Gamepad detection delay**: Steam Deck gamepad may take ~2s to initialize after app launch
3. **Flatpak launch under Gamescope**: `WEBKIT_DISABLE_COMPOSITING_MODE=1` is set automatically in `lib.rs` to bypass WebKitGTK's broken GPU compositing path under Gamescope

## Steam Deck Verified Checklist

- [x] Default controller config enables all functionality
- [x] On-screen keyboard appears for text inputs
- [x] 1280×800 resolution supported
- [x] No launcher before game
- [x] Single-player content works offline
- [ ] Cloud saves (recommend Steam Cloud integration)
- [ ] Vulkan primary graphics API (Proton handles DX→Vulkan translation)

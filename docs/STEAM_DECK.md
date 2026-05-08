# Steam Deck Support

This project targets Steam Deck as a primary platform. The app runs natively on Steam Deck via Linux/AppImage.

## Build for Steam Deck

The Steam Deck APU (Van Gogh / Sephiroth on the OLED) is **AMD x86_64**, not ARM. Build a regular Linux x86_64 AppImage.

### Prerequisites

A stock Rust stable toolchain on any x86_64 Linux box (or via cross-compile from another arch) is enough — no extra `rustup target add` needed.

### Build Commands

```bash
# Build AppImage for Steam Deck (x86_64)
cd apps/frontend
pnpm tauri build

# Output: src-tauri/target/release/bundle/appimage/
```

### GitHub Actions (CI)

`ubuntu-22.04` is the matching runner. (The repo's `.github/workflows/build.yml` also produces an `aarch64-unknown-linux-gnu` AppImage in parallel — that one targets ARM SBC-class Linux boxes, **not** the Deck.)

```yaml
build-steam-deck:
  runs-on: ubuntu-22.04
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version-file: .nvmrc
    - uses: dtolnay/rust-toolchain@stable
    - run: pnpm install --frozen-lockfile
    - uses: tauri-apps/tauri-action@v0
      with:
        projectPath: apps/frontend/src-tauri
```

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

- **Bundle size**: AppImage ~5-10MB (vs Electron's ~120MB)
- **No `bundleMediaFramework`**: Disabled in `tauri.conf.json` (reduces AppImage size)
- **Async Rust commands**: Keep UI thread free — use `async fn` in Tauri commands
- **Proton**: Steam's compatibility layer translates DirectX→Vulkan automatically

## Known Issues

1. **Text input in gaming mode**: If on-screen keyboard doesn't appear, ensure Steam Overlay is enabled
2. **Gamepad detection delay**: Steam Deck gamepad may take ~2s to initialize after app launch
3. **AppImage launch in Gaming Mode**: if the AppImage fails to start under Gamescope, the Rust shell already sets `WEBKIT_DISABLE_COMPOSITING_MODE=1` to bypass WebKitGTK's broken GPU compositing path. Check the launch log via Konsole in Desktop Mode if it still fails.

## Steam Deck Verified Checklist

- [x] Default controller config enables all functionality
- [x] On-screen keyboard appears for text inputs
- [x] 1280×800 resolution supported
- [x] No launcher before game
- [x] Single-player content works offline
- [ ] Cloud saves (recommend Steam Cloud integration)
- [ ] Vulkan primary graphics API (Proton handles DX→Vulkan translation)

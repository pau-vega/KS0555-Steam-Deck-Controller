# Steam Deck Support

This project targets Steam Deck as a primary platform. The app runs natively on Steam Deck via Linux/AppImage.

## Build for Steam Deck

### Prerequisites

```bash
# Install cross-compilation target for aarch64 (Steam Deck CPU)
rustup target add aarch64-unknown-linux-gnu
```

### Build Commands

```bash
# Build AppImage for Steam Deck (aarch64)
cd apps/frontend
pnpm tauri build --target aarch64-unknown-linux-gnu

# Output: src-tauri/target/aarch64-unknown-linux-gnu/release/bundle/appimage/
```

### GitHub Actions (CI)

Use `ubuntu-22.04-arm` runner (native ARM, ~10 min builds):

```yaml
build-steam-deck:
  runs-on: ubuntu-22.04-arm
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: lts/*
    - uses: dtolnay/rust-toolchain@stable
    - run: pnpm install
    - uses: tauri-apps/tauri-action@v0
      with:
        projectPath: ./apps/frontend
```

## Controller Mapping

### Steam Deck Gamepad Detection

The app auto-detects Steam Deck via `use-gamepad.ts`:
- Vendor ID: `057e` (Valve)
- Product ID: `2009` (Steam Deck controller)
- Fallback: matches "steam deck" or "galileo" in gamepad ID string

### Steam Input Best Practices (Verified Requirements)

| Requirement | Implementation |
|-------------|-----------------|
| Default controller config works | `use-gamepad.ts` maps all D-pad/joystick to directions |
| On-screen keyboard | Tauri webview handles text inputs natively |
| 1280×800 resolution | `tauri.conf.json` sets window to 1280×800 |
| No launcher | Tauri is the launcher — app opens directly |
| Cloud saves | Use Steam Cloud or `@tauri-apps/plugin-store` |

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
3. **ARM builds**: Must cross-compile from x86 or use ARM runner (ubuntu-22.04-arm)

## Steam Deck Verified Checklist

- [x] Default controller config enables all functionality
- [x] On-screen keyboard appears for text inputs
- [x] 1280×800 resolution supported
- [x] No launcher before game
- [x] Single-player content works offline
- [ ] Cloud saves (recommend Steam Cloud integration)
- [ ] Vulkan primary graphics API (Proton handles DX→Vulkan translation)

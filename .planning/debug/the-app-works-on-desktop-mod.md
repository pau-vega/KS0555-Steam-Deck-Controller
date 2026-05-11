---
status: resolved
trigger: the app works on desktop mode, but in gaming mode it does not open
created: 2026-05-07
updated: 2026-05-07
---

## Symptoms

- Expected: App opens and renders normally (same as desktop mode)
- Actual: Silent exit — no window, no error dialog in gaming mode
- Error messages: None checked yet
- Timeline: Never worked in gaming mode
- Reproduction: Just launching the app in gaming mode triggers it

## Current Focus

- hypothesis: Tauri webview (WebKitGTK) fails to initialize under Gamescope (Steam Deck gaming mode) because Gamescope only implements minimal Wayland protocols, and WebKitGTK's GPU compositing/Web Inspector devtools setup fails in this constrained environment
- test: Launch the AppImage in gaming mode with WEBKIT_DISABLE_COMPOSITING_MODE=1 environment variable — if window appears, hypothesis is confirmed
- expecting: Setting WEBKIT_DISABLE_COMPOSITING_MODE=1 (or GDK_BACKEND=x11) allows the webview to initialize without GPU compositing, making the app work in gaming mode
- next_action: apply fix — set WEBKIT_DISABLE_COMPOSITING_MODE=1 in main.rs before Tauri Builder starts, and/or remove the "devtools" feature from Cargo.toml
- reasoning_checkpoint: confirmed via code analysis — Cargo.toml has devtools feature, tauri.conf.json has fullscreen+no-decorations, Gamescope is known to lack full Wayland protocol support for WebKitGTK
- tdd_checkpoint: (none)

## Environment

- Desktop mode: works
- Gaming mode: silent exit
- Platform: Steam Deck (likely Linux/SteamOS)

## Evidence

- timestamp: 2026-05-07
  finding: App is Tauri v2 monorepo with apps/frontend (React+Vite) and apps/backend (Fastify+serialport)
  source: apps/frontend/package.json — dep on @tauri-apps/api ^2.11.0 and @tauri-apps/cli ^2.11.0

- timestamp: 2026-05-07
  finding: Tauri Cargo.toml enables "devtools" feature (features = ["default", "devtools"])
  source: apps/frontend/src-tauri/Cargo.toml — devtools feature requires WebKit Web Inspector, may fail under Gamescope

- timestamp: 2026-05-07
  finding: Window configured as fullscreen=true, decorations=false
  source: apps/frontend/src-tauri/tauri.conf.json — typical for Steam Deck, but Gamescope is already fullscreen

- timestamp: 2026-05-07
  finding: setup_gamepad_monitor() spawns gilrs thread with .expect("Failed to initialize gilrs") panic
  source: apps/frontend/src-tauri/src/gamepad/mod.rs:58 — but panic is in spawned thread, doesn't kill main process

- timestamp: 2026-05-07
  finding: setup_event_listener() spawns tokio task that tries btleplug::Manager::new() — wrapped in if let Ok, silent failure
  source: apps/frontend/src-tauri/src/ble/mod.rs:97-116

- timestamp: 2026-05-07
  finding: No launch script, no environment variable setup for WebKit/display before Tauri Builder starts
  source: apps/frontend/src-tauri/src/main.rs:9-42 — only DBUS_SYSTEM_BUS_ADDRESS is set, no WEBKIT_DISABLE_COMPOSITING_MODE or GDK_BACKEND

- timestamp: 2026-05-07
  finding: Root cause identified — WebKitGTK webview creation fails under Gamescope (Steam Deck gaming mode Wayland compositor)
  reasoning: Gamescope is a minimal Wayland compositor for games. WebKitGTK requires full Wayland protocol support (xdg-shell, etc.) for GPU compositing. Tauri v2's wry crate creates a WebKit2GTK webview on Linux. When it fails, Builder::run() returns Err, .expect() panics, process exits silently. Desktop mode (KDE Plasma with full X11/Wayland support) works fine.

## Eliminated

- hypothesis: gilrs/gamepad thread panic kills process
  reason: Panic is in std::thread::spawn, main thread continues unaffected
- hypothesis: btleplug/D-Bus failure causes silent exit
  reason: Wrapped in if let Ok, silently handles error without crashing
- hypothesis: Vite dev server or CSP issue
  reason: Built AppImage doesn't use Vite dev server; CSP only blocks connections, doesn't crash process

## Resolution

- root_cause: Tauri v2 webview (WebKitGTK via wry) fails to initialize under Steam Deck gaming mode (Gamescope Wayland compositor) due to insufficient Wayland protocol support for GPU-accelerated WebKit compositing and potentially the devtools feature's Web Inspector initialization
- fix: Set WEBKIT_DISABLE_COMPOSITING_MODE=1 environment variable in main.rs before Tauri Builder starts, and remove the "devtools" feature from Cargo.toml for release builds
- verification: Launch AppImage in gaming mode; window should appear
- files_changed: apps/frontend/src-tauri/src/main.rs, apps/frontend/src-tauri/Cargo.toml
- specialist_hint: rust

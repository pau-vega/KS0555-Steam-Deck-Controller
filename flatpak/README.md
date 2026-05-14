# Flatpak — Robot Controller

## Prerequisites

- flatpak >= 1.14
- flatpak-builder
- Flathub remote configured:

```bash
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
```

- `org.gnome.Platform//48` runtime and `org.gnome.Sdk//48` SDK
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

> Note: `build.sh` is the **local** build script. CI uses `flatpak-builder` directly
> via the GitHub Action (see `.github/workflows/build.yml`). The justfile `flatpak-build`
> recipe (in root `justfile`) also invokes `flatpak-builder` directly, not `build.sh`.

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

## Host Requirements for Local Builds

The Flatpak bundle **must be produced on a native x86_64 host** (Steam Deck = x86_64).
The local Docker build path (`just docker-build-all`) refuses to run on aarch64 hosts
(Apple Silicon Macs, ARM Linux boxes) because `flatpak-builder` invokes `bubblewrap`,
which requires user namespaces (`CLONE_NEWUSER`). Neither Rosetta nor QEMU translates
the relevant syscalls when emulating amd64 on aarch64:

| Emulator | Failure                                                           |
| -------- | ----------------------------------------------------------------- |
| Rosetta  | `prctl(PR_SET_SECCOMP) reported EINVAL` (seccomp filter setup)    |
| QEMU     | `unshare failed: Invalid argument` (CLONE_NEWUSER user namespace) |

Both errors surface as:

```
bwrap: Creating new namespace failed: Invalid argument
```

This is a fundamental limitation of amd64 emulation on aarch64 hosts, not a Docker
configuration issue. `--privileged`, `--security-opt seccomp=unconfined`,
`--security-opt apparmor=unconfined`, and switching between Rosetta/QEMU all fail to
recover. The host kernel must natively execute the amd64 ABI.

### Supported build paths

| Host                          | Path                                            | Status     |
| ----------------------------- | ----------------------------------------------- | ---------- |
| Linux x86_64 (or CI)          | `just docker-build-all` or `just flatpak-build` | Works      |
| GitHub Actions (ubuntu-24.04) | `.github/workflows/build.yml` (push a tag / PR) | Works (CI) |
| Steam Deck (SteamOS, x86_64)  | SSH in, run `just flatpak-build` from the repo  | Works      |
| Apple Silicon Mac (arm64)     | Any local Docker path                           | Refused    |

If you only need to iterate on the manifest YAML, metainfo XML, or icons, run
`./flatpak/build.sh <deb>` on macOS — it performs structural validation only
(YAML/XML parse + icon presence) without invoking flatpak-builder.

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
- **Runtime:** `org.gnome.Platform//48`
- **SDK:** `org.gnome.Sdk//48`
- **Extension:** `org.freedesktop.Platform.GL.default`

### Finish-args (Sandbox Permissions)

Every `finish-arg` (a single permission) in the `finish-args` list grants the Flatpak sandbox access to a specific host resource. The `finish-args` are grouped by subsystem below, matching the order in the manifest.

#### Display & Graphics

| finish-arg                                | Purpose                                                   |
| ----------------------------------------- | --------------------------------------------------------- |
| `--socket=wayland`                        | Native Wayland rendering (Gamescope on Steam Deck)        |
| `--socket=fallback-x11`                   | X11 fallback for non-Wayland desktops                     |
| `--share=ipc`                             | Shared memory for X11/Wayland IPC performance             |
| `--device=dri`                            | Direct Rendering Infrastructure — GPU access              |
| `--env=WEBKIT_DISABLE_COMPOSITING_MODE=1` | Disable WebKit compositing bypass on Steam Deck Gamescope |

#### BLE — Bluetooth Low Energy

| finish-arg                                                           | Purpose                                                                  |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `--system-talk-name=org.bluez`                                       | D-Bus system bus access to BlueZ (btleplug uses D-Bus, not AF_BLUETOOTH) |
| `--system-talk-name=org.bluez.*`                                     | Wildcard for BlueZ sub-interfaces (adapter, device, GATT)                |
| (removed — `--allow=bluetooth` not needed; btleplug uses D-Bus only) |                                                                          |
| `--share=network`                                                    | Network access (BlueZ D-Bus sometimes requires it)                       |

> **Why `--system-talk-name`, not `--socket=system-bus`?** Principle of least privilege — `--socket=system-bus` grants access to _all_ system D-Bus services. `--system-talk-name=org.bluez` grants access to BlueZ only.

> **Why no `--allow=bluetooth`?** `btleplug` communicates with BlueZ exclusively over D-Bus system bus (not AF_BLUETOOTH sockets). The `--system-talk-name=org.bluez` grants are sufficient.

#### Gamepad

| finish-arg       | Purpose                                                                   |
| ---------------- | ------------------------------------------------------------------------- |
| `--device=input` | Read access to `/dev/input/event*` — gilrs reads gamepad events via evdev |

> **Requirement:** Flatpak ≥ 1.15.6 (`--device=input` requires Flatpak 1.15.6+). SteamOS 3.6+ ships Flatpak 1.15.8+. If `--device=input` is unavailable (older Flatpak), use `--device=all` as a fallback.

### Anti-Feature Checklist

These `finish-args` are deliberately excluded from the manifest. The manifest includes a comment block listing permissions that are deliberately **NOT** requested:

| Rejected Arg            | Why It Was Rejected                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------------------- |
| `--filesystem=home`     | Unnecessary sandbox escape — the app doesn't need filesystem access                                       |
| `--device=bluetooth`    | Wrong stack — AF_BLUETOOTH is not D-Bus; btleplug talks BlueZ over D-Bus                                  |
| `--talk-name=org.bluez` | Wrong bus — this is session bus, not system bus; need `--system-talk-name`                                |
| `--socket=session-bus`  | Tray icon arg, not needed for this app                                                                    |
| `--socket=system-bus`   | Over-broad — grants all system D-Bus; `--system-talk-name=org.bluez` follows principle of least privilege |
| org.freedesktop.Flatpak | Portal grant, not needed (no portal interaction)                                                          |

### D-Bus Gate (`in_flatpak()`)

The `finish-args` control what the sandbox can access, but some runtime behavior must be gated in code too. When running inside the Flatpak sandbox, the application detects it via a belt-and-suspenders check:

1. `FLATPAK_ID` environment variable is set
2. `/.flatpak-info` file exists

If either is true → `in_flatpak()` returns `true` → the D-Bus system bus socket rewrite is **skipped**. Flatpak's D-Bus proxy handles `org.bluez` communication transparently. Rewriting `DBUS_SYSTEM_BUS_ADDRESS` inside the sandbox would break the proxy and cause BLE to fail silently.

The detection logic lives in `apps/frontend/src-tauri/src/lib.rs`:

```rust
fn in_flatpak() -> bool {
    std::env::var("FLATPAK_ID").is_ok() || std::path::Path::new("/.flatpak-info").exists()
}
```

### Deb-Extract Pattern

The manifest uses a `type: file` source to ingest the `.deb` produced by `cargo tauri build --bundles deb`, extracts it with `ar -x` + `tar -xf`, and installs files to Flatpak-standard paths under `/app/`.

See [ARCHITECTURE.md](../apps/frontend/src-tauri/ARCHITECTURE.md) for full system architecture documentation.

## Validation

Before tagging a release, validate the Flatpak bundle on a real Steam Deck using
the on-device validation checklist.

### Quick Start

1. Build the `.flatpak` bundle (local build):

   ```bash
   ./flatpak/build.sh apps/frontend/src-tauri/target/release/bundle/deb/robot-controller_*.deb
   ```

   For CI builds, see `.github/workflows/build.yml` — the CI runs flatpak-builder
   directly using `flatpak/flatpak-github-actions/flatpak-builder@v6`.

2. Transfer to your Steam Deck (via USB, scp, or KDE Connect).

3. On the Steam Deck:

   ```bash
   flatpak install --user RobotController-x86_64.flatpak
   flatpak run com.ks0555.robotcontroller
   ```

4. Run through the checklist:
   - Copy `flatpak/VALIDATION-CHECKLIST.md` and fill it out
   - Save results as `flatpak/validation-reports/YYYY-MM-DD-REPORT.md`
   - Capture logs: `flatpak run --env=RUST_LOG=debug com.ks0555.robotcontroller 2> flatpak/validation-logs/YYYY-MM-DD-app.log`

5. Verify env: `flatpak run --command=env com.ks0555.robotcontroller | grep WEBKIT`

### Checklist Coverage

The checklist validates:

- **DECK-01:** Sideload install with auto-fetched runtime
- **DECK-02:** Desktop Mode — BLE connect to BT24, gamepad input (F/B/L/R/S)
- **DECK-03:** "Add as Non-Steam Game" — .desktop found, shortcut launches
- **DECK-04:** Gaming Mode — window renders (no black screen), gamepad + BLE work
- **DECK-05:** upgrade-robot-controller.sh polling launcher for version-check + reinstall
- **VAL-09:** End-to-end logged session with log artifacts captured

### Validation Artifacts

| File                                            | Purpose                                                        |
| ----------------------------------------------- | -------------------------------------------------------------- |
| `flatpak/VALIDATION-CHECKLIST.md`               | Reusable pass/fail checklist (run on every release)            |
| `flatpak/validation-reports/REPORT-TEMPLATE.md` | Template for dated validation reports                          |
| `flatpak/validation-reports/`                   | Directory for filled reports (git-ignored except template)     |
| `flatpak/validation-logs/`                      | Directory for captured log files (git-ignored except .gitkeep) |

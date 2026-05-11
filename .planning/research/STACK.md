# Stack Research — v2.1 Flatpak Packaging

**Domain:** Flatpak packaging of an existing Tauri v2 desktop app for sideload distribution to Steam Deck (SteamOS 3.x)
**Researched:** 2026-05-09
**Confidence:** HIGH (cross-verified against Tauri v2 docs, Flatpak docs, Flathub repos, GitHub releases)

## Executive Summary

Tauri's CLI does **not** ship a `flatpak` value for `tauri build --bundles` (only `deb`, `rpm`, `appimage`). The official Tauri v2 Flatpak guide therefore wraps an externally produced `.deb` (or, alternatively, builds from source) inside a `flatpak-builder` manifest. We will keep using `cargo tauri build` to produce the artifact and then run `flatpak-builder` against a hand-written manifest in CI.

For SteamOS 3.x sideload (no Flathub submission), we choose the **`org.freedesktop.Platform`/`Sdk` 24.08** runtime + SDK over GNOME because the Tauri app does not depend on GNOME APIs and the freedesktop runtime is smaller, faster to download on a Deck, and avoids unrelated GNOME desktop bits. The runtime ships WebKitGTK-6 (`libwebkit2gtk-4.1` ABI) which is what Tauri v2 currently requires on Linux. We add the `rust-stable` (1.89.0) and `node20` SDK extensions only at build time to compile from source inside the sandbox; alternatively we can bundle the prebuilt `.deb` produced by `tauri build --bundles deb` and skip both extensions. We default to the **prebuilt-deb extraction** path because it reuses our existing `cargo tauri build` toolchain (already wired with `dtolnay/rust-toolchain@stable` + pnpm in `.github/workflows/build.yml`) and produces a smaller manifest with no offline-cargo generators.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `flatpak` (host CLI) | 1.14.x or newer | Install/sideload the produced `.flatpak` on dev machine + Steam Deck | Steam Deck's SteamOS 3.x already ships flatpak ≥1.14 (Flathub remote enabled by default); only required for local sideload testing |
| `flatpak-builder` | **1.4.8** (latest, Apr 2024) | Build the `.flatpak` bundle from a YAML/JSON manifest | Single official tool that compiles, sandboxes, and exports to OSTree/single-file bundle; nothing newer in the 1.4.x series |
| `org.freedesktop.Platform` | **24.08** (branch) | Runtime the app runs against on Steam Deck | Smaller than GNOME runtime; supplies WebKitGTK-6 + GTK4 needed by Tauri v2 on Linux. SteamOS 3.x's Flathub remote pulls 24.08 by default; new majors land each August with a 2-year support window — 24.08 is current stable as of 2026-05 |
| `org.freedesktop.Sdk` | **24.08** | Build-time SDK matching the Platform | Required because flatpak-builder needs the SDK reference in the manifest header even when we only `dpkg-deb -x` a prebuilt `.deb` |
| `flatpak-builder` GitHub Action (`flatpak/flatpak-github-actions/flatpak-builder@v6.7`) | **v6.7** (Apr 2025) | Run flatpak-builder inside CI with the right OCI image | Maintained upstream. Uses `ghcr.io/flathub-infra/flatpak-github-actions:freedesktop-24.08` container so all flatpak deps are preinstalled; cuts ~5 min off raw `apt install` setup |

### Supporting Libraries / SDK Extensions

Only needed if we choose **build-from-source** (option A). For **deb-extraction** (option B, recommended) we skip both.

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `org.freedesktop.Sdk.Extension.rust-stable` | branch **24.08** (Rust 1.89.0) | Provide `rustc`/`cargo` inside the Flatpak build sandbox | Only if we build the Rust binary from source inside flatpak-builder; current binary compiles fine on `dtolnay/rust-toolchain@stable` (≥1.85) so 1.89 is compatible |
| `org.freedesktop.Sdk.Extension.node20` | branch **24.08** (Node 20.x) | Provide `node`/`npm` for Vite frontend build | Only for option A. Pin to `node20` (matches our `.nvmrc` ≥18) — `node22` extension also exists if we move .nvmrc later |
| `flatpak-cargo-generator` (from `flatpak-builder-tools`) | git `main` | Pre-fetch all `Cargo.lock` deps as offline sources | Option A only; flatpak-builder runs sandboxed with no network during build, so cargo deps must be vendored as `sources:` entries |
| `flatpak-node-generator` (from `flatpak-builder-tools`) | git `main` | Pre-fetch pnpm/npm deps as offline sources | Option A only. **Caveat:** the generator targets npm/yarn lockfiles; pnpm-lock.yaml needs `--type pnpm` (recent) or a temporary npm install. Avoidable by using option B. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `appstream-util` (or `appstreamcli`) | Validate the `<app-id>.metainfo.xml` (AppStream metadata) before publishing | Optional for sideload-only, but flatpak-builder warns if missing. Available in Ubuntu 24.04 runner via `apt install appstream`. |
| `desktop-file-validate` | Validate the `<app-id>.desktop` file | Required so Steam's "Add as non-Steam game" picks up the icon and `Exec=` line cleanly |
| `flatpak build-bundle` | Convert OSTree repo produced by flatpak-builder into a single `.flatpak` file for sideload | Already part of `flatpak` (host) — emitted automatically by the `flatpak-github-actions` action when `bundle: <name>.flatpak` input is set |
| `xmlstarlet` / `yq` | Optional: patch metainfo or merge manifest fragments in CI | Not strictly needed for v2.1 |

## Installation (CI Runner — `ubuntu-24.04`)

We do **not** install flatpak-builder via `apt` directly on the runner; instead we use the Flathub-maintained container image which already has every dependency pinned. Add a new GH Actions job (sketch only — full workflow in execution phase):

```yaml
build-flatpak:
  runs-on: ubuntu-24.04
  container:
    image: ghcr.io/flathub-infra/flatpak-github-actions:freedesktop-24.08
    options: --privileged
  steps:
    - uses: actions/checkout@v4
    - uses: flatpak/flatpak-github-actions/flatpak-builder@v6.7
      with:
        bundle: robot-controller.flatpak
        manifest-path: packaging/flatpak/com.ks0555.robotcontroller.yml
        cache-key: flatpak-builder-${{ github.sha }}
```

If we keep the runner outside the container (e.g. to share node/pnpm cache with current build):

```bash
sudo apt-get update
sudo apt-get install -y flatpak flatpak-builder
sudo flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
sudo flatpak install -y --noninteractive flathub \
  org.freedesktop.Platform//24.08 \
  org.freedesktop.Sdk//24.08
# Option A only:
# sudo flatpak install -y --noninteractive flathub \
#   org.freedesktop.Sdk.Extension.rust-stable//24.08 \
#   org.freedesktop.Sdk.Extension.node20//24.08
```

The container approach is preferred: the prebuilt image keeps build-time consistent with what Flathub itself uses, and it's what the maintained `flatpak-builder` action expects.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `org.freedesktop.Platform//24.08` | `org.gnome.Platform//46` (or 47/48) | Only if the app starts depending on `libadwaita` or other GNOME-only libs. Tauri v2's official Flatpak guide uses GNOME 46 because it's the most familiar runtime, but we don't need it — freedesktop is smaller (~300 MB vs ~700 MB extra on disk). |
| Option B: bundle prebuilt `.deb` produced by `cargo tauri build --bundles deb` and unpack it inside the manifest | Option A: build from source inside the flatpak sandbox | Choose option A if reproducibility on Flathub is the goal (it isn't here — sideload only) or if we want to drop the Rust toolchain on the host runner. Option A requires the cargo+node generators and ~3× longer CI builds. |
| `flatpak/flatpak-github-actions/flatpak-builder@v6.7` action | Hand-rolled `flatpak-builder --user --install-deps-from=flathub …` script | Only if we move off GitHub Actions. The action handles repo setup, OSTree caching, and `build-bundle` already. |
| `ghcr.io/flathub-infra/flatpak-github-actions:freedesktop-24.08` container image | Plain `ubuntu-24.04` runner with apt-installed flatpak | Use plain runner if we need to share heavy node-modules cache between AppImage + Flatpak jobs. We're removing AppImage anyway, so the container is fine. |
| `flatpak build-bundle` to single `.flatpak` file, attach to GitHub Release | Self-hosted OSTree repo (`flat-manager` or `flatter`) for `flatpak update` auto-updates | Sideload-only is in scope for v2.1 (PROJECT.md "Out of Scope: Self-hosted Flatpak repo"). A single-file artifact installed via `flatpak install --user robot-controller.flatpak` is enough; auto-update is documented manually as `flatpak install --reinstall robot-controller.flatpak`. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `tauri build --bundles flatpak` | Not a valid value — Tauri v2 CLI accepts only `deb`, `rpm`, `appimage` (verified against `v2.tauri.app/reference/cli/`). The 2022 feature request (`tauri-apps/tauri#3619`) is still open and Tauri maintainers have de-prioritized it ("mostly gave up on linux" per FabianLars in discussion #4426). | External `flatpak-builder` against our own manifest |
| `org.freedesktop.Platform//23.08` | Older branch, EOL Aug 2025 — already past EOL by 2026-05 | `24.08` |
| `org.freedesktop.Platform//25.08` | Brand-new branch (Aug 2025); WebKitGTK on this branch may not match what Tauri v2 expects yet | Stay on `24.08` until Tauri v2 explicitly tests against 25.08 |
| `flathub-infra/flatpak-github-actions` repo (forked) | Archived as read-only on Apr 24, 2025 | Upstream `flatpak/flatpak-github-actions@v6.7` (active) |
| Flathub submission tooling (`flathub/flathub` repo PR, `appstream-compose` strict mode, screenshots, OARS rating) | PROJECT.md scopes this milestone to **sideload only**. Flathub adds review delay, mandatory metainfo, mandatory screenshots, and reproducible build rules — all overhead for a single-device deploy | Skip; we only need a valid `.desktop` + minimal `metainfo.xml` for the Steam Deck "Add as Non-Steam Game" flow |
| `flatpak-snap` / mixed packaging | Out of scope | Stick to flatpak only |
| Manual `apt install flatpak-builder` on Ubuntu 24.04 + then `flatpak install` runtimes inside the runner | Adds ~3 min per CI run because Ubuntu's flatpak has to download both runtime + SDK fresh every time (no OCI image cache) | Use the `ghcr.io/flathub-infra/flatpak-github-actions:freedesktop-24.08` container image — runtimes are pre-baked |
| `feat/truly-portable-appimage` custom tauri-cli (currently used in `.github/workflows/build.yml`) | Only needed for AppImage's sharun format. The `deb` target uses upstream tauri-cli with no patches | Stock `cargo install tauri-cli --version "^2"` (or `pnpm dlx @tauri-apps/cli`) for the deb-producing step that feeds into the flatpak job |

## Stack Patterns by Variant

**If we want fastest CI iteration (recommended for v2.1):**
- Build `.deb` first with the existing `cargo tauri build --bundles deb` step
- In the flatpak manifest, declare a single `simple` build module that `dpkg-deb -x` the `.deb` and `mv` files into `/app/bin`, `/app/share/applications`, `/app/share/icons`
- No SDK extensions, no offline generators
- Reuses every existing tool already in `.github/workflows/build.yml` (pnpm, dtolnay/rust-toolchain, libwebkit2gtk-4.1-dev)

**If we later submit to Flathub:**
- Switch to **build-from-source** with `rust-stable` + `node20` SDK extensions
- Add `flatpak-cargo-generator` + `flatpak-node-generator` (or `flatpak-pnpm-generator`) outputs as committed `cargo-sources.json` / `node-sources.json`
- Add full AppStream `metainfo.xml` with screenshots, summary, OARS rating
- Out of scope for v2.1

**If Steam Deck stays on SteamOS 3.x indefinitely:**
- Pin `org.freedesktop.Platform//24.08` until ~2027-08 (EOL)
- After that, bump to `26.08` after a CI test pass

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Tauri 2.11.0 (current `Cargo.toml`) | `org.freedesktop.Platform//24.08` | Both target WebKitGTK-6 / `libwebkit2gtk-4.1` ABI — the runtime ships WebKitGTK ≥2.46 which Tauri v2 requires |
| `btleplug 0.12.0` | flatpak sandbox + `--system-talk-name=org.bluez` | btleplug uses BlueZ DBus on Linux; Flatpak sandbox needs explicit allow on the system bus name `org.bluez`. Verified pattern used by other Flathub apps (e.g. `com.skype.Client` issue #115) |
| `gilrs 0.11.1` | `--device=all` + `--filesystem=/dev/input:ro` | gilrs reads `/dev/input/eventN` directly via evdev. Steam Deck's built-in controller appears as evdev device when Steam Input is in "Gamepad" mode. `--device=dri` only grants GPU; gamepad needs `--device=all` (or specifically `--filesystem=/dev/input:ro` + udev) |
| `rust-stable//24.08` (Rust 1.89.0) | Our `Cargo.toml` (edition 2021, no MSRV pin) | Compatible — current host CI uses `dtolnay/rust-toolchain@stable` which is also ≥1.85 |
| `node20//24.08` | Our `.nvmrc` (≥18) + pnpm 10.29.3 | Node 20 LTS is fine; pnpm@10 supports Node ≥18.12 |
| `flatpak-builder 1.4.8` | flatpak ≥1.10 | All current distros ship compatible flatpak |

## Integration with Existing CI

Today, `.github/workflows/build.yml` has three jobs: `build-x64` (AppImage), `build-arm64` (AppImage), `build-macos` (DMG). Per PROJECT.md the AppImage path is being removed in v2.1, but for v2.1 itself we recommend:

1. **Repurpose** `build-x64`: change its bundle target from `appimage` to `deb` (`cargo tauri build --bundles deb`). The `.deb` becomes the input to the Flatpak job, not a release artifact. Drop the `feat/truly-portable-appimage` custom tauri-cli install — only needed for AppImage sharun format.
2. **Add** a new `build-flatpak` job depending on `build-x64`, using the Flathub container image and `flatpak/flatpak-github-actions/flatpak-builder@v6.7`. Output is `RobotController-x86_64.flatpak`, attached to the GitHub Release via the existing `softprops/action-gh-release@v2` step.
3. **Drop** the `build-arm64` job: Steam Deck (LCD + OLED) is x86_64 only. ARM64 was a hold-over for generic Linux laptops — out of scope per PROJECT.md (Steam Deck only).
4. **Leave** `build-macos` alone (keeps developer machines testable; no extra runtime cost).

## Sources

- Tauri v2 Flatpak distribution doc — https://github.com/tauri-apps/tauri-docs/blob/v2/src/content/docs/distribute/flatpak.mdx — verified runtime/SDK example, confirms external flatpak-builder workflow (HIGH)
- Tauri v2 CLI reference — https://v2.tauri.app/reference/cli/ — verified `--bundles` accepts only `deb|rpm|appimage` on Linux (HIGH)
- Tauri discussion #4426 "Approach to creating Flatpak bundles" — https://github.com/tauri-apps/tauri/discussions/4426 — confirms maintainers' "use external flatpak-builder + reference your .deb" stance (HIGH)
- Tauri issue #3619 "[feat] Bundle Tauri apps as Flatpak" — https://github.com/tauri-apps/tauri/issues/3619 — open, no built-in flatpak target landed (HIGH)
- Vincent Jousse, "Packaging a Tauri v2 app on Linux for flatpak/flathub" — https://vincent.jousse.org/blog/en/packaging-tauri-v2-flatpak-snapcraft-elm/ — verified rust-stable + node20 SDK extension pattern, finish-args list (MEDIUM, single-author blog but matches official docs)
- Flatpak Available Runtimes — https://docs.flatpak.org/en/latest/available-runtimes.html — confirms freedesktop runtime release cadence (Aug yearly, 2-yr support) (HIGH)
- Freedesktop SDK 24.08.0 release announcement — https://discourse.flathub.org/t/freedesktop-sdk-24-08-0-released/7630 — confirms 24.08 as current stable (HIGH)
- Flathub `org.freedesktop.Platform` page — https://flathub.org/en/apps/org.freedesktop.Platform — confirms `freedesktop-sdk-25.08.x` exists but 24.08 still recommended for app authors (HIGH)
- `flathub/org.freedesktop.Sdk.Extension.rust-stable` branch/24.08 manifest — https://github.com/flathub/org.freedesktop.Sdk.Extension.rust-stable/blob/branch/24.08/org.freedesktop.Sdk.Extension.rust-stable.json — confirms Rust 1.89.0 (HIGH)
- `flatpak/flatpak-builder` releases — https://github.com/flatpak/flatpak-builder/releases — confirms 1.4.8 (Apr 2024) is latest stable (HIGH)
- `flatpak/flatpak-github-actions` releases — confirmed v6.7 (Apr 2025) latest, upstream is active; `flathub-infra/flatpak-github-actions` archived Apr 2025 (HIGH)
- Flatpak Sandbox Permissions — https://docs.flatpak.org/en/latest/sandbox-permissions.html — verified `--system-talk-name=org.bluez` syntax (HIGH)
- `flatpak/flatpak` issue #1719 "Add bluetooth permission" — https://github.com/flatpak/flatpak/issues/1719 — corroborates `--system-talk-name=org.bluez` as the standard BLE-via-BlueZ pattern (MEDIUM)

---
*Stack research for: Flatpak packaging of existing Tauri v2 app on Steam Deck (sideload only)*
*Researched: 2026-05-09*

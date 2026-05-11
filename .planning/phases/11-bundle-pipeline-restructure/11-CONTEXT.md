# Phase 11: Bundle Pipeline Restructure - Context

**Gathered:** 2026-05-09
**Status:** Ready for execution

<domain>
## Phase Boundary

Switch Tauri from AppImage to `.deb` output (the input artifact for flatpak-builder), drop the custom `feat/truly-portable-appimage` tauri-cli fork, remove dead CI jobs (arm64, macOS), strip build.yml to a single deb-producing job, and lock in the Flatpak runtime for all downstream phases. Pure packaging/infrastructure — no application code changes.

</domain>

<decisions>
## Implementation Decisions

### Custom Fork Removal & CI Restructure
- **D-01:** Remove `build-steamdeck.sh` entirely — CI handles all builds, local script is redundant.
- **D-02:** Drop `build-arm64` job from `.github/workflows/build.yml` now (was Phase 15 CI-03). Steam Deck is x86_64 only.
- **D-03:** Drop `build-macos` job from `.github/workflows/build.yml` — macOS is out of scope for v2.1 Flatpak milestone.
- **D-04:** `build-x64` job: replace `cargo install tauri-cli --git ... --branch feat/truly-portable-appimage` with stock `cargo install tauri-cli`. Change build command from `cargo tauri build --config '{"bundle":{"linux":{"appimage":{"useNewFormat":true}}}}'` to `cargo tauri build --bundles deb`.
- **D-05:** No parallel-run transition window. AppImage is dropped in Phase 11, not Phase 15. CI-02 (parallel-run release) and CI-05 (AppImage removal in Phase 16) are obsoleted.
- **D-06:** `.deb` is an intermediate artifact only. Remove `upload-artifact`, `softprops/action-gh-release`, and artifact renaming steps from `build-x64`.

### Flatpak Runtime
- **D-07:** Runtime: `org.freedesktop.Platform//24.08` with SDK `org.freedesktop.Sdk//24.08`. Chosen over `org.gnome.Platform//46` — smaller (~300 MB), no GNOME deps needed for Tauri WebKitGTK window.
- **D-08:** Extension: `org.freedesktop.Platform.GL.default` for GPU-accelerated WebKit rendering on Steam Deck.
- **D-09:** CI container image for flatpak-builder action: let Phase 15 decide.

### Deb Layout & tauri.conf.json
- **D-10:** Deb layout discovery (`dpkg -c`) is deferred to Phase 12. PKG-03 in Phase 11 is verification-only.
- **D-11:** `tauri.conf.json` bundle section: add deb-specific metadata (`"depends": []`).

### Downstream Impact
- CI-02 and CI-05 obsoleted by D-05.
- CI-03 fulfilled early in Phase 11.

### the agent's Discretion
- Exact `tauri.conf.json` deb config fields — agent picks sensible defaults.
- build.yml workflow `name:` field — rename from "Build Tauri AppImage".
- Stock tauri-cli install method: `cargo install tauri-cli` vs `pnpm dlx @tauri-apps/cli`.

</decisions>

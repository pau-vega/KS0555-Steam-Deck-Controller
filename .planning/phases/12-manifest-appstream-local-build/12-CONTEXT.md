# Phase 12: Manifest + AppStream + Local Build - Context

**Gathered:** 2026-05-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Create a `flatpak/` directory at repo root containing a Flatpak manifest (`com.ks0555.robotcontroller.yaml`), AppStream metainfo (`com.ks0555.robotcontroller.metainfo.xml`), pre-generated hicolor icons (32, 128, 256@2), a `build.sh` script, and a `README.md`. The manifest uses a deb-extract pattern (single module, inline build-commands) to repackage the `.deb` from Tauri into a Flatpak. End state: `flatpak run com.ks0555.robotcontroller` should open the app window on a Linux dev box. Pure packaging/infrastructure — no application code changes.

</domain>

<decisions>
## Implementation Decisions

### Manifest Structure
- **D-01:** Include display finish-args now: `--socket=wayland`, `--socket=fallback-x11`, `--share=ipc`, `--device=dri`. BLE and gamepad finish-args (`--system-talk-name=org.bluez`, `--device=input`, etc.) belong in Phase 13.
- **D-02:** Manifest uses a local `type: file` source for the deb. `build.sh` copies the real deb into `flatpak/` as `robot-controller.deb` before invoking flatpak-builder. Manifest references it as a relative path to stay version-agnostic.
- **D-03:** Deb internal layout hardcoded to Tauri v2 defaults: `usr/bin/robot-controller` (binary), `usr/share/applications/robot-controller.desktop` (desktop file), `usr/share/icons/hicolor/256x256/apps/robot-controller.png` (icon). Phase 15 CI runs `dpkg -c` to confirm the actual layout matches.
- **D-04:** Single module with all build-commands inline: deb extraction (`ar -x` + `tar -xf`), binary install, desktop rename + `sed Icon=`, and hicolor icon installation. No modules split.
- **D-05:** Add `--env=WEBKIT_DISABLE_COMPOSITING_MODE=1` finish-arg now — belt-and-suspenders alongside the existing `lib.rs` `set_var`. Prevents black screen inside the Flatpak sandbox. Phase 13 sees it already in place.
- **D-06:** No cleanup section in manifest. Deb-extract doesn't leave SDK headers/man pages — all content is app code.
- **D-07:** Deb data tarball extraction uses glob `tar -xf data.tar.*` to handle any compression format (zst on Ubuntu 24.04, xz on older, gz as fallback).
- **D-08:** No pre-build manifest validation in `build.sh`. flatpak-builder itself validates the manifest at build time.

### Icon Pipeline
- **D-09:** Pre-generate scaled hicolor PNGs from Tauri's `apps/frontend/src-tauri/icons/icon.png` (256x256): 32x32, 128x128, and 256x256@2 (512px upscaled). Commit them to `flatpak/icons/`. One-time manual step — documented in `flatpak/README.md` with the `convert -resize` command for future icon updates.
- **D-10:** Manifest lists each icon PNG as a separate `type: file` source alongside the deb. Build-commands install them to `/app/share/icons/hicolor/{size}/apps/com.ks0555.robotcontroller.png`.

### AppStream Metainfo
- **D-11:** Standard quality — required fields (id, name, summary, description, license, releases stub) plus developer_name, categories (Utility), url (homepage = GitHub repo), and launchable (desktop-id). Validates against `appstream-util validate`.
- **D-12:** License declared as `MIT` (SPDX). No LICENSE file in repo yet — manifest declaration covers the AppStream requirement.
- **D-13:** Releases section lists current version `0.1.5` with today's date and a short description.
- **D-14:** No screenshots, no OARS content rating, no branding colors — these add maintenance burden without benefit for sideload-only distribution.

### build.sh Interface
- **D-15:** `build.sh <path-to-deb>` — explicit parameter. No auto-location. Works identically for local dev and CI.
- **D-16:** Structural validation approach for macOS (can't run flatpak-builder): verify YAML syntax, metainfo XML against AppStream schema, and confirm all referenced file sources exist. Runtime `flatpak run` verification is deferred to Phase 14 (Steam Deck on-device validation with real Linux target).

### the agent's Discretion
- Exact manifest YAML field ordering and indentation.
- AppStream description paragraph text content (what the app does, target audience).
- Exact shell syntax in build-commands (install -Dm755, sed patterns, mkdir sequences).
- `flatpak/README.md` content and structure.
- Flatpak manifest `tags` and `branch` field values.
- Icon generation commands — `convert -resize` for 32/128, `convert -resize` for 256@2 upscale, or equivalent tool.
- Whether to use `install -D` or `cp --parents` in build-commands.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Phase Goal
- `.planning/REQUIREMENTS.md` — PKG-05 through PKG-09 (manifest, metainfo, build-commands, icons, README) and VAL-05 (local flatpak run opens window)
- `.planning/ROADMAP.md` § Phase 12 — Goal, 5 success criteria, dependencies (Phase 11), canonical refs
- `.planning/PROJECT.md` § Key Decisions — Flatpak runtime `org.freedesktop.Platform//24.08` with SDK `org.freedesktop.Sdk//24.08` and extension `org.freedesktop.Platform.GL.default` (locked in Phase 11 PKG-04)

### Prior Phase Context (locked decisions)
- `.planning/phases/11-bundle-pipeline-restructure/11-CONTEXT.md` — Runtime locked (D-07, D-08), deb is intermediate artifact only (D-05, D-06), dpkg -c discovery deferred here (D-10). Agent discretion: tauri.conf.json deb fields.
- `.planning/phases/10-build-and-test-on-steamos/10-CONTEXT.md` — AppImage icon at 256x256, app.tsx lock, CI build pipeline (now deb instead of AppImage).

### Build Configuration (Phase 11 output — carries forward)
- `apps/frontend/src-tauri/tauri.conf.json` — Identifier `com.ks0555.robotcontroller`, version `0.1.5`, bundle targets `["deb"]`, icon path `icons/icon.png`, deb metadata with empty depends.
- `apps/frontend/src-tauri/Cargo.toml` — Binary name `robot-controller`, version `0.1.5`.

### Existing Assets
- `apps/frontend/src-tauri/icons/icon.png` — Source icon, 256x256 RGBA PNG. Use as base for generating hicolor sizes.

### Code That Must Not Change
- `apps/frontend/src/app.tsx` — VAL-08 app.tsx lock holds across v2.1
- `apps/frontend/src/components/control-pad.tsx` — Locked
- `apps/frontend/src/components/status-bar.tsx` — Locked

### External Specifications
- [Flatpak Manifest Reference](https://docs.flatpak.org/en/latest/flatpak-builder-command-reference.html) — Manifest schema, module types, build-commands syntax
- [AppStream Metadata Reference](https://www.freedesktop.org/software/appstream/docs/chap-Metadata.html) — Required and optional metainfo fields
- [Flatpak Sandbox Permissions](https://docs.flatpak.org/en/latest/sandbox-permissions-reference.html) — finish-args reference (display args used now, BLE/gamepad args for Phase 13)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/frontend/src-tauri/icons/icon.png` — 256x256 PNG, usable as source for hicolor icon generation.
- `apps/frontend/src-tauri/tauri.conf.json` — App identifier `com.ks0555.robotcontroller` matches Flatpak ID convention. Version `0.1.5`.

### Established Patterns
- Monorepo: `apps/frontend/` is the project root for Tauri. The `flatpak/` directory goes at repo root (peer to `apps/` and `.planning/`).
- Tauri v2 deb bundles produce `usr/bin/<binary-name>`, `usr/share/applications/<binary-name>.desktop`, and `usr/share/icons/hicolor/<size>/apps/<binary-name>.png`.
- Flatpak manifests use `id:`, `runtime:`, `sdk:`, `command:`, `modules:` as top-level keys. Build-commands are shell scripts inside `build-commands:` arrays.

### Integration Points
- `build.sh` bridges between the Tauri deb output (`apps/frontend/src-tauri/target/release/bundle/deb/`) and the flatpak-builder input (copy deb into `flatpak/` directory).
- Manifest `build-commands` transform Tauri's deb layout (binary named `robot-controller`, desktop named `robot-controller.desktop`, icon named `robot-controller.png`) into Flatpak's expected layout (icon named `com.ks0555.robotcontroller.png`, desktop named `com.ks0555.robotcontroller.desktop`).
- The Flatpak ID (`com.ks0555.robotcontroller`) must be consistent across: manifest `id`, metainfo `id`, desktop filename, icon filenames, and Tauri `identifier` in `tauri.conf.json`.

</code_context>

<specifics>
## Specific Ideas

- Manifest `build-commands` flow: `ar -x robot-controller.deb` → `tar -xf data.tar.*` → `install -Dm755 usr/bin/robot-controller /app/bin/robot-controller` → `install -Dm644 usr/share/applications/robot-controller.desktop /app/share/applications/com.ks0555.robotcontroller.desktop` → `sed -i 's/^Icon=.*/Icon=com.ks0555.robotcontroller/' /app/share/applications/com.ks0555.robotcontroller.desktop` → install icon files from sources to hicolor paths.
- AppStream description: "Control a real robot from your Steam Deck gamepad input with low latency. Connects to a BT24 Bluetooth module and translates gamepad directions (F/B/L/R/S) into robot movement commands."
- `flatpak/README.md` sections: prerequisites (flatpak, flatpak-builder, org.freedesktop.Platform//24.08 runtime), build steps, icon regeneration command, install/run commands, and link to root README for full usage docs.
- `flatpak/generate-icons.sh` not needed — manual one-time generation documented in README.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 12 scope.

</deferred>

---

*Phase: 12-Manifest + AppStream + Local Build*
*Context gathered: 2026-05-09*

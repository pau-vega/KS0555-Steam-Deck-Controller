# Phase 12: Manifest + AppStream + Local Build — Research

**Researched:** 2026-05-09
**Status:** Complete

## Domain: Flatpak Deb-Extract Packaging

### Manifest Schema (Validated)

Flatpak manifests use YAML with top-level keys: `id`, `runtime`, `sdk`, `command`, `finish-args`, `modules`. The `buildsystem: simple` with inline `build-commands` is the correct approach for repackaging a deb.

**Source types available:**
- `type: file` — local or remote file, with optional `path` or `url`, `sha256`, `dest-filename`
- `type: archive` — tar/zip archives with automatic extraction
- `type: dir` — local directory copy

**For deb-extract pattern:** Use `type: file` source for the `.deb`, then `ar -x` + `tar -xf data.tar.*` in build-commands. This is the standard Flatpak pattern for repackaging prebuilt binaries (confirmed via Flatpak docs `apply_extra` example and community manifests).

**finish-args for Phase 12 (display only):**
- `--socket=wayland` — Wayland display server access
- `--socket=fallback-x11` — X11 fallback
- `--share=ipc` — IPC namespace sharing
- `--device=dri` — GPU direct rendering
- `--env=WEBKIT_DISABLE_COMPOSITING_MODE=1` — Gamescope/WebKit black-screen prevention

BLE and gamepad args are Phase 13 scope — confirmed.

### Runtime Decision (Locked — PKG-04)

- Runtime: `org.freedesktop.Platform//24.08`
- SDK: `org.freedesktop.Sdk//24.08`
- Extension: `org.freedesktop.Platform.GL.default`
- EOL: August 2027

The `//24.08` syntax means "use the latest patch of the 24.08 branch" — this is standard Flatpak practice.

### AppStream Metainfo Requirements (Validated)

**Required fields for `type="desktop-application"`:**
- `id` — same as Flatpak ID (`com.ks0555.robotcontroller`)
- `name` — human-readable app name
- `summary` — one-line description (≤75 chars recommended)
- `description` — multi-paragraph with optional markup
- `metadata_license` — license of the metainfo itself (use `FSFAP` or `CC0-1.0`)
- `project_license` — SPDX identifier for the app (`MIT`)
- `url` with `type="homepage"` — project URL

**Optional but included (per D-11):**
- `developer_name` — visible in software centers
- `categories` — at least one from the spec (`Utility`)
- `launchable` with `type="desktop-id"` — links to `.desktop` file
- `releases` — version history

**Excluded (per D-14):**
- `screenshots` — maintenance burden for sideload-only
- `content_rating` — no OARS rating needed for sideload
- `branding` colors

**Validation:** `appstream-util validate` (from `appstream-util` package or Flatpak SDK)

### Icon Generation (One-Time Manual Step)

Source: `apps/frontend/src-tauri/icons/icon.png` (256×256 RGBA PNG)

Target sizes (hicolor directory structure):
- `flatpak/icons/32x32/com.ks0555.robotcontroller.png` — 32×32
- `flatpak/icons/128x128/com.ks0555.robotcontroller.png` — 128×128
- `flatpak/icons/256x256@2/com.ks0555.robotcontroller.png` — 512×512

Command: `convert apps/frontend/src-tauri/icons/icon.png -resize {N}x{N} flatpak/icons/{size}/com.ks0555.robotcontroller.png`

ImageMagick `convert` is available on macOS and Linux. Alternative: `sips` on macOS (but `convert` is more portable for docs).

### Build Script Interface

`build.sh <path-to-deb>` — explicit parameter per D-15.

On macOS (D-16): structural validation only — check YAML syntax (`python3 -c "import yaml; yaml.safe_load(open(...))"`), check XML well-formedness (`xmllint --noout`), check icon files exist, check all manifest source `path` references resolve.

On Linux: full `flatpak-builder --user --install --force-clean build-dir flatpak/com.ks0555.robotcontroller.yaml` followed by `flatpak build-bundle repo RobotController-x86_64.flatpak com.ks0555.robotcontroller`.

### No Code Changes Required

This phase creates entirely new files in `flatpak/`. No existing source files are modified. `app.tsx`, `control-pad.tsx`, `status-bar.tsx` remain untouched (VAL-08 guard).

## Validation Architecture

### Dimension 8: Packaging Correctness

| Test | Command | Expected |
|------|---------|----------|
| Manifest YAML syntax | `python3 -c "import yaml; yaml.safe_load(open('flatpak/com.ks0555.robotcontroller.yaml'))"` | No parse errors |
| Metainfo XML validates | `appstream-util validate flatpak/com.ks0555.robotcontroller.metainfo.xml` | Validation passes |
| Icons exist at correct sizes | `identify flatpak/icons/32x32/com.ks0555.robotcontroller.png` | 32×32 |
| Icons exist at correct sizes | `identify flatpak/icons/128x128/com.ks0555.robotcontroller.png` | 128×128 |
| Icons exist at correct sizes | `identify flatpak/icons/256x256@2/com.ks0555.robotcontroller.png` | 512×512 |
| build.sh is executable | `test -x flatpak/build.sh` | Exit 0 |
| Source references resolve | `grep 'path:' flatpak/com.ks0555.robotcontroller.yaml` — all paths exist | All found |

### Linux-Only Validation (VAL-05)

`flatpak-builder --user --install --force-clean build-dir flatpak/com.ks0555.robotcontroller.yaml` succeeds without sandbox-escape warnings. This is deferred to execution on a Linux dev box (Phase 12 execution context notes this as "verify on Linux if available; otherwise structural validation is sufficient for plan completion").

## Standard Stack

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Manifest format | YAML (flatpak-builder native) | Required by flatpak-builder |
| Metainfo format | XML (AppStream spec) | Required by AppStream standard |
| Build system | `simple` (inline build-commands) | No compilation needed — just file extraction and installation |
| Source type | `file` (local deb) | deb is built locally by Tauri, not downloaded |
| Icon tool | ImageMagick `convert` | Available on macOS and Linux |
| Shell | `/bin/bash` (build.sh) | Standard shell, available everywhere |

## Common Pitfalls (Avoided)

1. **Using `type: archive` for deb:** Flatpak-builder doesn't natively extract `.deb` archives. Must use `type: file` + `ar -x` + `tar -xf` in build-commands. ✓ Using this pattern per D-04.

2. **Missing `metadata_license`:** AppStream spec requires a license for the metainfo itself (separate from project license). ✓ Including `FSFAP` per D-11.

3. **Icon path mismatch:** The icon filename in the desktop file must match the installed icon name. ✓ `sed` command in build-commands updates `Icon=robot-controller` → `Icon=com.ks0555.robotcontroller` per D-04.

4. **Hardcoding data.tar.xz:** Ubuntu 24.04 uses zst compression. Must use glob `data.tar.*`. ✓ Using `tar -xf data.tar.*` per D-07.

5. **Forgetting GL extension:** WebKitGTK requires GPU rendering. ✓ Included `org.freedesktop.Platform.GL.default` per PKG-04.

---

## RESEARCH COMPLETE

Phase 12 research complete. All technical decisions validated against Flatpak and AppStream documentation. Ready for planning.

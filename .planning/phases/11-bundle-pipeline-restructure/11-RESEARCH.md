# Phase 11: Bundle Pipeline Restructure — Research

**Researched:** 2026-05-09
**Confidence:** HIGH (config/infrastructure phase, all decisions are well-understood)

## Domain Summary

Phase 11 is a pure packaging/infrastructure phase. It switches Tauri's bundle output from AppImage to `.deb` (the input artifact for flatpak-builder), drops the custom `feat/truly-portable-appimage` tauri-cli fork, strips CI to a single deb-producing job, and locks in the Flatpak runtime. No application code changes.

## Key Technical Findings

### 1. Tauri v2 Bundle Targets

Tauri v2 CLI `--bundles` accepts exactly `deb`, `rpm`, `appimage` on Linux. There is **no** `flatpak` target (issue #3619 still open). The official Flatpak workflow is: produce a `.deb` with `cargo tauri build --bundles deb`, then extract it inside a flatpak-builder manifest. Source: Tauri v2 CLI reference, discussion #4426, PITFALLS.md #1.

### 2. Stock tauri-cli vs Custom Fork

The `feat/truly-portable-appimage` fork is **only** needed for AppImage's sharun format. The `deb` target works with stock `cargo install tauri-cli` (or `pnpm dlx @tauri-apps/cli`). Source: STACK.md § "What NOT to Use", PITFALLS.md #1.

### 3. Deb Metadata in tauri.conf.json

Tauri v2 auto-generates the `.desktop` file from the `productName` and `identifier` fields. For the `deb` target, the `bundle.linux` block can include:
```json
"bundle": {
  "targets": ["deb"],
  "linux": {
    "deb": {
      "depends": []
    }
  }
}
```

`"depends": []` is correct because Tauri statically bundles libwebkit2gtk-4.1. No manual `.desktop` template needed. Source: Tauri v2 docs, CONTEXT.md D-11.

### 4. Launch Script for Simpler CI Build Command

The current CI uses `cargo tauri build --config '{"bundle":{"linux":{"appimage":{"useNewFormat":true}}}}'` with `working-directory: apps/frontend/src-tauri`. For the deb target, `cargo tauri build --bundles deb` is sufficient. The `--config` JSON override is unnecessary — deb has no equivalent `useNewFormat` flag. The custom fork's AppImage-specific config is dropped along with the fork.

### 5. Flatpak Runtime Decision

**Chosen:** `org.freedesktop.Platform//24.08` with SDK `org.freedesktop.Sdk//24.08`. Rationale:
- Smaller (~300 MB vs ~700 MB for GNOME) — important for Steam Deck storage
- Ships WebKitGTK-6 (`libwebkit2gtk-4.1`) — what Tauri v2 requires
- No GNOME deps needed for a Tauri WebKitGTK window
- 2-year support window (through Aug 2027)
- Extension: `org.freedesktop.Platform.GL.default` for GPU-accelerated WebKit rendering

Source: STACK.md § Recommended Stack, CONTEXT.md D-07, D-08.

### 6. Deb Layout Discovery (dpkg -c)

`dpkg -c` on a Tauri-produced `.deb` reveals:
- Binary: `/usr/bin/robot-controller`
- Desktop file: `/usr/share/applications/robot-controller.desktop`
- Icons: `/usr/share/icons/hicolor/{size}x{size}/apps/robot-controller.png`

These paths inform Phase 12 manifest `build-commands` (rename desktop to `com.ks0555.robotcontroller.desktop`, fix `Icon=`). Per D-10, `dpkg -c` recording is deferred to Phase 12; Phase 11 only verifies `cargo tauri build --bundles deb` succeeds. Source: Tauri v2 bundle docs.

### 7. CI Simplification

Current `.github/workflows/build.yml` has 3 jobs (build-x64, build-arm64, build-macos). Phase 11 reduces to single `build-x64`:
- Trigger preserved: tag push `v*` + `workflow_dispatch` (per Phase 10 D-02)
- System deps, pnpm, Rust toolchain setup preserved
- Replace `cargo install tauri-cli --git ... --branch feat/truly-portable-appimage` → `cargo install tauri-cli`
- Replace `cargo tauri build --config ...` → `cargo tauri build --bundles deb`
- Remove `upload-artifact`, `softprops/action-gh-release`, artifact renaming (per D-06: deb is intermediate only)
- Remove `build-arm64` and `build-macos` jobs entirely (per D-02, D-03)

### 8. File to Delete

`build-steamdeck.sh` — local build script that installs the custom tauri-cli fork and builds AppImage. Redundant since CI handles builds (D-01). Source: CONTEXT.md D-01.

## Validation Architecture

Phase 11 success is verified by:
1. **Build verification:** `cargo tauri build --bundles deb` succeeds in CI (PKG-01, PKG-02, PKG-03)
2. **Output verification:** Deb file exists at `apps/frontend/src-tauri/target/release/bundle/deb/robot-controller_*_amd64.deb`
3. **Config audit:** `grep` confirms `"targets": ["deb"]` in tauri.conf.json, no `"appimage"` or custom fork refs remain
4. **File deletion:** `test ! -f build-steamdeck.sh`
5. **CI structure:** `build.yml` has exactly 1 job (`build-x64`), no arm64/macos jobs
6. **App code invariant:** `git diff --exit-code -- apps/frontend/src/app.tsx apps/frontend/src/components/control-pad.tsx apps/frontend/src/components/status-bar.tsx`

No Nyquist instrumented tests needed — the phase is config changes only. All verification is structural (file existence, content grep, build success).

## Research Sources

- `.planning/research/STACK.md` — Full stack research for v2.1 Flatpak packaging
- `.planning/research/PITFALLS.md` — Pitfalls #1, #2, #4, #7, #11, #13
- Tauri v2 CLI reference — `--bundles` accepts `deb|rpm|appimage`
- Tauri v2 Flatpak distribute doc (draft) — deb-extract pattern confirmed

---

*Research for Phase 11: Bundle Pipeline Restructure*
*Researched: 2026-05-09*

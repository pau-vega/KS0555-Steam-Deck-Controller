---
phase: 11-bundle-pipeline-restructure
reviewed: 2026-05-09T12:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - apps/frontend/src-tauri/tauri.conf.json
  - .github/workflows/build.yml
  - .planning/PROJECT.md
  - .planning/ROADMAP.md
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-05-09T12:00:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Reviewed 4 files modified during Phase 11 (Bundle Pipeline Restructure). The implementation correctly switches `tauri.conf.json` bundle targets from AppImage to deb, strips `build.yml` to a single deb-producing job with stock tauri-cli, records the Flatpak runtime decision in PROJECT.md, and cleans up stale references in ROADMAP.md.

**Key concerns:**
1. CI build pipeline uses `cargo install tauri-cli` with no version pinning — non-reproducible, vulnerable to upstream CLI breakage
2. PROJECT.md contains a factually incorrect statement claiming Tauri v2 has a "Flatpak bundle target" (it does not — deb is the intermediate format per PITFALLS.md #1)
3. ROADMAP.md Phase 15 criterion still references a macOS job that Phase 11 already removed

No CRITICAL issues found (no security vulnerabilities, data loss vectors, or crashes introduced by Phase 11 changes).

---

## Warnings

### WR-01: `cargo install tauri-cli` without version pin

**File:** `.github/workflows/build.yml:32`
**Issue:** The CI job runs `cargo install tauri-cli` with no version constraint. Every build downloads and compiles the latest version from crates.io. A new release of `tauri-cli` could introduce a breaking CLI change (flag rename, config validation change, dropped feature) that breaks the deb build immediately. Builds are non-reproducible — you cannot recreate an exact release build from a known tag.

The `dtolnay/rust-toolchain@stable` action supports `targets` and `components` but the Rust *toolchain* version is a different concern from the *tauri-cli* crate version. The workflow pins the Rust toolchain implicitly via `@stable` (which is fine) but does not pin the application-level build tool.

**Fix:** Pin tauri-cli to v2.x to match the Tauri v2 project:
```yaml
      - name: install stock tauri-cli
        run: cargo install tauri-cli --version "^2"
```
Alternative: pin to the exact known-good version from the `Cargo.toml` workspace.

---

### WR-02: PROJECT.md — "Tauri v2 Flatpak bundle target" is factually incorrect

**File:** `.planning/PROJECT.md:16`
**Issue:** The milestone target features section states: "Tauri v2 Flatpak bundle target (replaces AppImage in CI)". This is **incorrect** — Tauri v2 does NOT have a `flatpak` bundle target. Per Phase 11's own research (PITFALLS.md #1) and the phase plan itself: "Tauri v2 has no `flatpak` bundle target — deb is the correct intermediate format." The `.deb` output feeds `flatpak-builder` (Phase 12+), which produces the actual Flatpak. This misstatement will mislead developers who read PROJECT.md as the project's architectural source of truth, potentially causing wasted time searching for non-existent `--bundles flatpak` flags or invalid tauri.conf.json configuration.

**Fix:** Replace line 16 with an accurate description:
```markdown
- Tauri v2 produces a `.deb` bundle (replaces AppImage in CI); deb is the intermediate artifact consumed by flatpak-builder (Phase 12) to produce the final Flatpak bundle
```

---

## Info

### IN-01: ROADMAP.md Phase 15 criterion references macOS job that Phase 11 removed

**File:** `.planning/ROADMAP.md:186`
**Issue:** Phase 15 success criterion 3 reads: "macOS DMG job is untouched". This was written as a constraint to prevent Phase 15 from modifying the macOS job. However, Phase 11 already removed the macOS job from `build.yml`. When Phase 15 is planned/executed, someone reading this criterion will find it confusing — the job doesn't exist anymore. The constraint is moot and should reflect reality.

**Fix:** Update Phase 15 criterion 3 to:
```
3. The `build-arm64` job is removed from `.github/workflows/build.yml` (Steam Deck is x86_64 only); the `build-macos` job was already removed in Phase 11 — Phase 15 does not re-add it
```

---

### IN-02: PROJECT.md Constraints — Stale "AppImage target" reference

**File:** `.planning/PROJECT.md:93`
**Issue:** The Constraints section still states: "Steam Deck (SteamOS Linux) — Tauri AppImage target, no Windows/macOS builds". After Phase 11's `tauri.conf.json` change, the bundle target is `["deb"]`, not AppImage. This stale reference contradicts the rest of the Phase 11 changes.

**Fix:** Change to:
```
- **Platform**: Steam Deck (SteamOS Linux) — Tauri deb target, no Windows/macOS builds
```

---

### IN-03: build.yml — No post-build verification of deb artifact

**File:** `.github/workflows/build.yml:40-42`
**Issue:** After `cargo tauri build --bundles deb`, there is no step confirming the `.deb` was actually produced at the expected path. While `cargo tauri build` exits non-zero on failure (so a completely failed build would be caught), there are edge cases where the command succeeds but produces no artifact (e.g., a tauri-cli version change that moves the output directory). Adding a verification step would make the pipeline more robust.

**Fix:** Add a verification step after the build:
```yaml
      - name: verify deb artifact
        run: |
          ls -la target/release/bundle/deb/
          test -n "$(ls target/release/bundle/deb/*.deb 2>/dev/null)" || { echo "No .deb produced!"; exit 1; }
        working-directory: apps/frontend/src-tauri
```

---

## Items Reviewed With No Issues

- **`apps/frontend/src-tauri/tauri.conf.json`** — Bundle target correctly switched to `["deb"]`, deb metadata block present, macOS block removed, AppImage references absent, file is valid JSON. CSP unchanged (pre-existing, out of Phase 11 scope).
- **`.planning/PROJECT.md`** — Flatpak runtime decision correctly recorded (`org.freedesktop.Platform//24.08` with SDK and GL extension) in Key Decisions table. Active requirements section updated to reflect deb→flatpak-builder pipeline.
- **`.planning/ROADMAP.md`** — Phase 11 success criteria updated with locked runtime string. No `org.gnome.Platform//46` or `feat/truly-portable-appimage` references remain. Phase 12 criterion correctly references PKG-04.

---

_Reviewed: 2026-05-09T12:00:00Z_
_Reviewer: gsd-code-reviewer (standard depth)_
_Depth: standard_

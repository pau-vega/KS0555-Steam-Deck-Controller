# Phase 11: Bundle Pipeline Restructure - Context

**Gathered:** 2026-05-09
**Status:** Ready for planning

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
- **D-05:** No parallel-run transition window. AppImage is dropped in Phase 11, not Phase 15. CI-02 (parallel-run release) and CI-05 (AppImage removal in Phase 16) are obsoleted — downstream phases should note this.
- **D-06:** `.deb` is an intermediate artifact only. Remove `upload-artifact`, `softprops/action-gh-release`, and artifact renaming steps from `build-x64`. The Flatpak job in Phase 15 will rebuild the deb as part of its own pipeline.

### Flatpak Runtime
- **D-07:** Runtime: `org.freedesktop.Platform//24.08` with SDK `org.freedesktop.Sdk//24.08`. Chosen over `org.gnome.Platform//46` — smaller (~300 MB), no GNOME deps needed for Tauri WebKitGTK window.
- **D-08:** Extension: `org.freedesktop.Platform.GL.default` for GPU-accelerated WebKit rendering on Steam Deck (important for Gaming Mode / Gamescope).
- **D-09:** CI container image for flatpak-builder action: let Phase 15 decide. It is tied to the runtime choice but the specific `ghcr.io/flathub-infra/...` tag is chosen when the CI job is authored.

### Deb Layout & tauri.conf.json
- **D-10:** Deb layout discovery (`dpkg -c`) is deferred to Phase 12. PKG-03 in Phase 11 is verification-only — confirm `cargo tauri build --bundles deb` succeeds. Phase 12 will extract binary path, .desktop name, and icon paths from the deb it builds.
- **D-11:** `tauri.conf.json` bundle section: add deb-specific metadata (`"depends": []` since Tauri bundles libwebkit2gtk). Tauri auto-generates the .desktop file from app metadata — no manual template needed.

### Downstream Impact
- Requirements CI-02 (parallel-run release) and CI-05 (separate AppImage removal PR) are obsoleted by D-05.
- Requirement CI-03 (drop build-arm64) is fulfilled early in Phase 11.
- build.yml after Phase 11: single job `build-x64` that verifies deb builds on ubuntu-24.04.

### the agent's Discretion
- Exact `tauri.conf.json` deb config fields (`section`, `priority`, `desktopTemplate`) — agent picks sensible defaults.
- build.yml workflow `name:` field — rename from "Build Tauri AppImage" to something deb-appropriate.
- Stock tauri-cli install method in CI: `cargo install tauri-cli` vs `pnpm dlx @tauri-apps/cli` — agent chooses based on build speed.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Phase Goal
- `.planning/REQUIREMENTS.md` — PKG-01 through PKG-04 (Packaging requirements). Note: CI-02 and CI-05 obsoleted by D-05.
- `.planning/ROADMAP.md` § Phase 11 — Goal, success criteria, dependencies (Phase 10)
- `.planning/PROJECT.md` § Key Decisions — "Switch from AppImage to Flatpak" (pending, to be updated with runtime choice)

### Build Configuration (must modify)
- `apps/frontend/src-tauri/tauri.conf.json` — Switch `bundle.targets` from `["appimage"]` to `["deb"]`, add deb metadata
- `.github/workflows/build.yml` — Rewrite to single deb-producing job with stock CLI; drop arm64 and macOS jobs

### Files to Delete
- `build-steamdeck.sh` — Remove entirely (redundant, CI handles builds)

### Prior Phase Decisions (locked contracts)
- `.planning/phases/10-build-and-test-on-steamos/10-CONTEXT.md` — D-02: build trigger on tag push + workflow_dispatch (preserved). D-03: no macOS cross-compile for Linux (moot since macOS job removed).

### Research
- `.planning/research/PITFALLS.md` — Pitfall #2 (BLE needs --system-talk-name=org.bluez), #4 (--device=input needs Flatpak ≥ 1.15.6), #7 (sideload no auto-update), #11 (AppImage removal timing), #13 (lib.rs D-Bus rewrite incompatible with Flatpak)
- `.planning/research/STACK.md` — Stock tauri-cli recommendation, deb-extract Flatpak architecture

### Code That Must Not Change
- `apps/frontend/src/app.tsx` — VAL-08 lock holds across v2.1
- `apps/frontend/src/components/control-pad.tsx`
- `apps/frontend/src/components/status-bar.tsx`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `.github/workflows/build.yml` — Existing 3-job workflow to be simplified to single `build-x64`. Keep trigger pattern (tag push + workflow_dispatch).
- `apps/frontend/src-tauri/tauri.conf.json` — Bundle section at line 26-38: swap `"targets": ["appimage"]` → `"targets": ["deb"]`, add `"deb": { "depends": [] }`, remove `"linux": { "appimage": {...} }`.
- CI job infrastructure (system deps install, pnpm setup, Rust toolchain) — reused unchanged.

### Established Patterns
- CI workflow structure: jobs use `ubuntu-24.04`, `pnpm/action-setup@v5`, `dtolnay/rust-toolchain@stable`, `pnpm install --frozen-lockfile` then `pnpm build`.
- Build trigger: on tag push `v*` + `workflow_dispatch`.

### Integration Points
- `tauri.conf.json` deb target → Phase 12 manifest reads binary path / .desktop / icon paths from the produced deb.
- PROJECT.md Key Decisions table — needs entry for Flatpak runtime choice (D-07, D-08).

</code_context>

<specifics>
## Specific Ideas

- Deb metadata in tauri.conf.json: add `"depends": []` to declare no external system deps (Tauri statically bundles libwebkit2gtk-4.1 and friends).
- Remove `"linux": { "appimage": {...} }` block since appimage target is dropped.
- build.yml after cleanup: one job `build-x64` — system deps → stock tauri-cli → `pnpm build` → `cargo tauri build --bundles deb` in `apps/frontend/src-tauri`. No upload/release steps.
- `build-arm64` and `build-macos` jobs removed entirely from build.yml.
- Stock tauri-cli via `cargo install tauri-cli` (compiles from source, ~2-3 min on CI) or `pnpm dlx @tauri-apps/cli` (pre-built binary, ~30s) — agent chooses.

</specifics>

<deferred>
## Deferred Ideas

- Parallel-run transition release (AppImage + Flatpak together for one release) — bypassed. AppImage dropped in Phase 11, no transition window. CI-02 and CI-05 obsoleted.
- CI container image for flatpak-builder — let Phase 15 decide the exact `ghcr.io/flathub-infra/...` tag.
- Deb artifact upload — not needed, deb is intermediate only.

</deferred>

---

*Phase: 11-Bundle Pipeline Restructure*
*Context gathered: 2026-05-09*

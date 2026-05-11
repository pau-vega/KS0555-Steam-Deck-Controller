# Phase 16: AppImage Decommission + Upgrade Workflow Docs - Context

**Gathered:** 2026-05-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove the AppImage CI path (parallel-run window closed) and simplify CI to a single Flatpak build job. Document everything a Steam Deck user needs to install, upgrade, and run the Flatpak: root README rewrite, upgrade launcher script, architecture docs for developers, and justfile recipes. No application code changes — pure CI cleanup + documentation.
</domain>

<decisions>
## Implementation Decisions

### CI Consolidation (CI-05)
- **D-01:** Remove `build-x64` job. Rename `build-flatpak-x64` → `build`. The single job gains all `build-x64` steps: checkout, Rust toolchain, pnpm setup, system deps, `pnpm install`, `pnpm build`, `cargo tauri build --bundles deb`. Then flatpak-builder + release upload.
- **D-02:** VAL-08 `git diff --exit-code` check dropped from CI. Pre-commit hooks already enforce the app.tsx lock. Phase 15 already verified it passed.
- **D-03:** Runner stays `ubuntu-24.04` for the Tauri build steps. Flatpak-builder step runs in its `flathub-infra` container (Phase 15 D-17).
- **D-04:** Version read from `apps/frontend/src-tauri/Cargo.toml` (single source of truth), not `github.ref_name`.
- **D-05:** Remove `cancel-in-progress: true` from concurrency group. Flatpak builds take longer — wasteful to cancel mid-build on rapid tag pushes.
- **D-06:** Do NOT upload `.deb` as workflow artifact. Built and consumed inline by flatpak-builder.
- **D-07:** Preserve `workflow_dispatch` with `skip_release` boolean input (Phase 15 D-13).
- **D-08:** Remove `install-on-steamdeck.sh` (legacy AppImage install script). Also remove any references to it in `docs/RUNNING.md`.
- **D-09:** Full cleanup: remove all "AppImage" references in comments, docs, and stale cache keys. Any configuration paths that referenced AppImage should be cleaned.
- **D-10:** Add `pnpm-store` cache (`actions/cache@v4` on `~/.pnpm-store`, keyed on `pnpm-lock.yaml` hash) alongside existing `cargo-registry` and `cargo-target` caches.
- **D-11:** Top-level permissions stay `contents: read`. Job-level override to `contents: write` for release upload step only.
- **D-12:** Workflow name unchanged: "Build and Release".
- **D-13:** Keep existing verification: check `.deb` exists, verify flatpak sources (manifest, metainfo, icons) exist before flatpak-builder step.
- **D-14:** OSTree cache key unchanged (`flatpak-${{ runner.os }}-${{ hashFiles('flatpak/com.ks0555.robotcontroller.yaml') }}-freedesktop-2408`).
- **D-15:** No comment about `build.sh` boundary in CI YAML.

### Polling Launcher (DECK-05)
- **D-16:** Bash script at repo root: `upgrade-robot-controller.sh` — self-contained, zero dependencies beyond `curl` + `jq` (both on SteamOS by default).
- **D-17:** Dual-purpose: if `com.ks0555.robotcontroller` is not installed, do fresh `flatpak install --user`. If installed, check GitHub Releases for newer version.
- **D-18:** Full upgrade assistant UX: (1) check installed version via `flatpak info`, (2) fetch latest release from GitHub Releases API, (3) compare versions, (4) if newer: download `.flatpak`, (5) display full release body as changelog, (6) prompt y/N to confirm, (7) `flatpak install --user --reinstall <path>`, (8) clean up old downloaded `.flatpak` files from the download location.
- **D-19:** GitHub Releases API endpoint: `https://api.github.com/repos/pau-vega/KS0555-Steam-Deck-Controller-2/releases/latest`. Asset pattern: `RobotController-*-x86_64.flatpak`.

### Architecture Docs (DOCS-02, DOCS-03)
- **D-20:** Create `apps/frontend/src-tauri/ARCHITECTURE.md` — full system coverage: deb-extract build chain (ar → tar → /app), Flatpak sandbox model with finish-args rationale (BLE `--system-talk-name=org.bluez`, gamepad `--device=input`, display `--socket=wayland/fallback-x11`), `in_flatpak()` D-Bus gate (belt-and-suspenders FLATPAK_ID + `/.flatpak-info`), Tauri → Rust → btleplug/gilrs pipeline, IPC event flow (invoke + listen), Vite + React frontend integration, monorepo structure with Tauri nested in `apps/frontend/src-tauri/`.
- **D-21:** Review and update `flatpak/README.md`: ensure it covers all finish-args rationale (display from Phase 12 + BLE/gamepad from Phase 13), reproduces the anti-feature checklist, and explains the `in_flatpak()` D-Bus gate. Verify prerequisites and build steps are still accurate.

### Root README (DOCS-01)
- **D-22:** Full rewrite of install section. Replace all AppImage content with Flatpak-based instructions: (1) download `.flatpak` from GitHub Releases, (2) `flatpak install --user RobotController-x86_64.flatpak`, (3) "Add as Non-Steam Game" workflow (Steam Desktop Mode picker finds `com.ks0555.robotcontroller.desktop`), (4) Gaming Mode launch with Gamescope notes. Text walkthrough (screenshots optional per ROADMAP). Update all stale v2.0 references to reflect current Flatpak reality.

### justfile Recipes (DOCS-04)
- **D-23:** New `[group('flatpak')]` section in `justfile`.
- **D-24:** `flatpak-build <path-to-deb>` — runs `flatpak-builder --user --install --force-clean build-dir flatpak/com.ks0555.robotcontroller.yaml` then `flatpak build-bundle repo RobotController-x86_64.flatpak com.ks0555.robotcontroller`. Does NOT wrap `flatpak/build.sh`.
- **D-25:** `flatpak-install <path-to-flatpak>` — `flatpak install --user --reinstall <path>`.
- **D-26:** `flatpak-run` — `flatpak run com.ks0555.robotcontroller`.
- **D-27:** `flatpak-deploy <hostname> <path-to-flatpak>` — `scp <path> <hostname>:~/` (transfer only, no remote install).

### the agent's Discretion
- Exact structure and formatting of `apps/frontend/src-tauri/ARCHITECTURE.md` (section ordering, heading levels, code examples).
- `upgrade-robot-controller.sh` implementation: error handling patterns, `--help`/`--version` flags, output formatting, temp directory selection, `jq` parsing robustness.
- Root README rewrite phrasing, exact walkthrough wording, and Gaming Mode section structure.
- justfile recipe argument handling (paths, error messages, default values).
- Whether `flatpak/VALIDATION-CHECKLIST.md` needs updating for the new deployment flow.
- `docs/RUNNING.md` updates to remove `install-on-steamdeck.sh` references and reflect Flatpak install.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Phase Goal
- `.planning/REQUIREMENTS.md` — CI-05 (remove AppImage CI job), DECK-05 (upgrade workflow + polling launcher), DOCS-01 (root README rewrite), DOCS-02 (architecture docs), DOCS-03 (flatpak/README.md contributor guide), DOCS-04 (justfile recipes), VAL-08 (app.tsx lock — verified pre-commit, not CI)
- `.planning/ROADMAP.md` § Phase 16 — Goal, 5 success criteria, dependencies (Phase 15)

### Prior Phase Context (locked decisions)
- `.planning/phases/15-ci-migration-parallel-run/15-CONTEXT.md` — D-13 (skip_release workflow_dispatch), D-17 (flatpak-builder action + Flathub container), D-20 (parallel-run window: 2-3 releases), D-22 (.deb is workflow artifact only), D-26 (runtime locked), D-27 (app.tsx lock)
- `.planning/phases/14-steam-deck-on-device-validation/14-CONTEXT.md` — D-01 through D-18 (validation protocol, Gaming Mode workflow, Steam Input template)
- `.planning/phases/13-sandbox-permissions-ble-gamepad/13-CONTEXT.md` — D-01 (in_flatpak belt-and-suspenders), D-02 (D-Bus gate scope), D-05 (anti-feature checklist in manifest)
- `.planning/phases/12-manifest-appstream-local-build/12-CONTEXT.md` — D-02 (deb as type: file source), D-05 (WEBKIT_DISABLE_COMPOSITING_MODE belt-and-suspenders)
- `.planning/phases/11-bundle-pipeline-restructure/11-CONTEXT.md` — D-07, D-08 (Flatpak runtime `org.freedesktop.Platform//24.08` locked)

### Source Files That Change (Write Access)
- `.github/workflows/build.yml` — Remove `build-x64` job, rename `build-flatpak-x64` → `build`, add Tauri build steps, add pnpm caching, remove cancel-in-progress, read version from Cargo.toml. Full cleanup of AppImage references.
- `README.md` — Full rewrite of Steam Deck install section (Flatpak-based). Remove AppImage install instructions, install script references.
- `apps/frontend/src-tauri/ARCHITECTURE.md` — New file. Full system architecture documentation.
- `flatpak/README.md` — Review and update with finish-args rationale, D-Bus gate explanation, anti-feature checklist.
- `justfile` — Add `[group('flatpak')]` section with build, install, run, deploy recipes.
- `upgrade-robot-controller.sh` — New file at repo root. Self-contained Bash upgrade/install polling launcher.
- `install-on-steamdeck.sh` — Delete (legacy AppImage install script).
- `docs/RUNNING.md` — Update to remove AppImage/install-script references.

### Source Files Referenced (Read-Only)
- `flatpak/com.ks0555.robotcontroller.yaml` — Manifest with all finish-args and deb-extract pattern. Referenced for architecture docs.
- `flatpak/com.ks0555.robotcontroller.metainfo.xml` — AppStream metainfo. Referenced for architecture docs.
- `apps/frontend/src-tauri/src/lib.rs` — `in_flatpak()` detection and D-Bus gate. Referenced for architecture docs.
- `apps/frontend/src-tauri/Cargo.toml` — Version source for CI (D-04).
- `flatpak/VALIDATION-CHECKLIST.md` — Reusable validation protocol from Phase 14.

### Code That Must Not Change
- `apps/frontend/src/app.tsx` — VAL-08 lock holds across v2.1
- `apps/frontend/src/components/control-pad.tsx` — Locked
- `apps/frontend/src/components/status-bar.tsx` — Locked
- `apps/frontend/src-tauri/src/ble/mod.rs` — No BLE logic changes
- `apps/frontend/src-tauri/src/gamepad/mod.rs` — No gamepad logic changes
- `apps/frontend/src-tauri/src/lib.rs` — No D-Bus/env changes

### Research & Pitfalls
- `.planning/research/PITFALLS.md` — Pitfall 7 (sideload bundles cannot auto-update, motivating the polling launcher), Pitfall 11 (AppImage removed too early — parallel-run window must close first)
- `.planning/PROJECT.md` § Key Decisions — Flatpak runtime, sideload-only distribution, "Auto-update reframed" as manual upgrade

### External Specifications
- [GitHub Releases API](https://docs.github.com/en/rest/releases/releases) — Polling launcher API endpoint
- [Flatpak Command Reference](https://docs.flatpak.org/en/latest/flatpak-command-reference.html) — `flatpak install --user --reinstall`
- [flatpak/flatpak-github-actions](https://github.com/flatpak/flatpak-github-actions) — CI action reference
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `.github/workflows/build.yml` — Current two-job CI. `build-flatpak-x64` stays as the base, gains Tauri build steps from `build-x64`. Release upload steps preserved as-is.
- `flatpak/build.sh` — Local build script. NOT invoked in CI (Phase 15 D-16) and NOT wrapped by justfile recipes (D-24). Serves as reference for flatpak-builder command structure.
- `flatpak/README.md` — Phase 12 contributor guide. Base to review and update with Phase 13 sandbox rationale.
- `flatpak/VALIDATION-CHECKLIST.md` — Phase 14 validation protocol. May need minor updates for new deployment flow references.

### Established Patterns
- **Belt-and-suspenders:** in_flatpak() uses both FLATPAK_ID + /.flatpak-info (Phase 13 D-01). Architecture docs should explain this pattern.
- **Self-contained scripts:** upgrade-robot-controller.sh follows the same philosophy as build.sh — standalone, no dependencies, clear error handling.
- **justfile groups:** Existing groups are `dev`, `test`, `steamdeck`, `release`, `debug`, `maintenance`. New `flatpak` group follows the same convention with bracketed `[group('flatpak')]` syntax.
- **Cache keys:** cargo-registry on Cargo.lock, cargo-target on Cargo.lock, pnpm-store on pnpm-lock.yaml. Consistent pattern across all cache steps.
- **Artifact passing:** Phase 15 D-14/D-16 uses upload/download-artifact for deb → flatpak chain. Phase 16 removes this entirely (D-01/D-06) — flatpak job is self-contained.

### Integration Points
- `upgrade-robot-controller.sh` → GitHub Releases API → downloads `.flatpak` → `flatpak install --user --reinstall`. No code-level integration; pure shell orchestration.
- Root README → references `upgrade-robot-controller.sh` and `flatpak/README.md`. The README is the user-facing entry point; all other docs link from it.
- `apps/frontend/src-tauri/ARCHITECTURE.md` → links to `flatpak/README.md` and `lib.rs` source. Cross-references existing docs rather than duplicating.
- CI `build` job → produces `.flatpak` + `.sha256` → uploads to GitHub Releases. The version in Cargo.toml is the single source of truth.
</code_context>

<specifics>
## Specific Ideas

- CI: version extraction from Cargo.toml — use `cargo metadata --format-version 1 --no-deps | jq -r '.packages[] | select(.name == "robot-controller") | .version'` or grep `apps/frontend/src-tauri/Cargo.toml` for `version =`.
- upgrade-robot-controller.sh: use `/tmp/robot-controller-upgrade` as temp dir. Download `.flatpak` and `.sha256`, verify checksum before install. `--force` flag to skip confirm prompt. `--check` flag for version check only (no install).
- README rewrite: keep the existing doc structure (Overview → Install → Manual install → Non-Steam Game → Troubleshooting). Replace AppImage steps with Flatpak equivalents. Preserve `docs/RUNNING.md` link for detailed platform instructions.
- ARCHITECTURE.md structure: Overview → Build Chain (Rust + Tauri → deb) → Flatpak Packaging (manifest, deb-extract, runtime) → Sandbox Model (finish-args by category: display/BLE/gamepad) → D-Bus Gate (in_flatpak, why it's needed) → Event Pipeline (gilrs → Tauri event → React) → Monorepo Layout.
- Flatpak justfile group: args for `flatpak-build` should take optional deb path (default: `apps/frontend/src-tauri/target/release/bundle/deb/*.deb`). `flatpak-deploy` takes required hostname argument.
</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 16 scope.
</deferred>

---

*Phase: 16-AppImage Decommission + Upgrade Workflow Docs*
*Context gathered: 2026-05-10*

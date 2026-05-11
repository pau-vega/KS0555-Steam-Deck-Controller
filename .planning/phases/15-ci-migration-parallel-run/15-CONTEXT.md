# Phase 15: CI Migration (Parallel-Run) - Context

**Gathered:** 2026-05-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a `build-flatpak-x64` job to `.github/workflows/build.yml` that consumes the `.deb` from the existing `build-x64` job via artifact passing, runs `flatpak-builder` via the official `flatpak/flatpak-github-actions/flatpak-builder@v6` action (Freedesktop 24.08 container), and uploads a versioned `.flatpak` (+ SHA256 checksum) as the sole GitHub Release asset on tag pushes. Keep the existing `build-x64` job running (produces `.deb` as workflow artifact only) for a 2–3 release transition window. Enable OSTree cache and Rust/pnpm build caching. No application code changes — pure CI infrastructure.

Note on CI-02 wording: the "existing AppImage" in the requirement is now a `.deb` (Phase 11 switched `bundle.targets`). The parallel-run intent is preserved — `.flatpak` ships as the release artifact while the `.deb` build job stays alive as CI validation and flatpak-builder input for the transition window.
</domain>

<decisions>
## Implementation Decisions

### Release Upload Strategy
- **D-01:** Only `.flatpak` is a release asset. `build-flatpak-x64` uploads `RobotController-{version}-x86_64.flatpak` + `.sha256` checksum via `softprops/action-gh-release@v2`. `build-x64` uploads `.deb` as a workflow artifact only (consumed by flatpak job), NOT as a release asset.
- **D-02:** `softprops/action-gh-release@v2` — industry standard, handles glob patterns, append to existing release.
- **D-03:** Upload only on tag push (`v*`), not on `workflow_dispatch`. Tags create the release; the job appends assets.
- **D-04:** Per-job `contents: write` permission. Only the uploading job (`build-flatpak-x64`) gets elevated permissions. Top-level stays `contents: read`.
- **D-05:** Versioned filenames: `RobotController-{version}-x86_64.flatpak` and `RobotController-{version}-x86_64.flatpak.sha256`. Version extracted from `github.ref_name` (strip `v` prefix if present).
- **D-06:** Skip entire release if any job fails — all-or-nothing. A partial release (flatpak missing) is worse than no release.
- **D-07:** Generate and upload SHA256 checksums alongside `.flatpak`. `sha256sum` in a run step before `action-gh-release`.
- **D-08:** GitHub default release body (tag message). No auto-generated changelog.
- **D-09:** Use `GITHUB_TOKEN` (built-in). No PAT needed.
- **D-10:** Published immediately (not draft). Tags are intentional releases; manual draft adds friction.
- **D-11:** Concurrency group on `github.ref` with `cancel-in-progress: true`. Avoids duplicate CI runs on rapid tag pushes.
- **D-12:** GitHub default timeouts (6h). No explicit per-job timeout.
- **D-13:** `workflow_dispatch` inputs: `skip_release` boolean (default `false`). When `true`, builds run but skip `action-gh-release`. For CI smoke-testing without polluting releases.

### Job Dependency Model
- **D-14:** Artifact passing via `actions/upload-artifact@v4` / `actions/download-artifact@v4`. `build-flatpak-x64` declares `needs: build-x64` and downloads the `.deb` from the workflow artifact.
- **D-15:** `build-flatpak-x64` does a full `actions/checkout@v4` to get repo sources (icons + metainfo.xml already in `flatpak/`). Only the `.deb` is downloaded from the upstream artifact.
- **D-16:** CI run steps handle prep manually: download `.deb` artifact → copy to `flatpak/robot-controller.deb` → verify all flatpak sources exist. `flatpak/build.sh` is local-dev only, not invoked in CI.
- **D-17:** `flatpak/flatpak-github-actions/flatpak-builder@v6` action runs flatpak-builder in the `ghcr.io/flathub-infra/flatpak-github-actions:freedesktop-24.08` container. Action handles: flatpak-builder invocation, `flatpak build-bundle`, OSTree cache. CI only does source prep before the action step.
- **D-18:** `build-flatpak-x64` runs on `ubuntu-24.04` — same runner as `build-x64` for consistency. The flatpak-github-actions action's container provides the right tooling regardless of host flatpak version (Pitfall #10).
- **D-19:** No `build-arm64` job exists in current `build.yml` — CI-03 is trivially satisfied. Phase 15 does not add or remove any architecture jobs beyond the new flatpak job.

### Artifact Retention Policy
- **D-20:** `.flatpak` release asset on every tagged release during the parallel-run window. 2–3 tagged releases ship `.flatpak` before Phase 16 removes the `.deb` build job. Pitfall #11 recommends at least one transition release with both paths verified.
- **D-21:** Release notes include a short guidance block identifying `.flatpak` as the recommended sideload format for Steam Deck, with a link to install docs (Phase 16).
- **D-22:** `.deb` is a workflow artifact only — retained for `build-flatpak-x64` consumption and CI archive. Not a user-facing release asset. This resolves a discussion inconsistency (user initially selected "both every release" as release assets, then clarified "artifact only" for `.deb` — the later answer prevails).

### OSTree Cache Config
- **D-23:** `cache: true` on `flatpak-builder` action. Cache key: `flatpak-${{ runner.os }}-${{ hashFiles('flatpak/com.ks0555.robotcontroller.yaml') }}-freedesktop-2408`. Uses manifest hash + runtime version so cache invalidates on manifest changes or runtime upgrades.
- **D-24:** Full build dependency caching via `actions/cache@v4`. Three cache entries: `cargo-registry` (`~/.cargo/registry`), `cargo-target` (`apps/frontend/src-tauri/target/`), `pnpm-store` (`~/.pnpm-store`). Keys on `Cargo.lock` + `pnpm-lock.yaml` hashes.
- **D-25:** OSTree cache uses GitHub Actions cache internally (handled by `flatpak-github-actions`). Runtime ~1 GB Freedesktop 24.08 + SDK. Warm-cache CI runs avoid re-downloading the runtime.

### Locked Constraints (Carried Forward)
- **D-26:** Flatpak runtime `org.freedesktop.Platform//24.08` with SDK `org.freedesktop.Sdk//24.08` and GL extension — locked in Phase 11 (PKG-04). Container image `ghcr.io/flathub-infra/flatpak-github-actions:freedesktop-24.08` matches.
- **D-27:** `apps/frontend/src/app.tsx`, `control-pad.tsx`, `status-bar.tsx` must remain unchanged — VAL-08 lock holds across v2.1. CI `git diff --exit-code` check enforces this.
- **D-28:** Debug build gated behind `in_flatpak()` (Phase 13 D-02) — not affected by CI changes.
- **D-29:** Manifest uses deb-extract pattern with `type: file` sources (Phase 12 D-02, D-04) — CI must place `robot-controller.deb` at the path the manifest references.

### the agent's Discretion
- Exact caching key format and invalidation strategy for `actions/cache@v4`.
- Whether to use `github.ref_name` or extract version from `Cargo.toml`.
- Exact `action-gh-release` configuration (glob pattern for `.flatpak` + `.sha256`, `token: ${{ secrets.GITHUB_TOKEN }}`).
- Whether to add a `needs: build-x64` skip condition (`if: needs.build-x64.result == 'success'`).
- Placement of `git diff --exit-code` check (in `build-x64` or a separate validate job).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Phase Goal
- `.planning/REQUIREMENTS.md` — CI-01 through CI-04 (Flatpak CI job, release asset, drop arm64, OSTree cache)
- `.planning/ROADMAP.md` § Phase 15 — Goal, 5 success criteria, dependencies (Phase 14)

### Prior Phase Context (locked decisions)
- `.planning/phases/12-manifest-appstream-local-build/12-CONTEXT.md` — D-02 (deb as `type: file` source), D-03 (deb internal layout), D-04 (single module, inline build-commands), D-15 (build.sh `<path-to-deb>` interface)
- `.planning/phases/13-sandbox-permissions-ble-gamepad/13-CONTEXT.md` — D-01 (in_flatpak belt-and-suspenders), D-02 (D-Bus gate scope), D-05 (anti-feature checklist in manifest)
- `.planning/phases/11-bundle-pipeline-restructure/11-CONTEXT.md` — D-07, D-08 (Flatpak runtime `org.freedesktop.Platform//24.08` locked)
- `.planning/phases/14-steam-deck-on-device-validation/14-CONTEXT.md` — D-01 through D-18 (validation protocol for on-device testing)

### Source Files That Change (Write Access)
- `.github/workflows/build.yml` — Add `build-flatpak-x64` job, release upload steps, caching, workflow_dispatch inputs. Modify existing `build-x64` to upload `.deb` as workflow artifact.

### Source Files Referenced (Read-Only)
- `flatpak/com.ks0555.robotcontroller.yaml` — Manifest with all finish-args, `type: file` sources referencing `robot-controller.deb` and `flatpak/` paths
- `flatpak/build.sh` — Local build script. Referenced for understanding the build flow; NOT invoked in CI (per D-16)
- `apps/frontend/src-tauri/tauri.conf.json` — Identifier `com.ks0555.robotcontroller`, version `0.1.5`
- `apps/frontend/src-tauri/Cargo.toml` — Binary name `robot-controller`, version `0.1.5`

### Code That Must Not Change
- `apps/frontend/src/app.tsx` — VAL-08 lock holds across v2.1
- `apps/frontend/src/components/control-pad.tsx` — Locked
- `apps/frontend/src/components/status-bar.tsx` — Locked
- `apps/frontend/src-tauri/src/ble/mod.rs` — No BLE logic changes
- `apps/frontend/src-tauri/src/gamepad/mod.rs` — No gamepad logic changes
- `apps/frontend/src-tauri/src/lib.rs` — No D-Bus/env changes

### Research & Pitfalls
- `.planning/research/PITFALLS.md` — Pitfall 10 (outdated flatpak-builder on ubuntu-24.04 → use official action), Pitfall 11 (AppImage removed too early → keep parallel-run)
- `.planning/PROJECT.md` § Key Decisions — Flatpak runtime, sideload-only distribution, target platform

### External Specifications
- [flatpak/flatpak-github-actions](https://github.com/flatpak/flatpak-github-actions) — Official action for building Flatpaks in CI
- [softprops/action-gh-release](https://github.com/softprops/action-gh-release) — Release upload action
- [actions/cache](https://github.com/actions/cache) — GitHub Actions cache for Rust/pnpm deps
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `.github/workflows/build.yml` — Existing `build-x64` job with Tauri deb build, system deps install, pnpm, Rust toolchain. This job is extended (add artifact upload) but not structurally changed.
- `flatpak/com.ks0555.robotcontroller.yaml` — Manifest already references `robot-controller.deb` as `type: file` source (Phase 12). CI just needs to place the deb at that path.
- `flatpak/build.sh` — Local build script providing the build flow reference. CI replicates its prep steps but delegates flatpak-builder to the action.

### Established Patterns
- **Artifact passing:** Standard GitHub Actions pattern — `upload-artifact` in producer, `download-artifact` in consumer with `needs:`.
- **Conditional steps:** `if: startsWith(github.ref, 'refs/tags/')` on release upload steps to gate on tag pushes.
- **Cache invalidation:** Rust: key on `Cargo.lock` hash. pnpm: key on `pnpm-lock.yaml` hash. OSTree: key on manifest hash + runtime version.
- **Per-job permissions:** `permissions:` block at job level overrides top-level `permissions:`. Only `build-flatpak-x64` needs `contents: write`.
- **Concurrency groups:** `concurrency: { group: ${{ github.ref }}, cancel-in-progress: true }` at workflow level.

### Integration Points
- `build-x64` → `build-flatpak-x64`: artifact upload/download bridge. The `.deb` filename doesn't matter to the artifact download — it's downloaded by artifact name, not filename.
- `build-flatpak-x64` → GitHub Release: `action-gh-release` uploads `.flatpak` + `.sha256` to the release created by the tag push.
- No cross-module Rust/TypeScript changes — pure CI YAML.

### Current build.yml Structure (Baseline)
```yaml
name: Build Tauri deb
on:
  push:
    tags: ["v*"]
  workflow_dispatch:
permissions:
  contents: read
jobs:
  build-x64:
    runs-on: ubuntu-24.04
    steps: [checkout, pnpm, node, rust, system deps, cargo install tauri-cli, pnpm install, pnpm build, cargo tauri build --bundles deb, verify deb]
```
This is the file to extend — not replace.
</code_context>

<specifics>
## Specific Ideas

- Release upload conditioning: `if: startsWith(github.ref, 'refs/tags/') && inputs.skip_release != true` on the `action-gh-release` step.
- Artifact naming: `actions/upload-artifact@v4` with `name: robot-controller-deb`, `path: apps/frontend/src-tauri/target/release/bundle/deb/*.deb`. download by name.
- OSTree cache key example: `flatpak-${{ runner.os }}-${{ hashFiles('flatpak/com.ks0555.robotcontroller.yaml') }}-freedesktop-2408`.
- Build cache structure: three separate `actions/cache@v4` steps — `cargo-registry` (path: `~/.cargo/registry`, key: `cargo-registry-${{ hashFiles('**/Cargo.lock') }}`), `cargo-target` (path: `apps/frontend/src-tauri/target/`, key: `cargo-target-${{ hashFiles('**/Cargo.lock') }}`), `pnpm-store` (path: `~/.pnpm-store`, key: `pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}`).
- SHA256 generation: `sha256sum RobotController-*.flatpak > RobotController-{version}-x86_64.flatpak.sha256` as a run step before `action-gh-release`.
- `git diff --exit-code` check already exists in CI (Phase 10) — verify it's still present and not broken by this phase.
</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 15 scope.

</deferred>

---

*Phase: 15-CI Migration (Parallel-Run)*
*Context gathered: 2026-05-09*

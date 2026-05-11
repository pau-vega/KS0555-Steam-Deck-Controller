# Phase 16: AppImage Decommission + Upgrade Workflow Docs — Verification

**Created:** 2026-05-10
**Phase status:** Complete
**Phase goal:** AppImage CI artifact removed; manual upgrade workflow documented; root README walks Steam Deck users through install + Gaming Mode launch

## Success Criteria Verification

### SC-1: AppImage CI job and release assets removed

| Aspect | Detail |
|--------|--------|
| **Source** | ROADMAP.md Phase 16 Success Criterion 1 |
| **What to verify** | AppImage `build-x64` job and AppImage release asset removed from `.github/workflows/build.yml`. Parallel-run window closed |
| **Verification method** | grep for `build-x64` and `appimage` in CI file |
| **Expected result** | No `build-x64` job, no AppImage references |
| **Evidence** | grep output |

| Check | Command | Expected |
|-------|---------|----------|
| No build-x64 job | `grep -c 'build-x64' .github/workflows/build.yml` | 0 |
| No appimage references | `grep -ci 'appimage' .github/workflows/build.yml` | 0 (outside comments) |

#### D-01: Remove build-x64, rename to build

| Aspect | Detail |
|--------|--------|
| **Source** | 16-CONTEXT.md |
| **What to verify** | `build-x64` job removed. `build-flatpak-x64` renamed to `build` |
| **Verification method** | `grep -c '^  build:' .github/workflows/build.yml` (must be >= 1 for the single job). `grep -c 'build-x64' .github/workflows/build.yml` (must be 0) |
| **Expected result** | Single `build` job exists. No `build-x64` or `build-flatpak-x64` |
| **Evidence** | grep output |

#### D-02: VAL-08 dropped from CI

| Aspect | Detail |
|--------|--------|
| **Source** | 16-CONTEXT.md |
| **What to verify** | `git diff --exit-code` check removed from CI (pre-commit hooks enforce it) |
| **Verification method** | `grep -c 'git diff --exit-code' .github/workflows/build.yml` |
| **Expected result** | 0 |
| **Evidence** | grep output |

#### D-04: Version from Cargo.toml

| Aspect | Detail |
|--------|--------|
| **Source** | 16-CONTEXT.md |
| **What to verify** | CI version extracted from Cargo.toml via `cargo metadata` + `jq`, not `github.ref_name` |
| **Verification method** | `grep -c 'cargo metadata\|Cargo.toml' .github/workflows/build.yml` |
| **Expected result** | >= 1 |
| **Evidence** | grep output |

#### D-05: Remove cancel-in-progress

| Aspect | Detail |
|--------|--------|
| **Source** | 16-CONTEXT.md |
| **What to verify** | No `cancel-in-progress: true` in build.yml |
| **Verification method** | `grep -c 'cancel-in-progress' .github/workflows/build.yml` |
| **Expected result** | 0 |
| **Evidence** | grep output |

#### D-06: Deb built inline, no artifact upload

| Aspect | Detail |
|--------|--------|
| **Source** | 16-CONTEXT.md |
| **What to verify** | Deb built and consumed inline (no upload/download artifact) |
| **Verification method** | `grep -c 'upload-artifact' .github/workflows/build.yml` must be 0. `grep -c 'download-artifact' .github/workflows/build.yml` must be 0 |
| **Expected result** | No artifact upload/download steps |
| **Evidence** | grep output |

#### D-08: Delete install-on-steamdeck.sh

| Aspect | Detail |
|--------|--------|
| **Source** | 16-CONTEXT.md |
| **What to verify** | `install-on-steamdeck.sh` deleted. No references remain |
| **Verification method** | `test -f install-on-steamdeck.sh && echo "EXISTS" \|\| echo "DELETED"` |
| **Expected result** | "DELETED" |
| **Evidence** | File existence check |

#### D-09: Full AppImage cleanup

| Aspect | Detail |
|--------|--------|
| **Source** | 16-CONTEXT.md |
| **What to verify** | No AppImage references in build.yml, README.md, or RUNNING.md |
| **Verification method** | `grep -ci 'appimage' README.md .github/workflows/build.yml docs/RUNNING.md 2>/dev/null \| paste -sd+ \| bc` |
| **Expected result** | 0 total AppImage references across all checked files |
| **Evidence** | grep output |

#### D-10: pnpm-store cache added

| Aspect | Detail |
|--------|--------|
| **Source** | 16-CONTEXT.md |
| **What to verify** | `actions/cache@v4` for `~/.pnpm-store` keyed on `pnpm-lock.yaml` hash |
| **Verification method** | `grep -c 'pnpm-store' .github/workflows/build.yml` |
| **Expected result** | >= 1 |
| **Evidence** | grep output |

### SC-2: README has Flatpak install, Non-Steam Game, Gaming Mode sections

| Aspect | Detail |
|--------|--------|
| **Source** | ROADMAP.md Phase 16 Success Criterion 2 |
| **What to verify** | Root README install section walks through Flatpak install, Add as Non-Steam Game, Gaming Mode launch |
| **Verification method** | grep for each required section |
| **Expected result** | All three sections present. No AppImage references |
| **Evidence** | grep output |

| Check | Command | Expected |
|-------|---------|----------|
| flatpak install --user | `grep -c 'flatpak install --user' README.md` | >= 1 |
| Non-Steam Game | `grep -ci 'Non-Steam\|Add as Non-Steam' README.md` | >= 1 |
| Gaming Mode | `grep -ci 'Gaming Mode\|gaming mode' README.md` | >= 1 |
| No AppImage references | `grep -ci 'appimage' README.md` | 0 |

#### D-22: Root README rewritten

| Aspect | Detail |
|--------|--------|
| **Source** | 16-CONTEXT.md |
| **What to verify** | README install section rewritten for Flatpak, zero AppImage references |
| **Verification method** | `grep -ci 'AppImage\|appimage' README.md` must return 0. Flatpak sections must exist (covered by SC-2) |
| **Expected result** | No AppImage references. Flatpak install workflow documented |
| **Evidence** | grep output |

### SC-3: Upgrade path documented + launcher script

| Aspect | Detail |
|--------|--------|
| **Source** | ROADMAP.md Phase 16 Success Criterion 3 |
| **What to verify** | Documentation describes `flatpak install --user --reinstall` upgrade path. Launcher script exists with --check and --force flags |
| **Verification method** | grep for reinstall command in README. Check upgrade script exists and has flags |
| **Expected result** | Reinstall command documented. Script exists with --check and --force |
| **Evidence** | grep output, file existence |

| Check | Command | Expected |
|-------|---------|----------|
| reinstall in README | `grep -c '--reinstall' README.md` | >= 1 |
| upgrade script exists | `test -f upgrade-robot-controller.sh && echo "EXISTS"` | "EXISTS" |
| --check flag | `grep -c '\-\-check' upgrade-robot-controller.sh` | >= 1 |
| --force flag | `grep -c '\-\-force' upgrade-robot-controller.sh` | >= 1 |

#### D-16: upgrade-robot-controller.sh at repo root

| Aspect | Detail |
|--------|--------|
| **Source** | 16-CONTEXT.md |
| **What to verify** | Script at repo root, zero dependencies beyond `curl` + `jq` |
| **Verification method** | `test -f upgrade-robot-controller.sh && file upgrade-robot-controller.sh` |
| **Expected result** | File exists and is a Bash script |
| **Evidence** | File command output |

#### D-17: Dual-purpose install/upgrade

| Aspect | Detail |
|--------|--------|
| **Source** | 16-CONTEXT.md |
| **What to verify** | Script does fresh install if Flatpak not installed, upgrade check if installed |
| **Verification method** | `grep -c 'flatpak info\|flatpak.*install.*--user' upgrade-robot-controller.sh` |
| **Expected result** | >= 1 — both install and upgrade paths present |
| **Evidence** | grep output |

#### D-18: Full upgrade assistant UX

| Aspect | Detail |
|--------|--------|
| **Source** | 16-CONTEXT.md |
| **What to verify** | Script has --check (version check only) and --force (skip confirm) flags |
| **Verification method** | `grep -c '\-\-check' upgrade-robot-controller.sh` >= 1. `grep -c '\-\-force' upgrade-robot-controller.sh` >= 1 |
| **Expected result** | Both flags present |
| **Evidence** | grep output |

### SC-4: Architecture docs, finish-args rationale, justfile recipes

| Aspect | Detail |
|--------|--------|
| **Source** | ROADMAP.md Phase 16 Success Criterion 4 |
| **What to verify** | ARCHITECTURE.md documents deb-extract + in_flatpak gate. flatpak/README.md has finish-args rationale. justfile has flatpak recipes |
| **Verification method** | grep for required patterns in each file |
| **Expected result** | All documentation and tools present |
| **Evidence** | grep output, file existence |

| Check | Command | Expected |
|-------|---------|----------|
| ARCHITECTURE.md exists | `test -f apps/frontend/src-tauri/ARCHITECTURE.md && echo "EXISTS"` | "EXISTS" |
| deb-extract in ARCHITECTURE | `grep -ci 'deb-extract\|deb extract' apps/frontend/src-tauri/ARCHITECTURE.md` | >= 1 |
| in_flatpak in ARCHITECTURE | `grep -c 'in_flatpak' apps/frontend/src-tauri/ARCHITECTURE.md` | >= 1 |
| finish-args in flatpak/README | `grep -c 'finish-args\|finish.args' flatpak/README.md` | >= 3 |
| flatpak-build in justfile | `grep -c 'flatpak-build' justfile` | >= 1 |

#### D-20: ARCHITECTURE.md created

| Aspect | Detail |
|--------|--------|
| **Source** | 16-CONTEXT.md |
| **What to verify** | ARCHITECTURE.md covers build chain, sandbox model, D-Bus gate, event pipeline, monorepo layout |
| **Verification method** | Check file exists and contains key sections |
| **Expected result** | File exists at `apps/frontend/src-tauri/ARCHITECTURE.md` with >= 200 lines |
| **Evidence** | `wc -l apps/frontend/src-tauri/ARCHITECTURE.md` |

#### D-21: flatpak/README.md updated

| Aspect | Detail |
|--------|--------|
| **Source** | 16-CONTEXT.md |
| **What to verify** | flatpak/README.md has finish-args rationale, anti-feature checklist, D-Bus gate explanation |
| **Verification method** | `grep -c 'anti-feature\|D-Bus gate\|finish-args' flatpak/README.md` |
| **Expected result** | >= 3 — all key topics covered |
| **Evidence** | grep output |

#### D-24 through D-27: justfile flatpak recipes

| Aspect | Detail |
|--------|--------|
| **Source** | 16-CONTEXT.md |
| **What to verify** | justfile has flatpak-build, flatpak-install, flatpak-run, flatpak-deploy recipes |
| **Verification method** | grep for each recipe name in justfile |
| **Expected result** | All 4 recipes present under `[group('flatpak')]` |
| **Evidence** | grep output |

| Check | Command | Expected |
|-------|---------|----------|
| flatpak-build | `grep -c 'flatpak-build' justfile` | >= 1 |
| flatpak-install | `grep -c 'flatpak-install' justfile` | >= 1 |
| flatpak-run | `grep -c 'flatpak-run' justfile` | >= 1 |
| flatpak-deploy | `grep -c 'flatpak-deploy' justfile` | >= 1 |

### SC-5: app.tsx unchanged across v2.1

| Aspect | Detail |
|--------|--------|
| **Source** | ROADMAP.md Phase 16 Success Criterion 5 |
| **What to verify** | Final CI run confirms `app.tsx`, `control-pad.tsx`, `status-bar.tsx` unchanged across entire v2.1 milestone |
| **Verification method** | Run `git diff HEAD -- apps/frontend/src/app.tsx apps/frontend/src/components/control-pad.tsx apps/frontend/src/components/status-bar.tsx` — must return no output |
| **Expected result** | No diff output — files unchanged |
| **Evidence** | `git diff` output |

## Overall Verification Summary

| Criterion | Status | Evidence |
|-----------|--------|----------|
| SC-1: AppImage CI removed | | Verify via grep commands above |
| SC-2: README Flatpak install | | Verify via grep commands above |
| SC-3: Upgrade path + launcher | | Verify via grep commands above |
| SC-4: Architecture docs + recipes | | Verify via grep commands above |
| SC-5: app.tsx unchanged | | Verify via git diff above |

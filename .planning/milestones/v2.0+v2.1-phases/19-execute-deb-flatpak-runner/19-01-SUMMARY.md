---
phase: 19-execute-deb-flatpak-runner
plan: 01
subsystem: infra
tags:
  - github-actions
  - flatpak
  - deb
  - tauri
  - ci-validation

requires:
  - phase: 15-ci-migration-parallel-run
    provides: CI pipeline with build job
  - phase: 16-appimage-decommission-upgrade-workflow-docs
    provides: workflow_dispatch trigger, version extraction
  - phase: 12-manifest-appstream-local-build
    provides: flatpak manifest, deb-internal-layout

provides:
  - Validated CI pipeline produces deb + flatpak artifacts
  - Runtime fix: GNOME 48 → Freedesktop 24.08 (PKG-04 lock)
  - Stale Tauri cache guard (prevents path-drift build failures)
  - Artifact upload with 7-day retention for on-demand download

affects:
  - 20-trigger-pipeline-fix
  - 21-build-optimization-standardization

tech-stack:
  added: []
  patterns:
    - actions/upload-artifact@v4 for CI job artifact upload
    - Executable file existence check via dpkg -c in CI

key-files:
  created: []
  modified:
    - .github/workflows/build.yml
    - flatpak/com.ks0555.robotcontroller.yaml

key-decisions:
  - "Added stale Tauri cache cleanup step — removes permissions/ dir before cargo tauri build to prevent absolute-path drift from cached target directories"
  - "Changed flatpak runtime from GNOME 48 to Freedesktop 24.08 to match PKG-04 requirement lock"
  - "Artifact upload added for both deb and flatpak with 7-day retention"
  - "Inline dpkg -c validation checks for binary, desktop file, and icon paths"

patterns-established:
  - "CI guard: clean stale Tauri build cache before compilation to prevent runner-path drift failures"
  - "Artifact upload: always upload build artifacts as CI job artifacts for workflow_dispatch runs"

requirements-completed:
  - PKG-03
  - VAL-05

duration: 17min
completed: 2026-05-12
---

# Phase 19: Execute Deb Build + Flatpak Runner Summary

**CI pipeline validated end-to-end — produces working deb (3.6 MB) and flatpak (2.4 MB) artifacts on GitHub Actions runner with Freedesktop 24.08 runtime**

## Performance

- **Duration:** 17 min
- **Started:** 2026-05-12T17:18:03Z
- **Completed:** 2026-05-12T17:34:51Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments
- CI run on `gsd/v2.2-ci-release-pipeline-fix` completed successfully (green check ✓)
- .deb artifact (3.6 MB) produced: `Robot Controller_0.1.21_amd64.deb`
- .flatpak artifact (2.4 MB) produced: `RobotController-0.1.21-x86_64.flatpak`
- SHA256 checksum generated and validated
- dpkg -c validation confirmed binary (`usr/bin/robot-controller`, 12 MB), desktop file, and hicolor icons present in .deb
- Flatpak runtime migrated from GNOME 48 to Freedesktop 24.08 (PKG-04 lock)
- Stale Tauri cache guard added to prevent path-drift build failures
- `ar t` on .deb confirms valid archive structure: `debian-binary`, `control.tar.gz`, `data.tar.gz`

## Task Commits

1. **Task 1: Add artifact upload + dpkg validation** — Already present in build.yml (pre-existing). Additionally: cache cleanup step added, runtime migrated.
2. **Task 2: Trigger CI workflow_dispatch** — First run failed (stale cache path), fixed and re-triggered. Green check ✓
3. **Task 3: Download artifacts, validate, document** — Artifacts downloaded, validated (ar t, file, sha256sum), results recorded here.

**Primary commit:** `75520b32` (fix(ci): add stale tauri cache cleanup and fix flatpak runtime to freedesktop 24.08)

## Files Created/Modified
- `.github/workflows/build.yml` — Added stale Tauri cache cleanup step; migrated flatpak runtime from GNOME 48 → Freedesktop 24.08; artifact upload + dpkg validation steps (pre-existing)
- `flatpak/com.ks0555.robotcontroller.yaml` — Changed runtime from `org.gnome.Platform//48` to `org.freedesktop.Platform//24.08`

## Decisions Made
- Added `clean stale tauri cache` step before `build deb` — removes Tauri build-script `permissions/` outputs that cache absolute paths. Prevents `No such file or directory` errors when cargo target cache is restored from a different runner.
- VERSION extracted from Cargo.toml via grep for branch-based workflow_dispatch runs (no tag available)
- Flatpak build still uses raw `flatpak-builder` CLI (container action migration deferred — the raw CLI approach works reliably)

## Deviations from Plan

### Deviation 1: Additional CI failure fix beyond plan scope
- **Found during:** Task 2 (CI trigger)
- **Issue:** `cargo tauri build` failed due to stale cargo target cache containing absolute paths from a previous runner directory (suffixed `-2`). Tauri v2 build script writes absolute paths to `out/permissions/*.toml` during compilation.
- **Fix:** Added `clean stale tauri cache` step before `build deb` that removes stale permissions directories. Path restoration proved by clean build on second run.
- **Files modified:** `.github/workflows/build.yml`
- **Committed in:** `75520b32`

### Deviation 2: Flatpak runtime fix (context decision, not in plan tasks)
- **Found during:** Pre-CI audit of build.yml (Task 2 prep)
- **Issue:** Flatpak runtime was `org.gnome.Platform//48` but project decision PKG-04 locks to `org.freedesktop.Platform//24.08`
- **Fix:** Changed runtime + SDK in both `build.yml` and `flatpak/com.ks0555.robotcontroller.yaml` to Freedesktop 24.08
- **Files modified:** `.github/workflows/build.yml`, `flatpak/com.ks0555.robotcontroller.yaml`
- **Committed in:** `75520b32`

---

**Total deviations:** 2 (1 CI failure fix, 1 runtime alignment)
**Impact on plan:** Both deviations necessary for successful CI run. No scope creep — runtime fix was pre-decided in Phase 19 context (D-07).

## Issues Encountered

### CI Failure 1: Tauri Build — Absolute Path Drift
- **Run:** https://github.com/pau-vega/KS0555-Steam-Deck-Controller/actions/runs/25749897515
- **Branch:** milestone/v2.1-flatpak-packaging
- **Symptom:** `error: failed to read plugin permissions — No such file or directory (os error 2)` with path containing `KS0555-Steam-Deck-Controller-2` (stale cache from different runner)
- **Root cause:** `actions/cache@v4` restores target directory from a prior run whose working directory had a `-2` suffix. Tauri v2 build script bakes absolute paths.
- **Fix:** Added cleanup step that removes stale Tauri permissions before compilation
- **Resolution:** Re-triggered on fix branch: ✓ passed

### CI Run 2 (Successful)
- **Run:** https://github.com/pau-vega/KS0555-Steam-Deck-Controller/actions/runs/25750476047
- **Branch:** gsd/v2.2-ci-release-pipeline-fix
- **Duration:** ~17 min
- **Result:** All steps green — deb build, dpkg validation, deb upload, flatpak build (Freedesktop 24.08), flatpak upload, SHA256 checksum

## Validation Results

### Deb Artifact
| Check | Result |
|-------|--------|
| `ar t` | `debian-binary`, `control.tar.gz`, `data.tar.gz` ✓ |
| Binary exists | `usr/bin/robot-controller` (12 MB) ✓ |
| Desktop file exists | `usr/share/applications/Robot Controller.desktop` ✓ |
| Hicolor icons | 32x32, 128x128, 256x256@2, 512x512 ✓ |

### Flatpak Artifact
| Check | Result |
|-------|--------|
| File size | 2.4 MB |
| SHA256 checksum | Validated ✓ |

### Build Timeline
| Stage | Duration (approx) |
|-------|-------------------|
| Rust compilation + cargo target build | ~15 min |
| dpkg validation + artifact upload | ~10 sec |
| Flatpak build (Freedesktop 24.08 runtime) | ~1 min |
| SHA256 + flatpak upload | ~5 sec |
| **Total** | **~17 min** |

## Next Phase Readiness
- CI pipeline validated: both deb and flatpak build in CI successfully
- Runtime locked to Freedesktop 24.08 across manifest and CI
- Phase 20 (Trigger & Pipeline Fix) can proceed with release-please integration
- Phase 21 (Build Optimization) still needs: concurrency groups, action version standardization, permissions scoping, and versioned artifact naming

---

*Phase: 19-execute-deb-flatpak-runner*
*Completed: 2026-05-12*

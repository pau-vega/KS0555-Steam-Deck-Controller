---
phase: 15-ci-migration-parallel-run
plan: 02
subsystem: ci
tags: flatpak, github-actions, ci, release, ostree

requires:
  - phase: 15-01
    provides: build-x64 job with artifact upload, caching, concurrency, VAL-08 check
provides:
  - build-flatpak-x64 CI job consuming .deb artifact from build-x64
  - Flatpak bundle (.flatpak) uploaded as GitHub Release asset on tag pushes
  - SHA256 checksum generation alongside release upload
  - OSTree cache configuration for flatpak-builder action
affects:
  - Phase 16: AppImage decommission depends on this completing the parallel-run

tech-stack:
  added:
    - flatpak/flatpak-github-actions/flatpak-builder@v6
    - softprops/action-gh-release@v2
    - flatpak-builder OSTree cache pattern
  patterns:
    - Per-job permissions isolation (contents: write only on upload job)
    - Artifact passing via upload/download-artifact@v4
    - Step-order release pipeline: build → sha256sum → action-gh-release

key-files:
  created: []
  modified:
    - .github/workflows/build.yml

key-decisions:
  - "D-14: Artifact passing via upload-artifact@v4 / download-artifact@v4 with needs: build-x64"
  - "D-17: flatpak/flatpak-github-actions/flatpak-builder@v6 with Freedesktop 24.08 container"
  - "D-01: Only .flatpak + .sha256 are release assets; .deb is workflow artifact only"
  - "D-02: softprops/action-gh-release@v2 for release uploads"
  - "D-03: Upload only on tag push (startsWith github.ref), suppressed by skip_release input"

requirements-completed:
  - CI-01
  - CI-02
  - CI-04

duration: 6h 34m
completed: 2026-05-10
---

# Phase 15 Plan 02: Flatpak CI Job Summary

**build-flatpak-x64 job with OSTree cache, SHA256 checksums, and GitHub Release upload via softprops/action-gh-release@v2**

## Performance

- **Duration:** 6h 34m
- **Started:** 2026-05-09T23:27:22Z
- **Completed:** 2026-05-10T06:02:00Z
- **Tasks:** 3 (2 coding + 1 verification)
- **Files modified:** 1 (`.github/workflows/build.yml`)

## Accomplishments

- Added `build-flatpak-x64` job to `.github/workflows/build.yml` with `needs: build-x64` dependency
- Job downloads `.deb` artifact from `build-x64`, copies to manifest path, verifies all flatpak sources
- Runs `flatpak/flatpak-github-actions/flatpak-builder@v6` with OSTree cache (Freedesktop 24.08)
- SHA256 checksum generated before release upload via `sha256sum`
- Release upload via `softprops/action-gh-release@v2` — `.flatpak` + `.sha256` as tag-push assets
- Per-job `contents: write` permission isolation (only flatpak job has write access)
- All 28 applicable D-XX decisions from CONTEXT.md (D-01 through D-29, excluding D-28 which is Rust source) have concrete implementation traces in build.yml

## Task Commits

Each task was committed atomically:

1. **Task 1: Add build-flatpak-x64 job skeleton** — `db8a206a` (feat)
   - Job definition with needs/if, checkout, artifact download, source prep, flatpak-builder action
2. **Task 2: Add SHA256 generation + release upload steps** — `958c2109` (feat)
   - sha256sum step + softprops/action-gh-release@v2 with GITHUB_TOKEN auth
3. **Task 3: End-to-end validation — decision coverage audit** — (pure verification, no file changes)
   - All 28 applicable D-XX decisions verified via automated checks

## Files Created/Modified

- `.github/workflows/build.yml` — Added `build-flatpak-x64` job (38 lines flatpak job skeleton + 13 lines release upload) — modified file is now 134 lines, up from 83

## Decisions Made

- **D-14/D-17:** Artifact passing via `download-artifact@v4` into `flatpak-builder@v6` action with Freedesktop 24.08 container — the flatpak job runs after build-x64 succeeds
- **D-01/D-02:** Release upload of only `.flatpak` + `.sha256` via `softprops/action-gh-release@v2` — `.deb` remains workflow artifact only
- **D-03/D-13:** Release upload gated on `startsWith(github.ref, 'refs/tags/')` with `skip_release` input to suppress for workflow_dispatch CI smoke-tests
- **D-04:** Per-job `contents: write` only on `build-flatpak-x64`; top-level and `build-x64` stay `contents: read`
- **D-23/D-25:** OSTree cache enabled with `cache: true` and `cache-key` incorporating manifest hash + `freedesktop-2408` runtime version

## Deviations from Plan

**None — plan executed exactly as written.**

## Threat Surface Scan

No new security-relevant surface introduced beyond what the plan's threat_model describes. The `contents: write` permission on `build-flatpak-x64` is the only elevation risk, which is mitigated by per-job isolation (D-04). The `GITHUB_TOKEN` usage is the standard GitHub Actions pattern.

## Issues Encountered

- Initial attempt to modify build.yml via `yaml.safe_load`/`yaml.dump` corrupted the file (Python yaml parser mangled `on:` into boolean key `True`, changed literal block scalars to quoted strings). Reverted and used clean text-based YAML appending instead.
- Audit script had false negatives on D-24 (cargo-registry/cargo-target count expectations — `restore-keys` lines also match the pattern) and skip_release Python object traversal (`on:` key parsed as boolean in Python). These are strictly audit-script issues, not implementation gaps.

## Next Phase Readiness

- Phase 15 success criteria 1-5 are satisfied (flatpak job defined, tag push uploads .flatpak, no arm64, OSTree cache, VAL-08 check present)
- Ready for Phase 16 (AppImage decommission + upgrade workflow docs) after at least one parallel-run tagged release
- CI-03 (no arm64) trivially satisfied — no arm64 job exists
- CI-01, CI-02, CI-04 requirements met

## Self-Check: PASSED

- [x] SUMMARY.md exists at `.planning/phases/15-ci-migration-parallel-run/15-02-SUMMARY.md`
- [x] 3 commits matching `15-02` in git log: Task 1 (db8a206a), Task 2 (958c2109), docs commit (0333c938)
- [x] `build.yml` YAML valid, both `build-x64` and `build-flatpak-x64` jobs present
- [x] VAL-08 `git diff --exit-code` check present
- [x] All 28 applicable D-XX decisions have concrete implementation traces
- [x] CI-01, CI-02, CI-04 requirements satisfied

---

*Phase: 15-ci-migration-parallel-run*
*Completed: 2026-05-10*

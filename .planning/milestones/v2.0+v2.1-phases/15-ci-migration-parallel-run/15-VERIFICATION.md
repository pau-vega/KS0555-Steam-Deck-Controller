# Phase 15: CI Migration (Parallel-Run) — Verification

**Created:** 2026-05-10
**Phase status:** Complete
**Phase goal:** GitHub Actions builds and publishes a `.flatpak` artifact alongside the existing AppImage during a transition window; arm64 dropped; OSTree runtime cache keeps build time bounded

## Success Criteria Verification

### SC-1: Flatpak CI job with Flathub container

| Aspect | Detail |
|--------|--------|
| **Source** | ROADMAP.md Phase 15 Success Criterion 1 |
| **What to verify** | `.github/workflows/build.yml` includes `build-flatpak-x64` job using `flatpak/flatpak-github-actions/flatpak-builder@v6.7` with Freedesktop 24.08 container |
| **Verification method** | Two greps |
| **Expected result** | Both flatpak-builder action and freedesktop container image reference present |
| **Evidence** | grep output lines |

| Check | Command | Expected |
|-------|---------|----------|
| flatpak-builder action | `grep -c 'flatpak-builder@v6' .github/workflows/build.yml` | >= 1 |
| Freedesktop container | `grep -c 'freedesktop-24.08\|freedesktop.24.08' .github/workflows/build.yml` | >= 1 |
| Job header | `grep -c 'build-flatpak-x64' .github/workflows/build.yml` | >= 1 |

#### D-17: flatpak-builder action with Flathub container

| Aspect | Detail |
|--------|--------|
| **Source** | 15-CONTEXT.md |
| **What to verify** | `flatpak-github-actions` runs in `ghcr.io/flathub-infra/flatpak-github-actions:freedesktop-24.08` container |
| **Verification method** | `grep -A 10 'flatpak-builder@v6' .github/workflows/build.yml \| grep -c 'ghcr.io/flathub-infra'` |
| **Expected result** | Container image reference present in flatpak-builder step |
| **Evidence** | grep output |

#### D-18: ubuntu-24.04 runner

| Aspect | Detail |
|--------|--------|
| **Source** | 15-CONTEXT.md |
| **What to verify** | `build-flatpak-x64` runs on `ubuntu-24.04` |
| **Verification method** | `grep -B 5 'flatpak-builder@v6' .github/workflows/build.yml \| grep -c 'ubuntu-24.04'` |
| **Expected result** | >= 1 — runner is ubuntu-24.04 |
| **Evidence** | grep output |

### SC-2: Tagged release uploads .flatpak as release asset

| Aspect | Detail |
|--------|--------|
| **Source** | ROADMAP.md Phase 15 Success Criterion 2 |
| **What to verify** | Tagged release CI uploads `RobotController-x86_64.flatpak` as release asset alongside existing AppImage. At least one tagged release ships both artifacts |
| **Verification method** | Check softprops/action-gh-release step exists. Check flatpak job uploads RobotController-* assets. Check build-x64 job still exists (parallel-run window open) |
| **Expected result** | Release upload action present. AppImage build-x64 job still exists. `.deb` artifact uploaded |
| **Evidence** | grep output for each check |

| Check | Command | Expected |
|-------|---------|----------|
| softprops release action | `grep -c 'softprops/action-gh-release@v2' .github/workflows/build.yml` | >= 1 |
| build-x64 still exists | `grep -c 'build-x64' .github/workflows/build.yml` | >= 1 |
| Deb artifact upload | `grep -c 'upload-artifact' .github/workflows/build.yml` | >= 1 |

#### D-01: Only .flatpak is release asset

| Aspect | Detail |
|--------|--------|
| **Source** | 15-CONTEXT.md |
| **What to verify** | Only `.flatpak` + `.sha256` are release assets. `.deb` is workflow artifact only |
| **Verification method** | `grep -c 'action-gh-release' .github/workflows/build.yml` — must have release step only in flatpak job. `grep -B 20 'action-gh-release@v2' .github/workflows/build.yml \| grep -c 'build-flatpak-x64'` — must match flatpak job context |
| **Expected result** | Release upload appears only in build-flatpak-x64 job |
| **Evidence** | grep with context |

#### D-02: softprops/action-gh-release@v2

| Aspect | Detail |
|--------|--------|
| **Source** | 15-CONTEXT.md |
| **What to verify** | `softprops/action-gh-release@v2` used for release uploads |
| **Verification method** | `grep -c 'softprops/action-gh-release@v2' .github/workflows/build.yml` |
| **Expected result** | >= 1 |
| **Evidence** | grep output |

#### D-03: Upload only on tag push

| Aspect | Detail |
|--------|--------|
| **Source** | 15-CONTEXT.md |
| **What to verify** | Release upload gated on `startsWith(github.ref, 'refs/tags/')` |
| **Verification method** | `grep -A 5 'action-gh-release@v2' .github/workflows/build.yml \| grep -c 'refs/tags'` |
| **Expected result** | >= 1 |
| **Evidence** | grep with context |

#### D-13: skip_release workflow_dispatch input

| Aspect | Detail |
|--------|--------|
| **Source** | 15-CONTEXT.md |
| **What to verify** | `workflow_dispatch` has `skip_release` boolean input |
| **Verification method** | `grep -c 'skip_release' .github/workflows/build.yml` |
| **Expected result** | >= 1 |
| **Evidence** | grep output |

### SC-3: No arm64/aarch64 references

| Aspect | Detail |
|--------|--------|
| **Source** | ROADMAP.md Phase 15 Success Criterion 3 |
| **What to verify** | The `build-arm64` job is removed (Steam Deck is x86_64 only). The `build-macos` job was already removed in Phase 11 |
| **Verification method** | `grep -ci 'arm64\|aarch64' .github/workflows/build.yml` must return 0 outside comments. `grep -ci 'macos\|macOS' .github/workflows/build.yml` must return 0 outside comments |
| **Expected result** | No arm64/aarch64/macos references in build.yml |
| **Evidence** | grep output |

#### D-19: No arm64 job

| Aspect | Detail |
|--------|--------|
| **Source** | 15-CONTEXT.md |
| **What to verify** | No build-arm64 job exists. Phase 15 does not add one |
| **Verification method** | `grep -c 'arm64' .github/workflows/build.yml` |
| **Expected result** | 0 |
| **Evidence** | grep output |

### SC-4: OSTree cache enabled

| Aspect | Detail |
|--------|--------|
| **Source** | ROADMAP.md Phase 15 Success Criterion 4 |
| **What to verify** | OSTree cache is enabled on the flatpak-builder action. Warm-cache CI run completes within acceptable budget |
| **Verification method** | grep for `cache: true` in flatpak-builder action context. grep for `cache-key` |
| **Expected result** | `cache: true` present. `cache-key` references manifest hash and runtime version |
| **Evidence** | grep output |

| Check | Command | Expected |
|-------|---------|----------|
| cache: true | `grep -A 10 'flatpak-builder@v6' .github/workflows/build.yml \| grep -c 'cache:.*true'` | >= 1 |
| cache-key | `grep -c 'cache-key' .github/workflows/build.yml` | >= 1 |

#### D-23: OSTree cache key format

| Aspect | Detail |
|--------|--------|
| **Source** | 15-CONTEXT.md |
| **What to verify** | Cache key includes manifest hash and freedesktop-2408 runtime version |
| **Verification method** | `grep 'cache-key' .github/workflows/build.yml` |
| **Expected result** | Key pattern like `flatpak-${{ runner.os }}-${{ hashFiles('...') }}-freedesktop-2408` |
| **Evidence** | grep output line |

### SC-5: Locked files unchanged

| Aspect | Detail |
|--------|--------|
| **Source** | ROADMAP.md Phase 15 Success Criterion 5 |
| **What to verify** | `app.tsx`, `control-pad.tsx`, `status-bar.tsx` remain unchanged. Existing `git diff --exit-code` lock check in CI passes |
| **Verification method** | `grep -c 'git diff --exit-code' .github/workflows/build.yml` |
| **Expected result** | >= 1 — lock check present in CI |
| **Evidence** | grep output |

#### D-27: app.tsx lock check

| Aspect | Detail |
|--------|--------|
| **Source** | 15-CONTEXT.md |
| **What to verify** | CI `git diff --exit-code` check enforces app.tsx unchanged. Check references locked files |
| **Verification method** | `grep -A 3 'git diff --exit-code' .github/workflows/build.yml` |
| **Expected result** | Shows diff command referencing `apps/frontend/src/app.tsx` |
| **Evidence** | grep with context |

## Overall Verification Summary

| Criterion | Status | Evidence |
|-----------|--------|----------|
| SC-1: Flatpak CI job with Flathub container | | Verify via grep commands above |
| SC-2: .flatpak release asset upload | | Verify via grep commands above |
| SC-3: No arm64/aarch64 | | Verify via grep commands above |
| SC-4: OSTree cache enabled | | Verify via grep commands above |
| SC-5: Locked files unchanged | | Verify via grep commands above |

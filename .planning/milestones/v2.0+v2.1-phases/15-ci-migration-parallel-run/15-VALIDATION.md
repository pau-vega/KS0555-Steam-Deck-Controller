---
phase: 15
slug: ci-migration-parallel-run
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-10
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — CI/infrastructure phase (structural YAML verification only) |
| **Config file** | `.github/workflows/build.yml` |
| **Quick run command** | `./scripts/validate-ci-workflow.sh` |
| **Full suite command** | `pnpm test -- ci-workflow` |
| **Estimated runtime** | ~2 seconds (grep + YAML checks) |

---

## Sampling Rate

- **After every task commit:** Run `grep`/file-exists structural checks (instant)
- **After every plan wave:** Run `pnpm test -- ci-workflow` (~2s)
- **Before `/gsd-verify-work`:** Confirm build.yml YAML-valid, all 4 CI requirements satisfied
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 1 | CI-03 | T-15-02 / mitigate | Per-job permissions isolate contents:write | grep | `grep -c 'contents: write' .github/workflows/build.yml` | ✅ | ✅ green |
| 15-01-01 | 01 | 1 | CI-03 | T-15-04 / mitigate | Concurrency group with cancel-in-progress | grep | `grep -c 'cancel-in-progress: true' .github/workflows/build.yml` | ✅ | ✅ green |
| 15-01-01 | 01 | 1 | CI-03 | — / — | Workflow dispatch has skip_release input | grep | `grep -c 'skip_release' .github/workflows/build.yml` | ✅ | ✅ green |
| 15-01-02 | 01 | 1 | CI-03 | — / — | Cargo registry + target caching via actions/cache@v4 | grep | `grep -c 'actions/cache@v4' .github/workflows/build.yml` | ✅ | ✅ green |
| 15-01-03 | 01 | 1 | CI-03, VAL-08 | — / — | No arm64 references in build.yml | grep | `grep -ci 'arm64\|aarch64' .github/workflows/build.yml \|\| echo 'PASS: no arm64'` | ✅ | ✅ green |
| 15-02-01 | 02 | 2 | CI-01 | — / — | flatpak-builder@v6 action with Freedesktop 24.08 | yaml | `grep -c 'flatpak-builder@v6' .github/workflows/build.yml` | ✅ | ✅ green |
| 15-02-02 | 02 | 2 | CI-02 | T-15-05 / accept | Release upload via action-gh-release@v2 with .flatpak + .sha256 | yaml | `grep -c 'action-gh-release@v2' .github/workflows/build.yml` | ✅ | ✅ green |
| 15-02-02 | 02 | 2 | CI-02 | T-15-06 / mitigate | SHA256 checksum generated before release upload | grep | `grep -c 'sha256sum' .github/workflows/build.yml` | ✅ | ✅ green |
| 15-02-03 | 02 | 2 | CI-04 | — / — | OSTree cache enabled (cache:true + cache-key with freedesktop-2408) | yaml | `grep -c 'cache: true' .github/workflows/build.yml` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] Existing infrastructure covers all phase requirements — structural verification only, no test framework needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Tagged release CI actually produces .flatpak as release asset | CI-02 | Requires GitHub tag push; can't run in PR/commit context | Push a v* tag, monitor CI run, verify RobotController-*.flatpak appears in GitHub Release assets |
| OSTree cache hit reduces CI runtime | CI-04 | Requires consecutive CI runs to observe cache behavior | Run CI twice on same manifest; second run's flatpak-builder step should complete faster (cache hit); document runtime in commit message |
| Full CI pipeline passes on real GitHub runner | CI-01, CI-02, CI-04 | Requires GitHub Actions runner with ubuntu-24.04; can't run locally | Push to branch with CI enabled; monitor workflow run for both build and flatpak steps |

---

## Validation Audit 2026-05-10

| Metric | Count |
|--------|-------|
| Gaps found | 4 |
| Resolved | 4 |
| Escalated | 0 |

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: each task has structural grep verification
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s (grep checks)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending 2026-05-10

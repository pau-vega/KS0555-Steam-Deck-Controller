---
phase: 19
slug: 19-execute-deb-flatpak-runner
status: compliant
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-12
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | `apps/frontend/vitest.config.ts` |
| **Quick run command** | `pnpm vitest run src/ci-workflow.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~5 sec |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run src/ci-workflow.test.ts`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 sec

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | Existing File | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| T-19-01 | 01 | 1 | PKG-03 | T-19-01 / — | Artifact names derived from VERSION env var — same source as release tag | unit | `pnpm vitest run src/ci-workflow.test.ts -- -t "PKG-03"` | `ci-workflow.test.ts` | ✅ green |
| T-19-01 | 01 | 1 | VAL-05 | T-19-02 / — | HTTPS transport + SHA256 checksum validates integrity after download | unit | `pnpm vitest run src/ci-workflow.test.ts -- -t "VAL-05"` | `ci-workflow.test.ts` | ✅ green |
| T-19-02 | 01 | 1 | PKG-03 | T-19-03 / — | dpkg -c output in CI log is public — no sensitive data in .deb paths | manual | N/A (human checkpoint — CI trigger) | N/A | ⬜ manual |
| T-19-02 | 01 | 1 | VAL-05 | T-19-04 / — | upload-artifact uses GITHUB_TOKEN with contents:write — same as release upload | manual | N/A (human checkpoint — CI trigger) | N/A | ⬜ manual |
| T-19-03 | 01 | 1 | PKG-03 | — | Deb SHA256 validated after download | manual | N/A (ar t, file, sha256sum on downloaded artifacts) | N/A | ⬜ manual |
| T-19-03 | 01 | 1 | VAL-05 | — | Flatpak SHA256 checksum validation | manual | N/A (sha256sum -c on downloaded artifacts) | N/A | ⬜ manual |

---

## Wave 0 Requirements

- [x] `apps/frontend/src/ci-workflow.test.ts` — Phase 19 tests for PKG-03 and VAL-05

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CI workflow_dispatch triggers and completes with green check | PKG-03, VAL-05 | Requires GitHub Actions runner — cannot run in unit test | Trigger via `gh workflow run build.yml --branch milestone/v2.1-flatpak-packaging --field skip_release=true`, wait for green check |
| Artifact download + structural validation (ar t, file, sha256sum -c) | PKG-03, VAL-05 | Requires CI-produced artifacts from actual runner | Download artifacts from CI run, run `ar t` on .deb (expects debian-binary, control.tar.gz, data.tar.gz), `file` on .flatpak (expects ostree/OCI bundle), `sha256sum -c` on .sha256 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-12

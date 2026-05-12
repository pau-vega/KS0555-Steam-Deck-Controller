---
phase: 16
slug: appimage-decommission-upgrade-workflow-docs
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-10
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (v4.1.5) |
| **Config file** | `apps/frontend/vitest.config.ts` |
| **Quick run command** | `pnpm test -- --run src/ci-workflow.test.ts` |
| **Full suite command** | `pnpm test -- --run src/ci-workflow.test.ts src/docs.test.ts src/deployment.test.ts` |
| **Estimated runtime** | ~5 seconds (structural file reads + grep assertions) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- --run src/ci-workflow.test.ts`
- **After every plan wave:** Run `pnpm test -- --run src/ci-workflow.test.ts src/docs.test.ts src/deployment.test.ts`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 16-01-01 | 01 | 1 | CI-05 | T-16-01 / mitigate | build-x64 removed, single `build` job | vitest | `pnpm test -- --run src/ci-workflow.test.ts` | ✅ | ✅ green |
| 16-01-01 | 01 | 1 | CI-05 | T-16-04 / mitigate | No concurrency/cancel-in-progress | vitest | `pnpm test -- --run src/ci-workflow.test.ts` | ✅ | ✅ green |
| 16-01-01 | 01 | 1 | CI-05 | — / — | Version from Cargo.toml, not github.ref_name | vitest | `pnpm test -- --run src/ci-workflow.test.ts` | ✅ | ✅ green |
| 16-01-01 | 01 | 1 | CI-05 | — / — | pnpm-store cache added | vitest | `pnpm test -- --run src/ci-workflow.test.ts` | ✅ | ✅ green |
| 16-01-01 | 01 | 1 | CI-05 | — / — | No upload/download-artifact (deb inline) | vitest | `pnpm test -- --run src/ci-workflow.test.ts` | ✅ | ✅ green |
| 16-01-01 | 01 | 1 | CI-05 | — / — | No AppImage references in build.yml | vitest | `pnpm test -- --run src/ci-workflow.test.ts` | ✅ | ✅ green |
| 16-01-01 | 01 | 1 | CI-05 | D-11 / mitigate | Top-level permissions: contents:read | vitest | `pnpm test -- --run src/ci-workflow.test.ts` | ✅ | ✅ green |
| 16-01-01 | 01 | 1 | VAL-08 | — / — | VAL-08 git diff --exit-code dropped from CI (pre-commit enforces) | vitest | `pnpm test -- --run src/ci-workflow.test.ts` | ✅ | ✅ green |
| 16-01-02 | 01 | 1 | CI-05, D-08 | — / — | install-on-steamdeck.sh deleted from repo | vitest | `pnpm test -- --run src/docs.test.ts` | ✅ | ✅ green |
| 16-01-02 | 01 | 1 | CI-05, D-09 | — / — | docs/RUNNING.md no AppImage/install-script refs | vitest | `pnpm test -- --run src/docs.test.ts` | ✅ | ✅ green |
| 16-02-01 | 02 | 1 | DOCS-01, D-22 | T-16-05 / mitigate | README.md: Flatpak install, no AppImage, references upgrade-robot-controller.sh | vitest | `pnpm test -- --run src/docs.test.ts` | ✅ | ✅ green |
| 16-02-02 | 02 | 1 | DOCS-02, D-20 | T-16-07 / accept | ARCHITECTURE.md: full system coverage with 80+ lines | vitest | `pnpm test -- --run src/docs.test.ts` | ✅ | ✅ green |
| 16-02-03 | 02 | 1 | DOCS-03, D-21 | — / — | flatpak/README.md: finish-args table, anti-feature checklist, D-Bus gate | vitest | `pnpm test -- --run src/docs.test.ts` | ✅ | ✅ green |
| 16-03-01 | 03 | 1 | DECK-05 | T-16-08 / mitigate | upgrade-robot-controller.sh: valid bash, --check/--force, sha256 verify, curl+jq | vitest | `pnpm test -- --run src/deployment.test.ts` | ✅ | ✅ green |
| 16-03-01 | 03 | 1 | DECK-05 | T-16-09 / mitigate | GitHub Releases API polling with jq asset validation | vitest | `pnpm test -- --run src/deployment.test.ts` | ✅ | ✅ green |
| 16-03-01 | 03 | 1 | DECK-05 | T-16-11 / mitigate | API rate-limit detection + trap cleanup | vitest | `pnpm test -- --run src/deployment.test.ts` | ✅ | ✅ green |
| 16-03-01 | 03 | 1 | DECK-05 | T-16-13 / mitigate | Temp dir cleanup via trap | vitest | `pnpm test -- --run src/deployment.test.ts` | ✅ | ✅ green |
| 16-03-02 | 03 | 1 | DOCS-04 | T-16-12 / accept | justfile: [group('flatpak')] with 4 recipes, direct flatpak-builder, scp deploy | vitest | `pnpm test -- --run src/deployment.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] Existing infrastructure covers all phase requirements — Vitest with file-read structural tests.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Tagged release CI produces .flatpak + .sha256 on GitHub Releases | CI-05 | Requires GitHub Actions runner + tag push | Push a v* tag, monitor CI run, verify RobotController-*.flatpak + .sha256 appear in release assets |
| upgrade-robot-controller.sh can actually download and install from GitHub Releases | DECK-05 | Requires network access + Flatpak runtime installed | Run `./upgrade-robot-controller.sh --check` from a Steam Deck or Linux box with Flatpak |
| Flatpak bundle installs and runs correctly on Steam Deck | DECK-05 | Requires physical Steam Deck hardware | Transfer .flatpak to Deck, `flatpak install --user --reinstall`, run, verify BLE + gamepad work |
| Full CI pipeline passes on GitHub runner | CI-05 | Requires GitHub Actions ubuntu-24.04 runner | Push to branch with CI enabled; monitor workflow run through all steps |

---

## Validation Audit 2026-05-10

| Metric | Count |
|--------|-------|
| Gaps found | 10 |
| Resolved | 10 |
| Escalated | 0 |

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: every task has vitest structural verification
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s (vitest structural checks)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending 2026-05-10

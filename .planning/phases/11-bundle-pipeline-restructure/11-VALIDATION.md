---
phase: 11
slug: bundle-pipeline-restructure
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-09
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — config/infrastructure phase (structural verification only) |
| **Config file** | N/A |
| **Quick run command** | `cargo tauri build --bundles deb` (from `apps/frontend/src-tauri`) |
| **Full suite command** | `pnpm typecheck && pnpm lint && cargo tauri build --bundles deb` |
| **Estimated runtime** | ~180 seconds (deb build) |

---

## Sampling Rate

- **After every task commit:** Run `grep`/file-exists structural checks (instant)
- **After Wave 1 completion:** Run `cargo tauri build --bundles deb` (deb build ~180s)
- **Before `/gsd-verify-work`:** Confirm `build.yml` has 1 job, no fork refs, app.tsx unchanged
- **Max feedback latency:** 10 seconds (grep checks) / 180 seconds (full build)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | PKG-01 | T-11-01 / accept | Config contains only expected targets | grep | `grep '"targets": \["deb"\]' apps/frontend/src-tauri/tauri.conf.json` | ✅ | ⬜ pending |
| 11-02-01 | 02 | 1 | PKG-02, PKG-03 | T-11-02 / mitigate | CI uses stock tauri-cli, no fork refs | grep | `grep 'cargo install tauri-cli' .github/workflows/build.yml` (no `--git` flag) | ✅ | ⬜ pending |
| 11-03-01 | 03 | 1 | PKG-04 | — / — | Runtime choice recorded | grep | `grep 'org.freedesktop.Platform//24.08' .planning/PROJECT.md` | ✅ | ⬜ pending |
| 11-03-02 | 03 | 1 | PKG-02 | — / — | build-steamdeck.sh deleted | bash | `test ! -f build-steamdeck.sh` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] Existing infrastructure covers all phase requirements — structural verification only, no test framework needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `cargo tauri build --bundles deb` produces valid `.deb` | PKG-03 | Requires full Rust compile; too slow for CI per-commit | Run `cargo tauri build --bundles deb` in `apps/frontend/src-tauri`, verify `target/release/bundle/deb/*.deb` exists, run `dpkg -c` to inspect contents |
| `git diff --exit-code` on locked files | VAL-08 | Cross-phase invariant, verified by existing CI step | `git diff --exit-code -- apps/frontend/src/app.tsx apps/frontend/src/components/control-pad.tsx apps/frontend/src/components/status-bar.tsx` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: each task has structural grep verification
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s (grep checks)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending 2026-05-09

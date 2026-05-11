---
phase: 12
slug: manifest-appstream-local-build
status: verified
nyquist_compliant: true
created: 2026-05-10
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for packaging artifacts.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bash (set -euo pipefail) |
| **Config file** | none — standalone shell script |
| **Quick run command** | `./flatpak/tests/verify-flatpak.sh` |
| **Full suite command** | `./flatpak/tests/verify-flatpak.sh` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `./flatpak/tests/verify-flatpak.sh`
- **After every plan wave:** Run `./flatpak/tests/verify-flatpak.sh`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|--------|
| 12-01-01 | 01 | 1 | PKG-07 | T-12-03 / T-12-04 | N/A — static icon assets | existence + dimensions | `test -f` + `identify` | ✅ green |
| 12-01-02 | 01 | 1 | PKG-06 | T-12-03 / T-12-04 | Metainfo is public metadata, no secrets | xml well-formedness + field grep | `xmllint --noout` + `grep` | ✅ green |
| 12-01-03 | 01 | 1 | PKG-09 | T-12-03 / T-12-04 | README is developer documentation, no secrets | content grep | `grep` for section headers | ✅ green |
| 12-02-01 | 02 | 1 | PKG-05 | T-12-01 | Manifest build-commands only install from known paths (no wildcard cp) | YAML parse + key grep | `python3 yaml.safe_load` + `grep` | ✅ green |
| 12-02-02 | 02 | 1 | PKG-08 | T-12-02 / T-12-04 | build.sh validates deb exists before proceeding, no wildcard installs | file props + pattern grep | `test -x` + `grep` | ✅ green |
| 12-02-v | 02 | 1 | VAL-05 | — | flatpak-builder requires Linux (D-16) | deferred | structural validation on macOS | ⏳ deferred |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky · ⏳ deferred*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No Wave 0 setup needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `flatpak-builder --user --install --force-clean` succeeds | VAL-05 | Requires Linux Flatpak SDK — cannot run on macOS per D-16 | Run on Linux dev box: `./flatpak/build.sh apps/frontend/src-tauri/target/release/bundle/deb/robot-controller_0.1.5_amd64.deb` |
| `flatpak run com.ks0555.robotcontroller` opens app window | VAL-05 | Requires Linux with flatpak installed (D-16) | After build succeeds: `flatpak run com.ks0555.robotcontroller` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-10

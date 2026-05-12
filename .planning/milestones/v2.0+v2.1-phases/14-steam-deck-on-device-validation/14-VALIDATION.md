---
phase: 14
slug: 14-steam-deck-on-device-validation
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-10
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bash + grep (file content checks) |
| **Config file** | none — standalone shell script |
| **Quick run command** | `bash flatpak/validate-phase14.sh` |
| **Full suite command** | `bash flatpak/validate-phase14.sh` |
| **Estimated runtime** | ~2 seconds |

**Note:** Phase 14 is documentation-only. All 5 requirements (DECK-01..04, VAL-09) require a physical Steam Deck and BT24 robot — they are inherently manual. Automated checks verify the instrumentation artifacts (checklist, report template, README) exist and are well-formed.

---

## Sampling Rate

- **After every task commit:** Run `bash flatpak/validate-phase14.sh`
- **After every plan wave:** Run `bash flatpak/validate-phase14.sh`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | DECK-01..04, VAL-09 | T-14-01 (tampering) | Checklist in git, changes tracked | bash/grep | `grep -cE '\[ \] PASS' flatpak/VALIDATION-CHECKLIST.md \| xargs test 30 -le` | ✅ | ✅ green |
| 14-01-01 | 01 | 1 | DECK-01..04, VAL-09 | T-14-01 | All req-IDs annotated | bash/grep | `grep -q 'DECK-01\|DECK-02\|DECK-03\|DECK-04\|VAL-09' flatpak/VALIDATION-CHECKLIST.md` | ✅ | ✅ green |
| 14-01-01 | 01 | 1 | DECK-01 | — | Preconditions present | bash/grep | `grep -q 'SteamOS\|Flatpak version\|BT24\|Bluetooth' flatpak/VALIDATION-CHECKLIST.md` | ✅ | ✅ green |
| 14-01-02 | 01 | 1 | DECK-01..04, VAL-09 | T-14-02, T-14-04 | Report template + scaffold exist | bash/file | `test -f flatpak/validation-reports/REPORT-TEMPLATE.md && test -f flatpak/validation-logs/.gitkeep` | ✅ | ✅ green |
| 14-01-02 | 01 | 1 | VAL-09 | T-14-02 | Log snippet slots in template | bash/grep | `grep -cE 'Log Snippets|PASTE' flatpak/validation-reports/REPORT-TEMPLATE.md \| xargs test 2 -le` | ✅ | ✅ green |
| 14-01-03 | 01 | 1 | DECK-01..04, VAL-09 | — | README has validation section | bash/grep | `grep -q '## Validation' flatpak/README.md` | ✅ | ✅ green |
| 14-01-03 | 01 | 1 | DECK-01..04, VAL-09 | — | README covers all 5 req-IDs | bash/grep | `grep -q 'DECK-01\|DECK-02\|DECK-03\|DECK-04\|VAL-09' flatpak/README.md` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sideload install on Steam Deck | DECK-01 | Requires physical Steam Deck hardware | Run checklist §1 on Deck: `flatpak install --user RobotController-x86_64.flatpak` |
| Desktop Mode BLE connect + gamepad | DECK-02 | Requires BT24 robot + Deck | Run checklist §2 on Deck: scan, connect, drive F/B/L/R/S |
| Non-Steam Game picker finds .desktop | DECK-03 | Requires Steam Deck Desktop Mode | Run checklist §3: Add Non-Steam Game → find com.ks0555.robotcontroller |
| Gaming Mode launch without black screen | DECK-04 | Requires Steam Deck Gaming Mode | Run checklist §4: switch to Gaming Mode, launch, verify no black screen |
| End-to-end logged session | VAL-09 | Requires full hardware setup | Run checklist §9-10: capture RUST_LOG=debug logs, verify env |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-10

---

## Validation Audit 2026-05-10

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

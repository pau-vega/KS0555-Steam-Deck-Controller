---
phase: 18
slug: fix-stale-docs
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-10
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (v4.x) |
| **Config file** | `apps/frontend/vitest.config.ts` |
| **Quick run command** | `npx vitest run docs.test.ts -t "Phase 18"` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~1 second |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run docs.test.ts -t "Phase 18"`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 1 second

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 18-01-01 | 01 | 1 | STEAM_DECK.md references Flatpak install procedure | — | N/A | integration | `npx vitest run docs.test.ts -t "Phase 18"` | ✅ | green |
| 18-01-01 | 01 | 1 | STEAM_DECK.md reflects current build workflow (deb → flatpak) | — | N/A | integration | `npx vitest run docs.test.ts -t "Phase 18"` | ✅ | green |
| 18-01-01 | 01 | 1 | STEAM_DECK.md has zero stale/forbidden references | — | N/A | integration | `npx vitest run docs.test.ts -t "Phase 18"` | ✅ | green |
| 18-01-01 | 01 | 1 | STEAM_DECK.md has ≥ 60 lines | — | N/A | integration | `npx vitest run docs.test.ts -t "Phase 18"` | ✅ | green |
| 18-01-02 | 01 | 1 | ARCHITECTURE.md describes final CI pipeline (single Flatpak job) | — | N/A | integration | `npx vitest run docs.test.ts -t "Phase 18"` | ✅ | green |
| 18-01-02 | 01 | 1 | ARCHITECTURE.md describes D-Bus gate and sandbox model | — | N/A | integration | `npx vitest run docs.test.ts -t "Phase 18"` | ✅ | green |
| 18-01-02 | 01 | 1 | ARCHITECTURE.md has zero stale/forbidden references | — | N/A | integration | `npx vitest run docs.test.ts -t "Phase 18"` | ✅ | green |
| 18-01-02 | 01 | 1 | ARCHITECTURE.md has ≥ 250 lines | — | N/A | integration | `npx vitest run docs.test.ts -t "Phase 18"` | ✅ | green |
| 18-01-02 | 01 | 1 | ARCHITECTURE.md contains key keywords | — | N/A | integration | `npx vitest run docs.test.ts -t "Phase 18"` | ✅ | green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 1s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

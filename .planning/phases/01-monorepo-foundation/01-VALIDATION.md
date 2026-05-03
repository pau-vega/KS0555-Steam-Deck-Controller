---
phase: 1
slug: monorepo-foundation
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-03
approved: 2026-05-03
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (both frontend and backend) |
| **Config file** | `apps/backend/vitest.config.ts`, `apps/frontend/vitest.config.ts` (Wave 0 creates) |
| **Quick run command** | `vitest run --related src/index.ts` |
| **Full suite command** | `pnpm test` (runs turbo test) |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `vitest run --related {changed_file}`
- **After every plan wave:** Run `pnpm typecheck && pnpm lint && pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-01 | 01 | 1 | MONO-01 | — | N/A | structure | `test -f apps/backend/package.json && test -f apps/frontend/package.json` | ✅ | ✅ green |
| 1-02 | 01 | 1 | MONO-01 | — | N/A | structure | `test -f packages/tsconfig/package.json && test -f packages/eslint-config/package.json` | ✅ | ✅ green |
| 1-03 | 02 | 1 | MONO-02, MONO-04 | — | N/A | integration | `pnpm install --frozen-lockfile` | ✅ | ✅ green |
| 1-04 | 02 | 1 | MONO-03 | — | N/A | typecheck | `pnpm typecheck` | ✅ | ✅ green |
| 1-05 | 03 | 2 | MONO-02, MONO-04 | — | N/A | smoke | `bash smoke-test-dev.sh` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `apps/backend/vitest.config.ts` — stubs for backend tests
- [x] `apps/backend/src/index.test.ts` — hello world test
- [x] `apps/frontend/vitest.config.ts` — stubs for frontend tests  
- [x] `apps/frontend/src/App.test.tsx` — basic render test
- [x] `vitest` dependency added to both apps via pnpm catalog

*All Wave 0 requirements completed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hot reload works | MONO-04 | Requires file watch | Edit a file in apps/frontend/src/, verify Vite HMR triggers |

*Note: `pnpm dev` starts both apps (MONO-02, MONO-04) is now automated via `smoke-test-dev.sh`*

*All other phase behaviors have automated verification.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s (smoke-test-dev.sh completes in ~10s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-03

---

*Validation strategy created: 2026-05-03*

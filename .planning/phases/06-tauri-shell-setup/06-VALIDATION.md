---
phase: 6
slug: tauri-shell-setup
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-06
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.4 (frontend), cargo test (Rust) |
| **Config file** | `apps/frontend/vitest.config.ts`, `apps/frontend/src-tauri/Cargo.toml` |
| **Quick run command** | `cd apps/frontend && npx vitest run src/tauri-frontend.test.ts` |
| **Full suite command** | `cd apps/frontend && npx vitest run` + `cd apps/frontend/src-tauri && cargo test` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/tauri-frontend.test.ts` (frontend) + `cargo test` (Rust)
- **After every plan wave:** Run full suite
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | TAUR-01 | T-6-01 / T-6-02 | Tauri project initialized with proper entrypoint | unit | `cd apps/frontend/src-tauri && cargo test test_taur01_*` | ✅ | ✅ green |
| 06-01-01 | 01 | 1 | TAUR-02 | T-6-02 / T-6-03 | tauri.conf.json configured with correct productName, identifier | unit | `cd apps/frontend/src-tauri && cargo test test_taur02_*` | ✅ | ✅ green |
| 06-01-02 | 01 | 1 | TAUR-03 | T-6-03 | Tauri CLI and API added to package.json with v2.x | unit | `cd apps/frontend && npx vitest run src/tauri-frontend.test.ts` | ✅ | ✅ green |
| 06-01-03 | 01 | 1 | TAUR-05 | T-6-05 | Rust deps (btleplug, gilrs, tokio, serde) in Cargo.toml | unit | `cd apps/frontend/src-tauri && cargo test test_taur05_*` | ✅ | ✅ green |
| 06-02-01 | 02 | 1 | TAUR-04 | T-6-06 / T-6-07 | Vite config has Tauri integration settings | unit | `cd apps/frontend && npx vitest run src/tauri-frontend.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `apps/frontend/src/tauri-frontend.test.ts` — Vitest tests for TAUR-03, TAUR-04
- [x] `apps/frontend/src-tauri/tests/tauri_shell_test.rs` — Rust tests for TAUR-01, TAUR-02, TAUR-05

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `tauri dev` starts without errors | TAUR-01 | Requires Tauri dev server + Vite running together | Run `pnpm --filter @ks0555/frontend tauri dev` and verify no errors |
| `tauri build` creates AppImage | TAUR-02 | Requires Linux/SteamOS environment | Run `pnpm --filter @ks0555/frontend tauri build` on Linux |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-06

---

## Validation Audit 2026-05-06

| Metric | Count |
|--------|-------|
| Gaps found | 5 |
| Resolved | 5 |
| Escalated | 0 |

Tests created:
- `apps/frontend/src/tauri-frontend.test.ts` (7 tests, Vitest)
- `apps/frontend/src-tauri/tests/tauri_shell_test.rs` (10 tests, cargo test)

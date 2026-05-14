---
phase: 3
slug: frontend-react-ui-gamepad-control
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-05
---

# Phase 3 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Browser → Frontend UI | User interacts with React UI; gamepad input crosses here | Gamepad axes/direction (non-sensitive) |
| Frontend → Backend WebSocket | Commands sent to backend via WebSocket connection | Plain-text command strings (F/B/L/R/S) |
| Gamepad → Browser | Steam Deck gamepad input via Gamepad API | Analog axes values (non-sensitive) |
| Test Code → Source | Test files import and exercise source modules | Mock data only — no production data |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-03-01 | Spoofing | Frontend WebSocket connection | accept | Localhost-only MVP — no auth required per PROJECT.md | closed |
| T-03-02 | Tampering | WebSocket message content | mitigate | Backend `isValidCommand()` (backend/src/types.ts:20) validates raw command; frontend sends only valid F/B/L/R/S plain text (app.tsx:17) | closed |
| T-03-03 | Repudiation | Command history | accept | No audit log for MVP — local single-user device | closed |
| T-03-04 | Information Disclosure | WebSocket URL in env | accept | Localhost URL only (`ws://localhost:3001`) — no credentials or sensitive data in VITE_WS_URL | closed |
| T-03-05 | Denial of Service | Rapid gamepad input | mitigate | DEADZONE=0.15 (use-gamepad.ts:5) prevents jitter; direction-change-only send (app.tsx:24 `direction !== prevDirection.current`) | closed |
| T-03-06 | Elevation of Privilege | Frontend code execution | accept | Standard React app in browser sandbox — no special privileges | closed |
| T-03-07 | Spoofing | Gamepad API | accept | Local Steam Deck device only — gamepad ID check implemented but low risk | closed |
| T-03-08 | Tampering | Gamepad input | mitigate | DEADZONE=0.15 (use-gamepad.ts:5) filters small axis movements; 5-direction enum enforced in types.ts | closed |
| T-03-09 | Tampering | WebSocket commands | mitigate | Frontend sends plain text direction strings only — no JSON, no arbitrary data; backend validates with `isValidCommand()` | closed |
| T-03-10 | Information Disclosure | Direction state | accept | Direction letter (F/B/L/R/S) displayed in UI — no sensitive data | closed |
| T-03-11 | Denial of Service | Gamepad rapid input | mitigate | `prevDirection` ref comparison (app.tsx:24) prevents command spam on continuous axis hold | closed |
| T-03-12 | Elevation of Privilege | Gamepad API | accept | Runs in browser sandbox — no OS or hardware privilege escalation possible | closed |
| T-03-13 | Tampering | Test mocks | accept | Mocks exist only in test files — no effect on production code paths | closed |
| T-03-14 | Information Disclosure | Test code | accept | Tests use fake data only — no real credentials, tokens, or PII | closed |
| T-03-15 | Elevation of Privilege | Vitest runner | accept | Standard test framework running in local dev environment — no elevated privileges | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-03-01 | T-03-01 | Localhost-only MVP — WebSocket has no auth. Acceptable for local robot control, not internet-exposed. | gsd-security-auditor | 2026-05-05 |
| AR-03-03 | T-03-03 | No command audit log. Single-user local device, no compliance requirement. | gsd-security-auditor | 2026-05-05 |
| AR-03-04 | T-03-04 | VITE_WS_URL contains only a localhost URL — no secrets. .env file gitignored. | gsd-security-auditor | 2026-05-05 |
| AR-03-06 | T-03-06 | Browser sandbox provides sufficient isolation for this application. | gsd-security-auditor | 2026-05-05 |
| AR-03-07 | T-03-07 | Single local gamepad scenario — spoofing not a realistic threat vector. | gsd-security-auditor | 2026-05-05 |
| AR-03-10 | T-03-10 | Direction state (F/B/L/R/S) is non-sensitive operational data. | gsd-security-auditor | 2026-05-05 |
| AR-03-12 | T-03-12 | Gamepad API runs in browser sandbox with no privilege escalation path. | gsd-security-auditor | 2026-05-05 |
| AR-03-13 | T-03-13 | Test mocks isolated to test environment — no production impact. | gsd-security-auditor | 2026-05-05 |
| AR-03-14 | T-03-14 | Test data is synthetic — no real sensitive data in test suite. | gsd-security-auditor | 2026-05-05 |
| AR-03-15 | T-03-15 | Vitest runs in local dev only — not in production or CI with elevated permissions. | gsd-security-auditor | 2026-05-05 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-05 | 15 | 15 | 0 | gsd-security-auditor |

### Security Audit 2026-05-05

| Metric | Count |
|--------|-------|
| Threats found | 15 |
| Closed | 15 |
| Open | 0 |

**Evidence for mitigated threats:**
- T-03-02: `isValidCommand()` verified at `apps/backend/src/types.ts:20`; plain-text `send(cmd)` at `apps/frontend/src/app.tsx:17`
- T-03-05/11: `DEADZONE = 0.15` at `apps/frontend/src/hooks/use-gamepad.ts:5`; `direction !== prevDirection.current` at `apps/frontend/src/app.tsx:24`
- T-03-08: Deadzone at use-gamepad.ts:5; `Direction` type union restricts to `"F" | "B" | "L" | "R" | "S"` in types.ts
- T-03-09: No `JSON.stringify` in app.tsx; `send(cmd)` passes direction string directly

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-05

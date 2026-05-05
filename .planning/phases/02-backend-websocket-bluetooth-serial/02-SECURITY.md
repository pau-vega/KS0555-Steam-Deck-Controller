---
phase: 2
slug: backend-websocket-bluetooth-serial
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-04
---

# Phase 2 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| WebSocket Client → Backend | Untrusted input from browser/frontend via WebSocket | Command strings (F/B/L/R/S) |
| Backend → Serial Port | Trusted communication to local Bluetooth RFCOMM device (/dev/rfcomm0) | Single-char commands |
| Test → Mock SerialPort | Tests use mocked SerialPort — no real hardware access needed | Test fixtures only |
| Test → Fastify Server | Tests use Fastify's inject() for HTTP testing without actual network | Test payloads |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-2-01 | Tampering | WebSocket message handling | mitigate | `isValidCommand()` whitelist validation (`apps/backend/src/types.ts:20`), rejects non-FBLRS, logs invalid, sends generic error (`apps/backend/src/index.ts:79-82`) | closed |
| T-2-02 | Information Disclosure | WebSocket error messages | mitigate | Generic errors to client: "Invalid command. Use F, B, L, R, or S" (`index.ts:81`), "Serial port not connected" (`index.ts:96`); detailed errors via `console.error` only (`index.ts:33-35`, `index.ts:89`, `index.ts:106`) | closed |
| T-2-03 | Denial of Service | WebSocket connection | accept | Single-user local device (Steam Deck). No auth per SAFE-01. Connection limits not needed for MVP. | closed |
| T-2-04 | Elevation of Privilege | Backend server | accept | No user accounts or privileges. Single-purpose backend for robot control. No auth per PROJECT.md. | closed |
| T-2-05 | Tampering | Test mocking | mitigate | `vi.mock('serialport')` (`apps/backend/src/__tests__/index.test.ts:6`) isolates hardware with realistic async open/close/write behavior | closed |
| T-2-06 | Information Disclosure | Test output | accept | Test output shows command values — acceptable in test environment, not production logs | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-2-01 | T-2-03 | Single-user local device; DoS protections add complexity without MVP benefit | Phase 2 Security Audit | 2026-05-04 |
| R-2-02 | T-2-04 | No multi-user model; backend has no privilege escalation surface | Phase 2 Security Audit | 2026-05-04 |
| R-2-03 | T-2-06 | Test output visibility confined to dev/test environment | Phase 2 Security Audit | 2026-05-04 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-04 | 6 | 6 | 0 | gsd-secure-phase |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-04

---
phase: 9
slug: 09-hook-rewrites
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-06
---

# Phase 9 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Frontend → Tauri IPC | invoke() calls cross the JS→Rust boundary established in Phase 7. All IPC was already configured with Tauri v2 permissions in Phase 6. | Command strings (F/B/L/R/S), connection requests |
| Tauri Event → Frontend | listen() receives events emitted by Rust backend (Phase 7/8). Read-only data flow — events carry state payloads only. | State enums (connecting/connected/disconnected), device name strings |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-09-01 | Spoofing | invoke('ble_connect') | accept | Tauri IPC is local-only (no network). The invoke call is the same mechanism regardless of caller — frontend is the only caller. No authentication needed for local device. | closed |
| T-09-02 | Tampering | send() command string | mitigate | Rust backend (ble_send) validates command length is exactly 1 char (mod.rs:152-155). TypeScript type Direction restricts to F/B/L/R/S at compile time. BT24 device name and service UUID verified before write. | closed |
| T-09-03 | Information Disclosure | ble-state-changed payload | accept | Payload is a plain string enum ('connecting'/'connected'/'disconnected'). No PII, credentials, or sensitive data. | closed |
| T-09-04 | Denial of Service | Stale listener after unmount | mitigate | useEffect cleanup calls all UnlistenFn in unlistenersRef (use-bluetooth.ts:39-42). Cancelled flag prevents state updates during async setup (line 30). | closed |
| T-09-05 | Tampering | gamepad-direction payload | mitigate | TypeScript type constraint: `listen<{ direction: Direction }>` forces payload shape at compile time. Direction enum limited to F/B/L/R/S (types.ts:1). | closed |
| T-09-06 | Information Disclosure | gamepad-connected/disconnected payload | accept | Payload contains only `{ name: string }` — gamepad device name (e.g., "Steam Deck Controller"). No PII or sensitive data. | closed |
| T-09-07 | Denial of Service | Stale listeners after unmount | mitigate | useEffect cleanup calls all 3 UnlistenFn in unlistenersRef (use-gamepad.ts:37-41). Cancelled flag prevents state updates during async listener setup (lines 16, 22, 29). | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-09-01 | T-09-01 | Tauri IPC is local-only — no network-attack surface. Frontend is the only caller. No authentication needed for local device BLE. | Phase 9 design | 2026-05-06 |
| R-09-03 | T-09-03 | ble-state-changed payload is a plain string enum with no PII, credentials, or sensitive data. | Phase 9 design | 2026-05-06 |
| R-09-06 | T-09-06 | gamepad-connected/disconnected payload contains only device name string. No PII or sensitive data. | Phase 9 design | 2026-05-06 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-06 | 7 | 7 | 0 | opencode gsd-security-auditor |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-06

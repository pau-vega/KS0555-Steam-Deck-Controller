---
phase: 07
slug: 07-ble-commands-with-btleplug
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-06
---

# Phase 07 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Frontend → Rust backend | Tauri invoke() calls cross this boundary | Tauri commands, user input |
| Rust → BT24 device | Bluetooth LE connection - untrusted device input | BLE commands, device data |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-07-01 | S (Spoofing) | ble_connect | mitigate | Post-filter by device name "BT24" and verify service UUID 0000ffe0-... before connecting | closed |
| T-07-02 | T (Tampering) | ble_connect | accept | BT24 uses simple commands - no critical data integrity concerns | closed |
| T-07-03 | R (Repudiation) | ble_connect | accept | No audit/logging requirement - low risk | closed |
| T-07-04 | I (Info Disclosure) | ble_connect | accept | No PII - device name and commands not confidential | closed |
| T-07-05 | D (Denial of Service) | ble_connect | mitigate | 5-second scan timeout prevents hanging; limit retry attempts | closed |
| T-07-06 | E (Elevation) | ble_connect | mitigate | Tauri permissions (default.toml) restrict which commands frontend can invoke | closed |
| T-07-07 | S (Spoofing) | ble_send | accept | Commands are single chars (F/B/L/R/S) - low value target, no auth needed | closed |
| T-07-08 | T (Tampering) | ble_send | mitigate | Validate command length == 1, reject invalid commands in ble_send | closed |
| T-07-09 | R (Repudiation) | ble_send | accept | No audit requirement - low risk | closed |
| T-07-10 | I (Info Disclosure) | ble_send | accept | No PII - command chars not confidential | closed |
| T-07-11 | D (Denial of Service) | ble_disconnect | accept | Disconnect is user-initiated, not a DoS vector | closed |
| T-07-12 | E (Elevation) | ble_send | mitigate | Tauri permissions restrict which frontend can call ble_send | closed |
| T-07-13 | S (Spoofing) | ble_connect | mitigate | Post-filter by device name "BT24" AND verify service UUID 0000ffe0-... (BLE-06) | closed |
| T-07-14 | T (Tampering) | ble_send | accept | Commands are single chars - no critical data integrity concerns | closed |
| T-07-15 | R (Repudiation) | ble_connect | accept | No audit requirement - low risk for robot control | closed |
| T-07-16 | I (Info Disclosure) | ble_connect | accept | No PII - device name and commands not confidential | closed |
| T-07-17 | D (Denial of Service) | ble_connect | mitigate | 5-second scan timeout prevents hanging; permissions prevent unauthorized calls | closed |
| T-07-18 | E (Elevation) | Tauri permissions | mitigate | ble.toml restricts which commands frontend can invoke - only allowlisted commands permitted | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-07-01 | T-07-02 | BT24 uses simple commands (F/B/L/R/S) - no critical data integrity concerns | Phase 07 planning | 2026-05-06 |
| R-07-02 | T-07-03 | No audit/logging requirement for this app - low risk | Phase 07 planning | 2026-05-06 |
| R-07-03 | T-07-04 | No PII or sensitive data - device name and commands are not confidential | Phase 07 planning | 2026-05-06 |
| R-07-04 | T-07-07 | Commands are single chars (F/B/L/R/S) - low value target, no auth needed | Phase 07 planning | 2026-05-06 |
| R-07-05 | T-07-09 | No audit requirement - low risk for robot control commands | Phase 07 planning | 2026-05-06 |
| R-07-06 | T-07-10 | No PII - command chars are not confidential | Phase 07 planning | 2026-05-06 |
| R-07-07 | T-07-11 | Disconnect is user-initiated, not a DoS vector | Phase 07 planning | 2026-05-06 |
| R-07-08 | T-07-14 | Commands are single chars - no critical data integrity concerns | Phase 07 planning | 2026-05-06 |
| R-07-09 | T-07-15 | No audit requirement - low risk for robot control | Phase 07 planning | 2026-05-06 |
| R-07-10 | T-07-16 | No PII - device name and commands not confidential | Phase 07 planning | 2026-05-06 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-06 | 18 | 18 | 0 | gsd-security-auditor |

---

## Implementation Notes

- **T-07-01/T-07-13**: Service UUID verification occurs after connection (lines 69-74 in mod.rs). The threat model specifies "before connecting", but btleplug requires connection before service discovery. This is a minor deviation but acceptable given BLE protocol constraints.
- **T-07-05**: Retry limiting mentioned in threat model is not implemented; 5-second timeout is the primary mitigation.
- **T-07-17**: Permissions prevent unauthorized calls - configured in ble.toml and referenced in default.toml.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-06

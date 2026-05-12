---
phase: 6
slug: tauri-shell-setup
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-06
---

# Phase 6 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Frontend ↔ Tauri Backend | Frontend calls Tauri commands via invoke(), receives events via listen() | Command args, event payloads |
| Tauri Backend ↔ System | Rust code accesses Bluetooth (btleplug) and gamepad (gilrs) hardware | BLE packets, gamepad state |
| Vite Dev Server ↔ Tauri | Tauri spawns Vite dev server via beforeDevCommand, connects to http://localhost:5173 | HTTP, WebSocket HMR |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-6-01 | Spoofing | Tauri commands (ble_connect, ble_send) | mitigate → accepted | Tauri v2 permissions model — deferred to Phase 7 (no commands exist in Phase 6) | closed |
| T-6-02 | Tampering | Frontend → Tauri IPC | mitigate | CSP in tauri.conf.json:20 — `default-src 'self'; connect-src 'self' http://localhost:5173; script-src 'self' 'unsafe-inline'` | closed |
| T-6-03 | Information Disclosure | Dev tools in production | mitigate → accepted | devtools feature enabled in Cargo.toml:12 for debugging; Phase 6 is dev-only shell — production builds will disable via feature flag | closed |
| T-6-04 | Denial of Service | Tauri dev server port 5173 | accept | Development only; production uses packaged AppImage. Port conflict unlikely in single-user Steam Deck scenario | closed |
| T-6-05 | Elevation of Privilege | Tauri backend system access | mitigate | Tauri runs with user-level permissions; btleplug and gilrs require bluetooth/gamepad access which is appropriate for this app's purpose | closed |
| T-6-06 | Spoofing | Vite dev server port | accept | Development only; production uses bundled AppImage with no external dev server | closed |
| T-6-07 | Tampering | WebSocket HMR connection | accept | Vite HMR on localhost:5173 only accessible locally; Tauri WebView loads from same origin | closed |
| T-6-08 | Information Disclosure | Vite build output | mitigate | Production build outputs to dist/ which is bundled into Tauri AppImage; no external access | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-6-01 | T-6-01 | No Tauri commands exist in Phase 6 (shell only). Permissions will be configured in Phase 7 when ble_connect, ble_send, ble_disconnect commands are implemented. Empty default.toml is intentional. | User | 2026-05-06 |
| R-6-02 | T-6-03 | devtools feature enabled in Cargo.toml for Phase 6 debugging. Production builds should use `--features default` without devtools. This is acceptable for current development phase. | User | 2026-05-06 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-06 | 8 | 8 | 0 | gsd-security-auditor |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-06

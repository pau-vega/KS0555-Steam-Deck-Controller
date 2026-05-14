---
phase: 01-monorepo-foundation
slug: monorepo-foundation
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-03
---

# Phase 1 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| client→backend | HTTP requests to Fastify server (port 3001) | API requests |
| client→frontend | Browser to Vite dev server (port 5173) | Frontend assets |
| N/A | Configuration files only - no runtime trust boundaries | N/A |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-01-01 | Tampering | packages/* configuration files | accept | Configuration files are committed to git, changes reviewed via PR process | closed |
| T-01-02 | Information Disclosure | tsconfig.json settings | accept | No sensitive data in TypeScript configs, strict mode enabled for security | closed |
| T-01-03 | Spoofing | Fastify server | accept | Local development server only, no auth required for MVP | closed |
| T-01-04 | Tampering | HTTP requests | accept | JSON schema validation deferred to Phase 2 when WebSocket implemented | closed |
| T-01-05 | Information Disclosure | Fastify logger | accept | Logger enabled for development, disable in production via env var | closed |
| T-01-06 | Denial of Service | Fastify server | accept | No rate limiting for MVP, single-user local device | closed |
| T-01-07 | Elevation of Privilege | N/A | accept | No auth system for MVP, local device only | closed |
| T-01-08 | Spoofing | Frontend dev server | accept | Local development only, no auth needed for MVP | closed |
| T-01-09 | Tampering | Vite HMR websocket | accept | Localhost only, no security risk for development | closed |
| T-01-10 | Information Disclosure | Source maps | accept | Dev only, source maps help debugging | closed |
| T-01-11 | Denial of Service | Vite dev server | accept | Single-user local device, no DoS risk | closed |
| T-01-12 | Elevation of Privilege | N/A | accept | No auth system for MVP | closed |
| T-01-13 | Tampering | turbo.json | accept | Configuration file committed to git | closed |
| T-01-14 | Tampering | pnpm-lock.yaml | accept | Lockfile ensures reproducible builds | closed |
| T-01-15 | Information Disclosure | package.json versions | accept | No secrets in package.json | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-01-01 | T-01-01 | Configuration files committed to git with PR review | automated | 2026-05-03 |
| R-01-02 | T-01-02 | No sensitive data in TypeScript configs | automated | 2026-05-03 |
| R-01-03 | T-01-03 | Local development server only | automated | 2026-05-03 |
| R-01-04 | T-01-04 | JSON schema validation deferred to Phase 2 | automated | 2026-05-03 |
| R-01-05 | T-01-05 | Logger for development, env var for production | automated | 2026-05-03 |
| R-01-06 | T-01-06 | Single-user local device | automated | 2026-05-03 |
| R-01-07 | T-01-07 | No auth for MVP, local device only | automated | 2026-05-03 |
| R-01-08 | T-01-08 | Local development only | automated | 2026-05-03 |
| R-01-09 | T-01-09 | Localhost only, no security risk | automated | 2026-05-03 |
| R-01-10 | T-01-10 | Dev only, helps debugging | automated | 2026-05-03 |
| R-01-11 | T-01-11 | Single-user local device | automated | 2026-05-03 |
| R-01-12 | T-01-12 | No auth system for MVP | automated | 2026-05-03 |
| R-01-13 | T-01-13 | Configuration file committed to git | automated | 2026-05-03 |
| R-01-14 | T-01-14 | Lockfile ensures reproducible builds | automated | 2026-05-03 |
| R-01-15 | T-01-15 | No secrets in package.json | automated | 2026-05-03 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-03 | 15 | 15 | 0 | automated |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-03

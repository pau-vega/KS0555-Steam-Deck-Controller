---
phase: 19
slug: 19-execute-deb-flatpak-runner
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-12
---

# Phase 19 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Local dev machine → GitHub Actions | Untrusted CI runner executes pipeline commands | CI config + build commands (low sensitivity) |
| CI output → developer machine | Downloaded artifacts cross network boundary | Build artifacts — .deb + .flatpak (low sensitivity) |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-19-01 | S (Spoofing) | Uploaded artifact naming | accept | Artifact names derived from VERSION env var set by `cargo metadata` — same source as release tag | closed |
| T-19-02 | T (Tampering) | Artifact download over HTTPS | accept | GitHub Actions artifacts served over HTTPS; SHA256 checksum validates integrity after download | closed |
| T-19-03 | I (Info Disclosure) | CI log contains .deb content paths | accept | `dpkg -c` output is public — no sensitive data in .deb internal paths | closed |
| T-19-04 | E (Elevation) | upload-artifact@v4 permissions | accept | artifact upload uses GITHUB_TOKEN with `contents: write` — same permission level as existing release upload step | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-19-01 | T-19-01 | VERSION sourced from `cargo metadata` — same source used for release tagging. No separate naming authority to spoof. | gsd-secure-phase | 2026-05-12 |
| R-19-02 | T-19-02 | HTTPS transport + SHA256 checksum validation provides integrity. Mitigation cost exceeds risk for CI artifacts. | gsd-secure-phase | 2026-05-12 |
| R-19-03 | T-19-03 | `.deb` contains only application binaries, desktop file, and icons — no credentials, keys, or user data. | gsd-secure-phase | 2026-05-12 |
| R-19-04 | T-19-04 | `contents: write` is the minimum permission for artifact upload. Already granted for existing release upload. No elevation path identified. | gsd-secure-phase | 2026-05-12 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-12 | 4 | 4 | 0 | gsd-secure-phase |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-12

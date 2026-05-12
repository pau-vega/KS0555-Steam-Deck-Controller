---
gsd_state_version: 1.0
milestone: v2.1
milestone_name: — Flatpak Packaging
status: active
stopped_at: Phase 18 complete; ready for Phase 19
last_updated: "2026-05-11T08:00:00.000Z"
last_activity: 2026-05-12 -- Completed quick task 260512-003: Justfile best practices for monorepo
progress:
  total_phases: 14
  completed_phases: 12
  total_plans: 27
  completed_plans: 26
  percent: 96
---

# STATE.md

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-09)

**Core value:** Control a real robot from Steam Deck gamepad input with low latency — commands must reach the robot reliably and quickly.
**Current focus:** Phase 19 — Execute Deb Build + Flatpak Runner

## Current Position

Phase: 19 — Execute Deb Build + Flatpak Runner
Plan: 19-01-PLAN.md — CI validation with artifact upload
Status: Planned (ready to execute)
Last activity: 2026-05-12 -- Completed quick task 260512-002: Setup release-please and reset to 0.0.1

## Progress

**Total roadmap (v2.0 + v2.1):** 13 phases
**v2.0 complete:** Phases 6-10 (5/5)
**v2.1 active:** Phases 11-19 (8/9)

| Phase | Status |
|-------|--------|
| 6. Tauri Shell Setup | Complete |
| 7. BLE Commands with btleplug | Complete |
| 8. Gamepad Monitoring with gilrs | Complete |
| 9. Hook Rewrites | Complete |
| 10. Build and Test on SteamOS | Complete |
| 11. Bundle Pipeline Restructure | Complete |
| 12. Manifest + AppStream + Local Build | Complete |
| 13. Sandbox Permissions for BLE + Gamepad | Complete |
| 14. Steam Deck On-Device Validation | Complete ✓ |
| 15. CI Migration (Parallel-Run) | Complete ✓ |
| 16. AppImage Decommission + Upgrade Workflow Docs | Complete ✓ |
| 17. Close Verification Gaps | Complete |
| 18. Fix Stale Docs | Complete ✓ |
| 19. Execute Deb Build + Flatpak Runner | Planned |

Plans: 26/26 complete (12 v2.0 + 7 v2.1 + 2/2 Phase 15 + 3/3 Phase 16 + 1/1 Phase 18). Phase 19: not planned yet.

## Decisions Made

(carried from v2.0 — see PROJECT.md Key Decisions table)

**v2.1 decisions (validated in completed phases):**

- **Flatpak runtime choice (PKG-04):** Resolved in Phase 11 — `org.freedesktop.Platform//24.08` with SDK `org.freedesktop.Sdk//24.08` and extension `org.freedesktop.Platform.GL.default`. Committed to PROJECT.md Key Decisions.
- **Auto-update reframed (DECK-05 / DOCS-01):** PROJECT.md "Active" requirement amended to "Manual upgrade workflow (`flatpak install --user --reinstall`) documented; optional GitHub Releases polling launcher script". True `flatpak update` deferred to v2.2+ (`FLAT-PUB-01`).
- **D-01 (Phase 13):** Belt-and-suspenders Flatpak detection via FLATPAK_ID + /.flatpak-info
- **D-02 (Phase 13):** Entire D-Bus rewrite block gated behind !in_flatpak()
- **D-03 (Phase 13):** WEBKIT_DISABLE_COMPOSITING_MODE set_var remains unconditional
- **D-05 (Phase 13):** Anti-feature checklist placed as comment block at top of manifest
- **D-16 (Phase 16 / Plan 03):** `upgrade-robot-controller.sh` at repo root, zero dependencies beyond `curl` + `jq`
- **D-17 (Phase 16 / Plan 03):** Dual-purpose script: fresh install if Flatpak not installed, upgrade check if installed
- **D-24 (Phase 16 / Plan 03):** `flatpak-build` justfile recipe runs `flatpak-builder` directly, does NOT wrap `flatpak/build.sh`
- **D-27 (Phase 16 / Plan 03):** `flatpak-deploy` uses `scp` for transfer only, no remote install
- **D-01 (Phase 16 / Plan 01):** Remove `build-x64` job, rename `build-flatpak-x64` to `build` (single self-contained job)
- **D-02 (Phase 16 / Plan 01):** VAL-08 `git diff --exit-code` dropped from CI (pre-commit hooks enforce it)
- **D-04 (Phase 16 / Plan 01):** Version from Cargo.toml via `cargo metadata` + `jq`, not `github.ref_name`
- **D-05 (Phase 16 / Plan 01):** Remove `cancel-in-progress` from concurrency
- **D-06 (Phase 16 / Plan 01):** Deb built and consumed inline, no upload/download artifact
- **D-08 (Phase 16 / Plan 01):** Delete `install-on-steamdeck.sh`, remove all references from docs
- **D-09 (Phase 16 / Plan 01):** Full cleanup of all AppImage references in codebase
- **D-10 (Phase 16 / Plan 01):** Add `~/.pnpm-store` cache with `actions/cache@v4`
- **D-11 (Phase 16 / Plan 01):** Job-level `contents: write` for release upload step only
- **D-20 (Phase 16 / Plan 02):** ARCHITECTURE.md covers build chain, sandbox model, D-Bus gate, event pipeline, monorepo layout
- **D-21 (Phase 16 / Plan 02):** flatpak/README.md updated with finish-args rationale, anti-feature checklist, D-Bus gate explanation
- **D-22 (Phase 16 / Plan 02):** Root README install section rewritten for Flatpak, zero AppImage references

## Accumulated Context

### v2.0 Recap (Validated)

- Phases 1-10 shipped: monorepo, backend (deprecated), React UI, TS hardening, ESLint TS conversion, Tauri shell, BLE via btleplug, gamepad via gilrs, hook rewrites, SteamOS build/test
- CI now single Flatpak-only job — AppImage removed, install-on-steamdeck.sh deleted
- 43+ tests passing, app.tsx untouched
- Recent quick tasks: Tauri v2 best practices (lib.rs extraction), Steam Deck WEBKIT_DISABLE_COMPOSITING_MODE, Mac dev support, doc updates

### v2.1 Goals & Phase Map

- Phase 11: ✓ switch `bundle.targets` to `["deb"]`; drop custom tauri-cli fork; pick runtime (complete)
- Phase 12: write `flatpak/` directory (manifest + metainfo + build.sh); first local `flatpak run` opens window
- Phase 13: ✓ sandbox finish-args for BLE D-Bus + evdev gamepad; `lib.rs` `!in_flatpak` gate (complete)
- Phase 14: real-Deck validation in Desktop + Gaming Mode
- Phase 15: ✓ CI parallel-run (Flatpak + AppImage shipped together for one transition release)
- Phase 16: ✓ AppImage decommission + upgrade workflow docs (all plans complete)
- Phase 17: Close verification gaps — VERIFICATION.md for Phases 13, 15, 16
- Phase 18: Fix stale docs — STEAM_DECK.md and ARCHITECTURE.md are out of date
- Phase 19: Execute PKG-03 deb build and VAL-05 flatpak-builder on CI runner

### Critical Risks (from research/PITFALLS.md)

- BLE silently fails without `--system-talk-name=org.bluez` (Pitfall #2) — ✓ Resolved Phase 13 (manifest args + in_flatpak gate)
- `lib.rs` D-Bus rewrite incompatible with Flatpak (Pitfall #13) — ✓ Resolved Phase 13 (in_flatpak gate)
- `--device=input` requires Flatpak ≥ 1.15.6 — empirical test on real Deck (Pitfall #4) — Phase 14
- Sideload bundles do NOT auto-update (Pitfall #7) — resolve in Phase 16 docs
- Removing AppImage in same PR as Flatpak adoption — keep parallel-run for ≥1 release (Pitfall #11) — Phase 15 → 16 split

### Roadmap Evolution

- Phase 17 added: Close verification gaps — VERIFICATION.md for Phases 13, 15, 16
- Phase 18 added: Fix stale docs — STEAM_DECK.md and ARCHITECTURE.md
- Phase 19 added: Execute PKG-03 deb build and VAL-05 flatpak-builder on CI runner

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260512-002 | Setup release-please and reset to 0.0.1 | 2026-05-12 | 6e5f21be | [260512-002-setup-release-please](./quick/260512-002-setup-release-please/) |
| 260512-003 | Justfile best practices for monorepo | 2026-05-12 | uncommitted | [260512-003-justfile-best-practices](./quick/260512-003-justfile-best-practices/) |
| 260512-001 | Add metadata to the flatpak package | 2026-05-12 | 7e05fedf | [260512-001-add-flatpak-metadata](./quick/260512-001-add-flatpak-metadata/) |
| 260511-001 | Fix D-pad not working in gaming mode | 2026-05-11 | 51ea36da | [260511-001-fix-dpad-gaming-mode](./quick/260511-001-fix-dpad-gaming-mode/) |
| 260510-001 | Docker-based flatpak local build | 2026-05-10 | b7a8438e | [260510-001-docker-flatpak-local-build](./quick/260510-001-docker-flatpak-local-build/) |

## Session Continuity

Last session: 2026-05-10T08:43:51.000Z
Stopped at: Phase 16 plan 1 complete — CI decommission + docs cleanup done
Resume file: None
Next action: Plan Phase 18 — /gsd-plan-phase 18

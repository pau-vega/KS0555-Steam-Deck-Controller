# Phase 10: Build and Test on SteamOS - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-06
**Phase:** 10-Build and Test on SteamOS
**Areas discussed:** Build approach, Hardware testing, Validation depth, SteamOS setup

---

## Build Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Docker cross-compile | Use tauri-action in a Docker container or Linux image. Reproducible, no Steam Deck needed. | ✓ |
| Native Steam Deck build | Clone on Deck, build there. Reliable but needs Deck access + Rust toolchain setup. | |
| Linux VM + local build | Lima/UTM on macOS. Familiar but VM overhead. | |

**User's choice:** Docker cross-compile via tauri-action
**Notes:** Build trigger on tag push (`v*`) + manual dispatch. Not on every push.

## Hardware Testing

| Option | Description | Selected |
|--------|-------------|----------|
| CI tests + hardware validation plan | Mock-reliant CI tests for structural validation + documented manual test procedure for actual Deck | ✓ |
| Hardware-gated | Don't mark done until real Deck runs it | |
| Full mock suite | Validate everything through mocks, no hardware needed | |

**User's choice:** CI tests + hardware validation plan
**Notes:** Inline test procedure in plan (not standalone doc). Phase passes CI without hardware.

## Validation Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Pragmatic pass | Build succeeds, mocked event flow tests pass, git diff checks app.tsx. Good enough to ship. | ✓ |
| Strict pass | All VAL items + hardware-verified signoff | |
| CI-only pass | Build succeeds + git diff only, event flow by doc only | |

**User's choice:** Pragmatic pass
**Notes:** Rust `#[cfg(test)]` integration tests for VAL-02/VAL-03 event pipeline. Not frontend hook tests.

## SteamOS Setup

| Option | Description | Selected |
|--------|-------------|----------|
| Read-only fs + Bluetooth perms | Focus on AppImage from ~/, Bluetooth daemon, bluez perms | ✓ |
| Full SteamOS dev env doc | Dev mode, pacman, Wayland, gamemode — comprehensive | |
| Minimal — AppImage covers all | Assume self-contained, no config needed | |

**User's choice:** Read-only fs + Bluetooth perms
**Notes:** Add proper icon and desktop metadata. Replace Phase 6 placeholder.

---

## the agent's Discretion

- Rust integration test structure (inline vs tests/ dir)
- Icon sourcing (agent generates or finds appropriate 256x256 PNG)
- Mock detail level in tests

## Deferred Ideas

None — discussion stayed within Phase 10 scope.

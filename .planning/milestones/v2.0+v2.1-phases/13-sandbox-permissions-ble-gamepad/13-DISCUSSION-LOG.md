# Phase 13: Sandbox Permissions for BLE + Gamepad - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-09
**Phase:** 13-Sandbox Permissions for BLE + Gamepad
**Areas discussed:** Flatpak detection method, Environment var gating scope, Validation strategy

---

## Flatpak Detection Method

| Option | Description | Selected |
|--------|-------------|----------|
| FLATPAK_ID env var | Check `FLATPAK_ID` env var — set by the Flatpak runtime when the app launches inside the sandbox. Lighter touch, no filesystem requirement. | |
| /.flatpak-info file | Check `/.flatpak-info` file exists — canonical Flatpak detection method used in docs and examples. More explicit than env var. | |
| Both | Both — belt-and-suspenders like the WEBKIT_DISABLE_COMPOSITING_MODE pattern. Check FLATPAK_ID first, fall back to /.flatpak-info. | ✓ |

**User's choice:** Both (Recommended)
**Notes:** Same belt-and-suspenders pattern used for WEBKIT_DISABLE_COMPOSITING_MODE (Phase 12 D-05).

### Gate Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Gate entire block | Wrap the entire D-Bus block (env var check + socket probe + set_var) in `if !in_flatpak`. Inside Flatpak, the runtime's proxy handles everything. | ✓ |
| Gate set_var only | Only gate the set_var call. Still check DBUS_SYSTEM_BUS_ADDRESS but don't overwrite it inside Flatpak. | |
| Gate D-Bus + Gamescope | Gate the entire D-Bus block AND the WEBKIT_DISABLE_COMPOSITING_MODE set_var (manifest handles it inside Flatpak). | |

**User's choice:** Gate entire block (Recommended)
**Notes:** The entire D-Bus logic block (env var check → socket probe → set_var) is skipped inside Flatpak. A comment explains why.

---

## Environment Var Gating Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Leave it | Keep the Rust set_var running everywhere. Inside Flatpak it's a harmless no-op (same value already set). Outside Flatpak it's still needed. | ✓ |
| Gate it too | Gate it alongside the D-Bus block using the same in_flatpak check. More explicit about what's Flatpak-specific, but adds a second gate to maintain. | |

**User's choice:** Leave it (Recommended)
**Notes:** WEBKIT_DISABLE_COMPOSITING_MODE set_var stays ungated. The manifest already sets it for Flatpak; Rust set_var is a harmless no-op inside the sandbox and still needed for native/dev.

---

## Validation Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Manual checklist only | Write a VALIDATION.md or manifest checklist comment with step-by-step manual commands. Straightforward, no false positives. | ✓ |
| Manual + automated smoke | Manual checklist PLUS automated Rust smoke tests that check for runtime conditions and skip gracefully with 'no hardware' when absent. | |

**User's choice:** Manual checklist only
**Notes:** VAL-06 and VAL-07 both require real hardware (BT24 robot + gamepad). No automated tests needed.

### Anti-Feature Checklist Location (SBX-06)

| Option | Description | Selected |
|--------|-------------|----------|
| Comment in manifest | The manifest itself gets a comment block listing the anti-features that must NOT be present. Self-documenting, always visible to reviewers. | ✓ |
| Separate checklist file | Separate document in flatpak/ or .planning/ with the checklist. Keeps manifest clean. | |
| Both | Both — comment in manifest for reviewers + mention in flatpak/README.md for contributors. | |

**User's choice:** Comment in manifest (Recommended)
**Notes:** Anti-feature checklist goes as a YAML comment block at the top of `flatpak/com.ks0555.robotcontroller.yaml`.

---

## the agent's Discretion

- Exact `in_flatpak()` implementation (order of checks, logging).
- Comment wording and placement within `lib.rs` and the manifest.
- Exact anti-feature checklist wording in the manifest comment.
- Whether to add `eprintln!` or `log::debug!` when skipping the D-Bus block inside Flatpak.

## Deferred Ideas

None — discussion stayed within Phase 13 scope.

# Phase 13: Sandbox Permissions for BLE + Gamepad - Context

**Gathered:** 2026-05-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Add Flatpak sandbox finish-args to the manifest for BLE (`--system-talk-name=org.bluez`, `--allow=bluetooth`, `--share=network`) and gamepad (`--device=input` with `--device=all` fallback comment). Gate the existing `lib.rs` D-Bus socket rewrite on `!in_flatpak` so btleplug uses the Flatpak runtime's system-bus proxy instead of an overwritten (broken) socket path. Verify the manifest contains no anti-features via a comment checklist. No application code logic changes — pure infrastructure.
</domain>

<decisions>
## Implementation Decisions

### Flatpak Detection
- **D-01:** Use both `FLATPAK_ID` env var AND `/.flatpak-info` file — belt-and-suspenders (same pattern as WEBKIT_DISABLE_COMPOSITING_MODE). Check `FLATPAK_ID` first (lighter touch), fall back to `/.flatpak-info` (canonical Flatpak method). A single `fn in_flatpak() -> bool` helper supports this.

### D-Bus Gate Scope
- **D-02:** Gate the entire D-Bus block (the `DBUS_SYSTEM_BUS_ADDRESS` env var check + `/run/host/run/dbus/system_bus_socket` probe + `set_var`) behind `!in_flatpak`. Inside Flatpak, the runtime already proxies the system bus at the correct address in `DBUS_SYSTEM_BUS_ADDRESS` — overwriting it with `/run/host/run/dbus/` (which doesn't exist in the sandbox) breaks BLE. Add a comment in the gated block explaining why it's skipped.

### Environment Variables
- **D-03:** Leave the Rust `std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1")` in `lib.rs` running everywhere. Inside Flatpak it's a harmless no-op (the manifest already sets the same value via `--env=` — Phase 12 D-05). Outside Flatpak (native `cargo tauri dev`, host-side debugging) it's still needed for Steam Deck Gaming Mode.

### Validation
- **D-04:** VAL-06 (BLE through sandbox) and VAL-07 (gamepad through sandbox) verified via manual hardware checklist only — no automated tests. These require real BT24 robot and gamepad hardware that can't run in CI.
- **D-05:** SBX-06 anti-feature review checklist placed as a comment block at the top of the Flatpak manifest (`flatpak/com.ks0555.robotcontroller.yaml`). Lists each forbidden finish-arg with a "why it's wrong" explanation. Self-documenting, always visible to manifest reviewers.

### the agent's Discretion
- Exact `in_flatpak()` implementation (order of checks, logging).
- Comment wording and placement within `lib.rs` and the manifest.
- Exact anti-feature checklist wording in the manifest comment.
- Whether to add `eprintln!` or `log::debug!` when skipping the D-Bus block inside Flatpak.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Phase Goal
- `.planning/REQUIREMENTS.md` — SBX-01 through SBX-06 (sandbox finish-args + anti-feature verification), VAL-06 (BLE sandbox verification), VAL-07 (gamepad sandbox verification)
- `.planning/ROADMAP.md` § Phase 13 — Goal, 5 success criteria, dependencies (Phase 12)

### Prior Phase Context (locked decisions)
- `.planning/phases/12-manifest-appstream-local-build/12-CONTEXT.md` — D-01 (display finish-args already in manifest), D-05 (WEBKIT_DISABLE_COMPOSITING_MODE belt-and-suspenders already in manifest), canonical refs for Flatpak manifest schema
- `.planning/phases/11-bundle-pipeline-restructure/11-CONTEXT.md` — D-07, D-08 (Flatpak runtime `org.freedesktop.Platform//24.08` locked)

### Source Files That Change
- `apps/frontend/src-tauri/src/lib.rs` — D-Bus rewrite (lines 12-20) and WEBKIT set_var (line 24). Only the D-Bus block gets gated; WEBKIT set_var stays ungated.
- `flatpak/com.ks0555.robotcontroller.yaml` — Add BLE finish-args (SBX-01), gamepad finish-args (SBX-02), anti-feature review checklist comment (SBX-06).

### Source Files Referenced (Read-Only)
- `apps/frontend/src-tauri/src/ble/mod.rs` — btleplug uses D-Bus system bus for BlueZ; no changes needed.
- `apps/frontend/src-tauri/src/gamepad/mod.rs` — gilrs reads from `/dev/input/event*`; no changes needed.
- `apps/frontend/src-tauri/tauri.conf.json` — Identifier `com.ks0555.robotcontroller`, version `0.1.5`.

### Code That Must Not Change
- `apps/frontend/src/app.tsx` — VAL-08 app.tsx lock holds across v2.1
- `apps/frontend/src/components/control-pad.tsx` — Locked
- `apps/frontend/src/components/status-bar.tsx` — Locked
- `apps/frontend/src-tauri/src/ble/mod.rs` — No BLE logic changes
- `apps/frontend/src-tauri/src/gamepad/mod.rs` — No gamepad logic changes

### Research & Pitfalls
- `.planning/research/PITFALLS.md` — Pitfall 2 (missing `--system-talk-name=org.bluez` causes silent BLE failure), Pitfall 13 (lib.rs D-Bus rewrite incompatible with Flatpak proxy)
- `.planning/PROJECT.md` § Key Decisions — Flatpak runtime, sideload-only distribution, target platform

### External Specifications
- [Flatpak Sandbox Permissions Reference](https://docs.flatpak.org/en/latest/sandbox-permissions-reference.html) — `--system-talk-name`, `--device=input`, `--allow=bluetooth`, `--socket`, `--env`
- [Flatpak D-Bus Proxy](https://docs.flatpak.org/en/latest/dbus-proxy.html) — How Flatpak proxies the system bus; why `--system-talk-name=org.bluez` works
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/frontend/src-tauri/src/lib.rs:12-20` — Existing D-Bus rewrite code to gate. Currently probes `/run/host/run/dbus/system_bus_socket` unconditionally.
- `apps/frontend/src-tauri/src/lib.rs:24` — Existing WEBKIT_DISABLE_COMPOSITING_MODE set_var. Stays ungated per D-03.
- `flatpak/com.ks0555.robotcontroller.yaml:9-13` — Display finish-args and WEBKIT env var already in manifest. New BLE/gamepad args get appended to this list.

### Established Patterns
- Belt-and-suspenders: Phase 12 set WEBKIT_DISABLE_COMPOSITING_MODE in both manifest and Rust code. Same pattern applied to Flatpak detection (D-01: both FLATPAK_ID + /.flatpak-info).
- Gating: D-Bus block gets a single `if !in_flatpak() { ... }` wrapper — same style as existing `if std::env::var(...).is_err()` guard.
- Manifest comments: The manifest already has no comments. The anti-feature checklist (D-05) will be the first comment block, placed at the top before `id:`.

### Integration Points
- `lib.rs` is the single Rust file that changes. The `in_flatpak()` helper can be a private function in `lib.rs` or a `pub(crate)` function if needed elsewhere.
- The Flatpak manifest `finish-args` list gets 4 new entries appended after the existing display + env args. Order doesn't matter — Flatpak applies them all.
- No cross-module coordination needed — BLE and gamepad modules don't change.
</code_context>

<specifics>
## Specific Ideas

- `in_flatpak()` implementation:
  ```rust
  fn in_flatpak() -> bool {
      std::env::var("FLATPAK_ID").is_ok()
          || std::path::Path::new("/.flatpak-info").exists()
  }
  ```
- Gated D-Bus block should include a comment: `// Inside Flatpak the runtime proxies the system bus via DBUS_SYSTEM_BUS_ADDRESS. Overwriting it would break BLE.`
- Manifest finish-args additions (appended to existing list):
  ```yaml
    - --system-talk-name=org.bluez
    - --system-talk-name=org.bluez.*
    - --allow=bluetooth
    - --share=network
    - --device=input
    # --device=all  # fallback if --device=input not available (Flatpak < 1.15.6)
  ```
- Anti-feature checklist comment in manifest:
  ```yaml
  # === Anti-feature checklist (SBX-06) ===
  # Verify NONE of these are in finish-args:
  #   --filesystem=home          — Unnecessary sandbox escape
  #   --device=bluetooth         — Wrong stack (AF_BLUETOOTH not D-Bus)
  #   --talk-name=org.bluez      — Wrong bus (session, not system)
  #   --socket=session-bus       — Tray icon arg, not needed
  #   --socket=system-bus        — Over-broad; use talk-name instead
  #   org.freedesktop.Flatpak    — Portal grant, not needed
  ```
</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 13 scope.
</deferred>

---

*Phase: 13-Sandbox Permissions for BLE + Gamepad*
*Context gathered: 2026-05-09*
